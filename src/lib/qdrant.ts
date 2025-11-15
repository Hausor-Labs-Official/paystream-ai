import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Qdrant Collection Names
 */
export const COLLECTIONS = {
  EMPLOYEES_KNOWLEDGE: 'employees_knowledge',
  CONVERSATIONS_MEMORY: 'conversations_memory',
  PAYROLL_DOCUMENTS: 'payroll_documents',
  TRANSACTION_PATTERNS: 'transaction_patterns',
} as const;

/**
 * Vector dimension for Gemini embeddings
 * Using text-embedding-004 model
 */
export const VECTOR_DIMENSION = 768;

/**
 * Qdrant Client Singleton
 * Manages connection to Qdrant vector database
 */
class QdrantClientSingleton {
  private static instance: QdrantClient;

  private constructor() {}

  public static getInstance(): QdrantClient {
    if (!QdrantClientSingleton.instance) {
      const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      const qdrantApiKey = process.env.QDRANT_API_KEY;

      console.log(`[Qdrant] Connecting to: ${qdrantUrl}`);

      QdrantClientSingleton.instance = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey || undefined,
      });
    }

    return QdrantClientSingleton.instance;
  }
}

/**
 * Get Qdrant client instance
 */
export function getQdrantClient(): QdrantClient {
  return QdrantClientSingleton.getInstance();
}

/**
 * Initialize Qdrant collections
 * Creates all required collections if they don't exist
 */
export async function initializeCollections(): Promise<void> {
  const client = getQdrantClient();

  try {
    // Get existing collections
    const { collections } = await client.getCollections();
    const existingCollectionNames = collections.map((c) => c.name);

    console.log('[Qdrant] Existing collections:', existingCollectionNames);

    // Create missing collections
    for (const [key, collectionName] of Object.entries(COLLECTIONS)) {
      if (!existingCollectionNames.includes(collectionName)) {
        console.log(`[Qdrant] Creating collection: ${collectionName}`);

        await client.createCollection(collectionName, {
          vectors: {
            size: VECTOR_DIMENSION,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        console.log(`[Qdrant] ✓ Collection created: ${collectionName}`);
      } else {
        console.log(`[Qdrant] ✓ Collection exists: ${collectionName}`);
      }
    }

    console.log('[Qdrant] All collections initialized');
  } catch (error) {
    console.error('[Qdrant] Error initializing collections:', error);
    throw new Error(`Failed to initialize Qdrant collections: ${(error as Error).message}`);
  }
}

/**
 * Check if Qdrant is connected and healthy
 */
export async function checkQdrantHealth(): Promise<boolean> {
  try {
    const client = getQdrantClient();
    await client.getCollections();
    return true;
  } catch (error) {
    console.error('[Qdrant] Health check failed:', error);
    return false;
  }
}

/**
 * Delete a collection (use with caution!)
 */
export async function deleteCollection(collectionName: string): Promise<void> {
  const client = getQdrantClient();

  try {
    await client.deleteCollection(collectionName);
    console.log(`[Qdrant] Collection deleted: ${collectionName}`);
  } catch (error) {
    console.error(`[Qdrant] Error deleting collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get collection info
 */
export async function getCollectionInfo(collectionName: string) {
  const client = getQdrantClient();

  try {
    const info = await client.getCollection(collectionName);
    return info;
  } catch (error) {
    console.error(`[Qdrant] Error getting collection info for ${collectionName}:`, error);
    throw error;
  }
}

export default QdrantClientSingleton;
