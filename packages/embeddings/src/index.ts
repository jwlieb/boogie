import OpenAI from 'openai';

const EMBEDDINGS_PROVIDER = (process.env.EMBEDDINGS_PROVIDER || 'openai').toLowerCase();
const VECTOR_DIM = parseInt(process.env.VECTOR_DIM || '384', 10);

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Normalizes a vector to unit length for cosine similarity.
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Generates embeddings for the given text using the configured provider.
 * Returns a normalized vector matching the expected dimension (default 384).
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (EMBEDDINGS_PROVIDER === 'openai') {
    return generateOpenAIEmbeddings(text);
  }
  
  throw new Error(`Unsupported embeddings provider: ${EMBEDDINGS_PROVIDER}. Supported: openai`);
}

/**
 * Generates embeddings using OpenAI's API.
 * Uses text-embedding-3-large with dimension reduction to match target dimension.
 */
async function generateOpenAIEmbeddings(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  try {
    // Use text-embedding-3-large which supports dimensions from 256 to 3072
    // Request the target dimension (384) directly
    const response = await client.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: VECTOR_DIM,
    });
    
    const embedding = response.data[0].embedding;
    
    // Normalize for cosine similarity
    return normalizeVector(embedding);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
    throw error;
  }
}