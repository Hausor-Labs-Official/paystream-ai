import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Embedding cache to reduce API calls
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Gemini Embedding Client
 * Generates vector embeddings for text using Gemini API
 */
class EmbeddingClient {
  private static instance: EmbeddingClient;
  private genAI: GoogleGenerativeAI;
  private model: any;

  private constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Using text-embedding-004 model for 768-dimensional embeddings
    this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  public static getInstance(): EmbeddingClient {
    if (!EmbeddingClient.instance) {
      EmbeddingClient.instance = new EmbeddingClient();
    }
    return EmbeddingClient.instance;
  }

  /**
   * Generate embedding for a single text
   */
  public async generateEmbedding(
    text: string,
    options: { useCache?: boolean } = {}
  ): Promise<number[]> {
    const { useCache = true } = options;

    // Check cache first
    if (useCache && embeddingCache.has(text)) {
      console.log('[Embeddings] Cache hit for text:', text.substring(0, 50));
      return embeddingCache.get(text)!;
    }

    try {
      const result = await this.model.embedContent(text);
      const embedding = result.embedding.values;

      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding returned from Gemini');
      }

      // Cache the result
      if (useCache) {
        embeddingCache.set(text, embedding);
      }

      console.log(`[Embeddings] Generated embedding: ${embedding.length} dimensions`);
      return embedding;
    } catch (error) {
      console.error('[Embeddings] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  public async generateBatchEmbeddings(
    texts: string[],
    options: { useCache?: boolean } = {}
  ): Promise<number[][]> {
    const { useCache = true } = options;

    console.log(`[Embeddings] Generating ${texts.length} embeddings...`);

    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text, { useCache });
      embeddings.push(embedding);

      // Small delay to avoid rate limiting
      if (texts.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[Embeddings] ✓ Generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  /**
   * Clear embedding cache
   */
  public clearCache(): void {
    embeddingCache.clear();
    console.log('[Embeddings] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      size: embeddingCache.size,
      keys: Array.from(embeddingCache.keys()).map((k) => k.substring(0, 50)),
    };
  }
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(
  text: string,
  options?: { useCache?: boolean }
): Promise<number[]> {
  const client = EmbeddingClient.getInstance();
  return client.generateEmbedding(text, options);
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateBatchEmbeddings(
  texts: string[],
  options?: { useCache?: boolean }
): Promise<number[][]> {
  const client = EmbeddingClient.getInstance();
  return client.generateBatchEmbeddings(texts, options);
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  const client = EmbeddingClient.getInstance();
  client.clearCache();
}

/**
 * Get embedding cache statistics
 */
export function getEmbeddingCacheStats() {
  const client = EmbeddingClient.getInstance();
  return client.getCacheStats();
}

export default EmbeddingClient;
