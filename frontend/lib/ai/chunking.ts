// lib/ai/chunking.ts
// Intelligent document chunker with overlap for Vector RAG

export interface ChunkOptions {
  maxChunkSize?: number; // Target characters per chunk (default: 800)
  overlap?: number;      // Overlapping characters between sequential chunks (default: 150)
}

/**
 * Splits arbitrary text into semantically cohesive, overlapping chunks
 * prioritizing paragraph breaks, then sentence boundaries, then words.
 */
export function chunkText(rawText: string, options: ChunkOptions = {}): string[] {
  const { maxChunkSize = 800, overlap = 150 } = options;

  if (!rawText || !rawText.trim()) return [];

  // 1. Normalize line endings and collapse excessive whitespace
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length <= maxChunkSize) {
    return [cleaned];
  }

  // 2. Split into initial paragraphs
  const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    // If a single paragraph is larger than maxChunkSize, split it by sentence
    if (para.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentenceChunks = splitLongParagraph(para, maxChunkSize, overlap);
      chunks.push(...sentenceChunks);
      continue;
    }

    // If adding this paragraph fits in maxChunkSize, append it
    if ((currentChunk + '\n\n' + para).trim().length <= maxChunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      // Chunk reached limit: save current chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Start next chunk with overlap from previous chunk if possible
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText ? `${overlapText}\n\n${para}` : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Deduplicate and filter out near-empty chunks
  return chunks.filter(c => c.length >= 40);
}

/**
 * Splits a long paragraph by sentence boundaries with overlap
 */
function splitLongParagraph(paragraph: string, maxChunkSize: number, overlap: number): string[] {
  // Split on period/question/exclamation followed by space or newline
  const sentences = paragraph.split(/(?<=[.?!])\s+/).filter(Boolean);
  const result: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxChunkSize) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current.trim()) {
        result.push(current.trim());
      }
      const overlapText = getOverlapText(current, overlap);
      current = overlapText ? `${overlapText} ${sentence}` : sentence;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Extracts the trailing portion of text to serve as the overlap prefix for the next chunk
 */
function getOverlapText(text: string, overlapLength: number): string {
  if (!text || text.length <= overlapLength) return '';
  const slice = text.slice(-overlapLength).trim();
  // Attempt to align to the start of a word boundary so we don't start mid-word
  const spaceIdx = slice.indexOf(' ');
  return spaceIdx > 0 ? slice.slice(spaceIdx + 1) : slice;
}
