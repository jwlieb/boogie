import { z } from 'zod';

export const trackSchema = z.object({
  track_id: z.string(),
  track_name: z.string(),
  artist_name: z.string(),
  album_name: z.string(),
});

export type Track = z.infer<typeof trackSchema>;