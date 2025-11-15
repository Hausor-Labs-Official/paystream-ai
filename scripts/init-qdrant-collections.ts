import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function initializeQdrantCollections() {
  console.log('🚀 Initializing Qdrant Collections for PayStream AI...\n');

  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url || !apiKey) {
    console.error('❌ QDRANT_URL or QDRANT_API_KEY not found in environment');
    process.exit(1);
  }

  const client = new QdrantClient({ url, apiKey });

  try {
    // Collection 1: Employee Vector Search
    console.log('📊 Creating "employees_vector" collection...');
    try {
      await client.getCollection('employees_vector');
      console.log('✅ Collection already exists\n');
    } catch {
      await client.createCollection('employees_vector', {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small dimension
          distance: 'Cosine',
        },
      });
      console.log('✅ Created "employees_vector" collection\n');
    }

    // Collection 2: Conversation Memory
    console.log('💬 Creating "conversations_memory" collection...');
    try {
      await client.getCollection('conversations_memory');
      console.log('✅ Collection already exists\n');
    } catch {
      await client.createCollection('conversations_memory', {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small dimension
          distance: 'Cosine',
        },
      });
      console.log('✅ Created "conversations_memory" collection\n');
    }

    // Verify collections
    console.log('🔍 Verifying collections...');
    const collections = await client.getCollections();
    console.log('✅ All collections ready:');
    collections.collections.forEach(c => {
      console.log(`   - ${c.name}`);
    });

    console.log('\n✨ Qdrant initialization complete!');
    console.log('🎉 Semantic search and conversation memory are ready to use!\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

initializeQdrantCollections();
