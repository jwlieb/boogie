import { z } from 'zod';

export const trackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  tags: z.string(),
  url: z.string(),
  preview_url: z.string(),
  bpm: z.string().optional(),
  has_vocals: z.string().transform((val) => val === 'true'),
});

export type Track = z.infer<typeof trackSchema>;

/**
 * Builds a searchable text string from track metadata.
 * Combines title, artist, and tags for embedding generation.
 */
export function buildSearchableText(track: Track): string {
  return `${track.title} ${track.artist} ${track.tags}`.trim();
}