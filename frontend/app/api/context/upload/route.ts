// app/api/context/upload/route.ts
// Zero-storage in-memory document parsing (PDF, TXT, MD) and vector embedding

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateEmbedding } from '@/lib/ai/embedding';
import { chunkText } from '@/lib/ai/chunking';
import { extractText } from 'unpdf';
import crypto from 'crypto';

export const maxDuration = 60; // Allow extended processing for multi-page papers

interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export async function POST(req: Request) {
  try {
    // 1. Admin authentication check
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse multi-part form data in memory
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const reqCategory = (formData.get('category') as string) || 'general';
    const customTitle = (formData.get('title') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enforce 20MB file limit
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum 20MB limit' }, { status: 400 });
    }

    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    const baseTitle = customTitle.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    let extractedPages: ExtractedPage[] = [];

    // 3. In-memory text extraction (No file saved to disk)
    if (fileExt === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      try {
        const { totalPages, text } = await extractText(uint8, { mergePages: false });
        const pagesArray = Array.isArray(text) ? text : [text];

        extractedPages = pagesArray
          .map((pageContent, idx) => ({
            pageNumber: idx + 1,
            text: (typeof pageContent === 'string' ? pageContent : '').trim(),
          }))
          .filter(p => p.text.length > 30); // Skip blank/empty pages
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        return NextResponse.json({ error: `Failed to parse PDF document: ${pdfErr.message}` }, { status: 400 });
      }
    } else if (['txt', 'md', 'markdown', 'json', 'csv', 'log'].includes(fileExt)) {
      const rawText = await file.text();
      extractedPages = [{ pageNumber: 1, text: rawText.trim() }];
    } else {
      return NextResponse.json({ 
        error: `Unsupported file type ".${fileExt}". Please upload a PDF, TXT, or MD document.` 
      }, { status: 400 });
    }

    if (extractedPages.length === 0) {
      return NextResponse.json({ error: 'Document contains no extractable text' }, { status: 400 });
    }

    // 4. Chunk each page or section with overlap
    interface PreparedChunk {
      title: string;
      content: string;
      category: string;
    }

    const preparedChunks: PreparedChunk[] = [];
    const totalPages = extractedPages.length;

    for (const page of extractedPages) {
      const chunks = chunkText(page.text, { maxChunkSize: 850, overlap: 140 });

      chunks.forEach((chunkContent, cIdx) => {
        let chunkTitle = baseTitle;
        if (totalPages > 1) {
          chunkTitle += ` (p. ${page.pageNumber}/${totalPages}${chunks.length > 1 ? ` pt. ${cIdx + 1}` : ''})`;
        } else if (chunks.length > 1) {
          chunkTitle += ` (pt. ${cIdx + 1}/${chunks.length})`;
        }

        preparedChunks.push({
          title: chunkTitle,
          content: chunkContent,
          category: reqCategory,
        });
      });
    }

    if (preparedChunks.length === 0) {
      return NextResponse.json({ error: 'Could not generate valid chunks from document text' }, { status: 400 });
    }

    console.log(`[DOC INGEST] Processing ${preparedChunks.length} chunks from "${fileName}" (Category: ${reqCategory})...`);

    // 5. Generate 768-dim embeddings and store in PostgreSQL KnowledgeChunk
    let storedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < preparedChunks.length; i++) {
      const chunk = preparedChunks[i];
      const chunkId = crypto.randomUUID();

      let vectorString: string | null = null;
      try {
        const textToEmbed = `${chunk.title}: ${chunk.content}`;
        const embedding = await generateEmbedding(textToEmbed);
        vectorString = `[${embedding.join(',')}]`;
      } catch (embErr: any) {
        console.warn(`[DOC INGEST] Embedding warning on chunk ${i + 1}:`, embErr.message);
        errors.push(`Chunk ${i + 1}: ${embErr.message}`);
      }

      try {
        if (vectorString) {
          await prisma.$executeRaw`
            INSERT INTO "KnowledgeChunk" ("id", "title", "category", "content", "embedding", "createdAt", "updatedAt")
            VALUES (${chunkId}, ${chunk.title}, ${chunk.category}, ${chunk.content}, ${vectorString}::vector, NOW(), NOW());
          `;
        } else {
          await prisma.$executeRaw`
            INSERT INTO "KnowledgeChunk" ("id", "title", "category", "content", "createdAt", "updatedAt")
            VALUES (${chunkId}, ${chunk.title}, ${chunk.category}, ${chunk.content}, NOW(), NOW());
          `;
        }
        storedCount++;
      } catch (dbErr: any) {
        console.error(`[DOC INGEST] DB insert error on chunk ${i + 1}:`, dbErr.message);
        errors.push(`DB Error chunk ${i + 1}: ${dbErr.message}`);
      }

      // Small throttling delay to avoid API rate limits when processing large papers
      if (i < preparedChunks.length - 1 && (i + 1) % 5 === 0) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`[DOC INGEST] Successfully stored ${storedCount}/${preparedChunks.length} chunks for "${fileName}".`);

    return NextResponse.json({
      success: true,
      fileName,
      title: baseTitle,
      category: reqCategory,
      totalPages,
      totalChunks: preparedChunks.length,
      storedChunks: storedCount,
      warnings: errors.length > 0 ? errors.slice(0, 3) : undefined,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DOC INGEST] Unexpected error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal server error processing document' 
    }, { status: 500 });
  }
}
