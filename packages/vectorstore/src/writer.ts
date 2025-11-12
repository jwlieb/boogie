import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Writes vectors and IDs to files matching boogie-vec snapshot format.
 * 
 * @param vectors - Array of vectors, each vector is an array of numbers
 * @param ids - Array of string IDs corresponding to each vector
 * @param outputDir - Directory to write vectors.bin and ids.json
 */
export function writeVectorIndex(
  vectors: number[][],
  ids: string[],
  outputDir: string
): void {
  if (vectors.length !== ids.length) {
    throw new Error(`Vector count (${vectors.length}) does not match ID count (${ids.length})`);
  }

  if (vectors.length === 0) {
    throw new Error('Cannot write empty vector index');
  }

  const firstVector = vectors[0];
  if (!firstVector) {
    throw new Error('Cannot write empty vector index');
  }

  const dim = firstVector.length;
  const count = vectors.length;

  // Validate all vectors have the same dimension
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    if (!vector) {
      throw new Error(`Vector at index ${i} is undefined`);
    }
    if (vector.length !== dim) {
      throw new Error(`Vector at index ${i} has dimension ${vector.length}, expected ${dim}`);
    }
  }

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  // Write vectors.bin
  const vectorsPath = join(outputDir, 'vectors.bin');
  writeVectorsBinary(vectors, dim, count, vectorsPath);

  // Write ids.json
  const idsPath = join(outputDir, 'ids.json');
  writeFileSync(idsPath, JSON.stringify(ids, null, 2), 'utf-8');

  console.log(`Wrote ${count} vectors (dim=${dim}) to ${vectorsPath}`);
  console.log(`Wrote ${ids.length} IDs to ${idsPath}`);
}

/**
 * Writes vectors to binary file in boogie-vec format.
 * Format: little-endian, header (dim: uint32, count: uint32), then float32 data row-major.
 */
function writeVectorsBinary(
  vectors: number[][],
  dim: number,
  count: number,
  filePath: string
): void {
  // Create buffer: 4 bytes (dim) + 4 bytes (count) + count * dim * 4 bytes (float32 data)
  const bufferSize = 4 + 4 + count * dim * 4;
  const buffer = Buffer.allocUnsafe(bufferSize);
  
  let offset = 0;

  // Write header: dim (uint32, little-endian)
  buffer.writeUInt32LE(dim, offset);
  offset += 4;

  // Write header: count (uint32, little-endian)
  buffer.writeUInt32LE(count, offset);
  offset += 4;

  // Write data: float32 array, row-major (v0[0..dim-1], v1[0..dim-1], ...)
  for (const vector of vectors) {
    for (const value of vector) {
      buffer.writeFloatLE(value, offset);
      offset += 4;
    }
  }

  writeFileSync(filePath, buffer);
}

