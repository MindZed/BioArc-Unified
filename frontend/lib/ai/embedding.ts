// lib/ai/embedding.ts
// Robust 768-dimensional vector embedding generator using Gemini embedding API

/**
 * Generates a 768-dimensional float embedding array using Google's gemini-embedding-001 model
 * with outputDimensionality configured to 768 to match the PostgreSQL vector(768) column.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n+/g, ' ').trim();
  if (!cleanText) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Generative AI API key is not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{ text: cleanText }]
        },
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini Embedding API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Invalid embedding vector returned (expected 768, got ${values?.length})`);
  }

  return values;
}

/**
 * Batched embeddings for document ingestion.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const cleanTexts = texts.map(t => t.replace(/\n+/g, ' ').trim()).filter(Boolean);
  if (cleanTexts.length === 0) return [];

  const results: number[][] = [];
  for (const text of cleanTexts) {
    const emb = await generateEmbedding(text);
    results.push(emb);
  }
  return results;
}
