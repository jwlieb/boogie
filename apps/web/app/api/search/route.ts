import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateEmbeddings } from '@boogie/embeddings';
import { createBoogieVecClient } from '@boogie/vectorstore/boogie-vec';
import { Track } from '@boogie/shared/schemas/track';

const BOOGIE_VEC_URL = process.env.BOOGIE_VEC_URL || 'http://127.0.0.1:8080';
const DEFAULT_K = 20;

// In-memory cache for track metadata
let tracksCache: Record<string, Track> | null = null;

function loadTracksMetadata(): Record<string, Track> {
  if (tracksCache) {
    return tracksCache;
  }

  try {
    // In Next.js, we need to resolve from the project root
    const tracksPath = join(process.cwd(), 'data', 'tracks.json');
    const tracksJson = readFileSync(tracksPath, 'utf-8');
    tracksCache = JSON.parse(tracksJson) as Record<string, Track>;
    return tracksCache;
  } catch (error) {
    console.error('Failed to load tracks.json:', error);
    throw new Error('Track metadata not available. Please run the seed script first.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, k = DEFAULT_K } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (k <= 0 || k > 100) {
      return NextResponse.json(
        { error: 'k must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    let queryVector: number[];
    try {
      queryVector = await generateEmbeddings(query.trim());
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return NextResponse.json(
        { error: 'Failed to generate embedding for query' },
        { status: 500 }
      );
    }

    // Query boogie-vec backend
    const client = createBoogieVecClient(BOOGIE_VEC_URL);
    let queryResponse;
    try {
      queryResponse = await client.query(queryVector, k);
    } catch (error) {
      console.error('Failed to query boogie-vec:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('NO_INDEX')) {
        return NextResponse.json(
          { error: 'Vector index not loaded. Please run the seed script first.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to query vector database' },
        { status: 500 }
      );
    }

    // Load track metadata and map IDs to full track objects
    const tracksMetadata = loadTracksMetadata();
    const tracks = queryResponse.neighbors
      .map(neighbor => {
        const track = tracksMetadata[neighbor.id];
        if (!track) {
          console.warn(`Track metadata not found for ID: ${neighbor.id}`);
          return null;
        }
        return {
          ...track,
          score: neighbor.score,
        };
      })
      .filter((track): track is Track & { score: number } => track !== null);

    return NextResponse.json({
      tracks,
      latency_ms: queryResponse.latency_ms,
      backend: queryResponse.backend,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

