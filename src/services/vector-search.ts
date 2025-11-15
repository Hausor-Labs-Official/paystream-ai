import { getQdrantClient, COLLECTIONS } from '@/lib/qdrant';
import { generateEmbedding } from '@/lib/embeddings';
import { v4 as uuidv4 } from 'uuid';

/**
 * Search result interface
 */
export interface SearchResult<T = any> {
  id: string;
  score: number;
  payload: T;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, any>;
}

/**
 * Employee search payload
 */
export interface EmployeePayload {
  employeeId: string;
  name: string;
  email: string;
  role?: string;
  skills?: string[];
  department?: string;
  walletAddress?: string;
  text: string; // Combined searchable text
  [key: string]: any; // Index signature for Qdrant compatibility
}

/**
 * Conversation memory payload
 */
export interface ConversationPayload {
  userId: string;
  message: string;
  response: string;
  timestamp: string;
  text: string; // Combined message + response
  [key: string]: any; // Index signature for Qdrant compatibility
}

/**
 * Search employees by semantic query
 */
export async function searchEmployees(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult<EmployeePayload>[]> {
  const { limit = 10, scoreThreshold = 0.7 } = options;

  try {
    console.log(`[VectorSearch] Searching employees: "${query}"`);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search in Qdrant
    const client = getQdrantClient();
    const searchResult = await client.query(COLLECTIONS.EMPLOYEES_KNOWLEDGE, {
      query: queryEmbedding,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    const results: SearchResult<EmployeePayload>[] = searchResult.points.map((point: any) => ({
      id: point.id.toString(),
      score: point.score || 0,
      payload: point.payload as EmployeePayload,
    }));

    console.log(`[VectorSearch] Found ${results.length} employees`);
    return results;
  } catch (error) {
    console.error('[VectorSearch] Error searching employees:', error);
    throw new Error(`Failed to search employees: ${(error as Error).message}`);
  }
}

/**
 * Add or update employee in vector database
 */
export async function upsertEmployee(employee: EmployeePayload): Promise<void> {
  try {
    console.log(`[VectorSearch] Upserting employee: ${employee.name}`);

    // Generate embedding from combined text
    const embedding = await generateEmbedding(employee.text);

    // Upsert to Qdrant
    const client = getQdrantClient();
    await client.upsert(COLLECTIONS.EMPLOYEES_KNOWLEDGE, {
      wait: true,
      points: [
        {
          id: employee.employeeId || uuidv4(),
          vector: embedding,
          payload: employee,
        },
      ],
    });

    console.log(`[VectorSearch] ✓ Employee upserted: ${employee.name}`);
  } catch (error) {
    console.error('[VectorSearch] Error upserting employee:', error);
    throw new Error(`Failed to upsert employee: ${(error as Error).message}`);
  }
}

/**
 * Add multiple employees in batch
 */
export async function upsertEmployeesBatch(employees: EmployeePayload[]): Promise<void> {
  try {
    console.log(`[VectorSearch] Batch upserting ${employees.length} employees...`);

    const client = getQdrantClient();

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < employees.length; i += batchSize) {
      const batch = employees.slice(i, i + batchSize);

      // Generate embeddings for batch
      const texts = batch.map((emp) => emp.text);
      const embeddings = await Promise.all(texts.map((text) => generateEmbedding(text)));

      // Prepare points
      const points = batch.map((emp, index) => ({
        id: emp.employeeId || uuidv4(),
        vector: embeddings[index],
        payload: emp,
      }));

      // Upsert batch
      await client.upsert(COLLECTIONS.EMPLOYEES_KNOWLEDGE, {
        wait: true,
        points,
      });

      console.log(`[VectorSearch] Batch ${i / batchSize + 1} upserted`);

      // Small delay between batches
      if (i + batchSize < employees.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`[VectorSearch] ✓ All ${employees.length} employees upserted`);
  } catch (error) {
    console.error('[VectorSearch] Error batch upserting employees:', error);
    throw new Error(`Failed to batch upsert employees: ${(error as Error).message}`);
  }
}

/**
 * Store conversation in memory
 */
export async function storeConversation(
  userId: string,
  message: string,
  response: string
): Promise<void> {
  try {
    console.log(`[VectorSearch] Storing conversation for user: ${userId}`);

    const payload: ConversationPayload = {
      userId,
      message,
      response,
      timestamp: new Date().toISOString(),
      text: `${message} ${response}`,
    };

    // Generate embedding
    const embedding = await generateEmbedding(payload.text);

    // Store in Qdrant
    const client = getQdrantClient();
    await client.upsert(COLLECTIONS.CONVERSATIONS_MEMORY, {
      wait: true,
      points: [
        {
          id: uuidv4(),
          vector: embedding,
          payload,
        },
      ],
    });

    console.log(`[VectorSearch] ✓ Conversation stored`);
  } catch (error) {
    console.error('[VectorSearch] Error storing conversation:', error);
    throw new Error(`Failed to store conversation: ${(error as Error).message}`);
  }
}

/**
 * Retrieve conversation history for context
 */
export async function retrieveConversationContext(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult<ConversationPayload>[]> {
  const { limit = 5, scoreThreshold = 0.6 } = options;

  try {
    console.log(`[VectorSearch] Retrieving context for user: ${userId}`);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search with user filter
    const client = getQdrantClient();
    const searchResult = await client.query(COLLECTIONS.CONVERSATIONS_MEMORY, {
      query: queryEmbedding,
      limit,
      score_threshold: scoreThreshold,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
      with_payload: true,
    });

    const results: SearchResult<ConversationPayload>[] = searchResult.points.map((point: any) => ({
      id: point.id.toString(),
      score: point.score || 0,
      payload: point.payload as ConversationPayload,
    }));

    console.log(`[VectorSearch] Found ${results.length} relevant conversations`);
    return results;
  } catch (error) {
    console.error('[VectorSearch] Error retrieving context:', error);
    throw new Error(`Failed to retrieve conversation context: ${(error as Error).message}`);
  }
}

/**
 * Delete employee from vector database
 */
export async function deleteEmployee(employeeId: string): Promise<void> {
  try {
    const client = getQdrantClient();
    await client.delete(COLLECTIONS.EMPLOYEES_KNOWLEDGE, {
      wait: true,
      points: [employeeId],
    });

    console.log(`[VectorSearch] Employee deleted: ${employeeId}`);
  } catch (error) {
    console.error('[VectorSearch] Error deleting employee:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(collectionName: string) {
  try {
    const client = getQdrantClient();
    const collection = await client.getCollection(collectionName);
    return {
      name: collectionName,
      pointsCount: collection.points_count,
      vectorsCount: collection.vectors_count,
      status: collection.status,
    };
  } catch (error) {
    console.error('[VectorSearch] Error getting stats:', error);
    throw error;
  }
}
