import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import { parse as parseSync } from 'csv-parse/sync';
import { Track } from '@boogie/shared/schemas/track';

import { createVectorStoreClient } from '@boogie/vectorstore/qdrant';
import { generateEmbeddings } from '@boogie/embeddings';

const seed = async () => {
  console.log('Starting the seeding process...');

  const filePath = join(__dirname, '../data/tracks.csv');
  const fileContent = readFileSync(filePath, 'utf-8');
  
  // Use the sync parser and explicitly type the result as an array of Track
  const records = parseSync(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as Track[];
  
  console.log(`Parsed ${records.length} records from the CSV.`);
  
  const client = createVectorStoreClient();
  console.log('Qdrant client created.');

  for (const record of records) {
    console.log(`Processing track: ${record.title}`);
    // await generateEmbeddings(record.track_name);
  }

  console.log('Seeding process complete.');
};

seed().catch(err => {
  console.error('Seeding failed:', err);
});