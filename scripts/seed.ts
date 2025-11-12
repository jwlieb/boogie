import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { parse as parseSync } from 'csv-parse/sync';
import { trackSchema, buildSearchableText, Track } from '@boogie/shared/schemas/track';
import { generateEmbeddings } from '@boogie/embeddings';
import { writeVectorIndex } from '@boogie/vectorstore/writer';
import { createBoogieVecClient } from '@boogie/vectorstore/boogie-vec';

const VECTOR_DIM = parseInt(process.env.VECTOR_DIM || '384', 10);
const BOOGIE_VEC_URL = process.env.BOOGIE_VEC_URL || 'http://127.0.0.1:8080';
const AUTO_LOAD = process.env.AUTO_LOAD_INDEX !== 'false'; // Default to true

const seed = async () => {
  console.log('Starting the seeding process...');

  const filePath = join(__dirname, '../data/tracks.csv');
  const fileContent = readFileSync(filePath, 'utf-8');
  
  // Parse CSV and validate with schema
  const rawRecords = parseSync(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const records: Track[] = [];
  for (const rawRecord of rawRecords) {
    try {
      const track = trackSchema.parse(rawRecord);
      records.push(track);
    } catch (error) {
      console.warn(`Skipping invalid record: ${JSON.stringify(rawRecord)}`, error);
    }
  }
  
  console.log(`Parsed ${records.length} valid records from the CSV.`);

  if (records.length === 0) {
    throw new Error('No valid tracks found in CSV');
  }

  // Generate embeddings for each track
  const vectors: number[][] = [];
  const ids: string[] = [];

  console.log('Generating embeddings...');
  for (let i = 0; i < records.length; i++) {
    const track = records[i];
    const searchableText = buildSearchableText(track);
    
    try {
      console.log(`[${i + 1}/${records.length}] Processing: ${track.title} by ${track.artist}`);
      const embedding = await generateEmbeddings(searchableText);
      
      if (embedding.length !== VECTOR_DIM) {
        throw new Error(`Expected embedding dimension ${VECTOR_DIM}, got ${embedding.length}`);
      }
      
      vectors.push(embedding);
      ids.push(track.id);
    } catch (error) {
      console.error(`Failed to generate embedding for track ${track.id}:`, error);
      throw error;
    }
  }

  console.log(`Generated ${vectors.length} embeddings.`);

  // Write vectors.bin and ids.json
  const outputDir = join(__dirname, '../data');
  console.log(`Writing vector index to ${outputDir}...`);
  writeVectorIndex(vectors, ids, outputDir);

  // Create tracks.json for fast metadata lookup
  const tracksMap: Record<string, Track> = {};
  for (const track of records) {
    tracksMap[track.id] = track;
  }
  const tracksJsonPath = join(outputDir, 'tracks.json');
  writeFileSync(tracksJsonPath, JSON.stringify(tracksMap, null, 2), 'utf-8');
  console.log(`Wrote ${Object.keys(tracksMap).length} track metadata entries to ${tracksJsonPath}`);

  // Optionally load index into boogie-vec backend
  if (AUTO_LOAD) {
    try {
      console.log(`Loading index into boogie-vec backend at ${BOOGIE_VEC_URL}...`);
      const client = createBoogieVecClient(BOOGIE_VEC_URL);
      
      // Check if backend is healthy
      await client.healthCheck();
      console.log('Backend health check passed.');

      const vectorsPath = join(outputDir, 'vectors.bin');
      const idsPath = join(outputDir, 'ids.json');
      
      const loadResponse = await client.loadIndex(
        vectorsPath,
        VECTOR_DIM,
        idsPath,
        'bruteforce',
        'cosine'
      );
      
      console.log(`Index loaded successfully: ${loadResponse.loaded.count} vectors, dim=${loadResponse.loaded.dim}`);
    } catch (error) {
      console.warn('Failed to load index into boogie-vec backend:', error);
      console.warn('You can manually load it later using the /load endpoint.');
    }
  } else {
    console.log('Skipping auto-load (AUTO_LOAD_INDEX=false).');
  }

  console.log('Seeding process complete.');
};

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});