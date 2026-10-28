// app/api/context/route.ts
// API route to list, add, and delete vector knowledge chunks in PostgreSQL

import prisma from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateEmbedding } from '@/lib/ai/embedding';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let chunks: any[];
    if (category && category !== 'ALL') {
      chunks = await prisma.$queryRaw`
        SELECT id, title, category, content, "createdAt", "updatedAt",
               (embedding IS NOT NULL) AS "hasEmbedding"
        FROM "KnowledgeChunk"
        WHERE category = ${category}
        ORDER BY "createdAt" DESC;
      `;
    } else {
      chunks = await prisma.$queryRaw`
        SELECT id, title, category, content, "createdAt", "updatedAt",
               (embedding IS NOT NULL) AS "hasEmbedding"
        FROM "KnowledgeChunk"
        ORDER BY "createdAt" DESC;
      `;
    }

    return NextResponse.json({ chunks });
  } catch (error: any) {
    console.error('Failed to fetch knowledge chunks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { keyword, title: reqTitle, category: reqCategory, content } = body;
    const title = reqTitle || keyword;
    const category = reqCategory || 'general';

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (typeof title !== 'string' || typeof content !== 'string' || title.length > 200 || content.length > 10000) {
      return NextResponse.json({ error: 'Invalid input or length limits exceeded' }, { status: 400 });
    }

    // 1. Generate 768-dimension vector embedding via Gemini text-embedding-004
    let vectorString = null;
    try {
      const textToEmbed = `${title}: ${content}`;
      const embedding = await generateEmbedding(textToEmbed);
      vectorString = `[${embedding.join(',')}]`;
    } catch (embErr) {
      console.warn('Embedding generation warning:', embErr);
    }

    const chunkId = crypto.randomUUID();

    // 2. Insert into KnowledgeChunk with vector
    if (vectorString) {
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" ("id", "title", "category", "content", "embedding", "createdAt", "updatedAt")
        VALUES (${chunkId}, ${title}, ${category}, ${content}, ${vectorString}::vector, NOW(), NOW());
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" ("id", "title", "category", "content", "createdAt", "updatedAt")
        VALUES (${chunkId}, ${title}, ${category}, ${content}, NOW(), NOW());
      `;
    }

    // 3. Backward compatibility with ProjectContext
    try {
      await prisma.projectContext.create({
        data: {
          keyword: title,
          content,
        },
      });
    } catch (e) {
      // Ignore unique keyword collisions in legacy table
    }

    return NextResponse.json({ success: true, id: chunkId }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to create context:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chunk ID is required' }, { status: 400 });
    }

    await prisma.$executeRaw`
      DELETE FROM "KnowledgeChunk" WHERE id = ${id};
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete knowledge chunk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
