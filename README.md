# Boogie - Mini Semantic Music Search (MVP)


## What it is (problem → solution)
Have you ever searched a music streaming service for a very specific vibe or situation, and actually found a good playlist created by somebody who wasn't griefing?

That's the feeling I aim to provide here: programmatically serving up the songs you describe in your own words. “coding session instrumentals”, “fast freestyle beats”, “funny songs about cats” is clunky with keyword-only search. This project is a tiny, legal-to-host demo that turns natural-language queries into tracks that *feel* right, with instant previews.


**Goal:** type what you want to hear → get 10–20 plausible tracks in <500 ms p95 after warm-up.


## Who it’s for
- **Users:** students/creators who need quick background music or examples by mood/activity.
- **Reviewers:** a clean, end-to-end semantic search system (data → index → retrieval → re-rank → UI) that’s easy to run and extend.


## MVP scope (2–3 days)
- **Dataset:** 200–1,000 **Creative Commons** tracks (metadata only: title, artist, tags, preview_url, bpm?, has_vocals?).
- **Query → results:** embed query + ANN similarity → light heuristic re-rank (instrumental/tempo/keywords).
- **UI:** single search box, result cards with preview & link; empty-state examples.
- **Rebuild:** one command to re-embed and reseed the index from `data/tracks.csv`.


## Non-goals (for v1)
- Personalization, playlists, auth, or accounts.
- Hosting/serving full copyrighted audio.
- Heavy ML training/fine-tuning (we’ll use hosted embeddings and simple heuristics first).


## Architecture (Oct-2025)
- **Frontend & API:** Next.js 15.x (App Router) with API routes (serverless on Vercel), Node **≥22**.
- **Embeddings (provider toggle):** `EMBEDDINGS_PROVIDER=openai|voyage|cohere|google` (default OpenAI).
- **Vector Backend:** boogie-vec Rust server (bruteforce/annoy, cosine similarity).
- **Shared code:** Zod schemas + query parsing + scoring utils shared between API and scripts.
- **Scripts:** `seed.ts` reads CSV → builds text → embeds → writes vectors.bin/ids.json → loads into boogie-vec backend.


## Data & licensing
- Only store/link **metadata** + **short previews** (or remote preview URLs).
- Use CC-licensed sources (e.g., FMA/Jamendo) or your own recordings.
- Include attributions if required; add a takedown contact in README.


## Success metrics (baseline)
- **Retrieval:** Recall@10 ≥ 0.6 on a 20-query eval set; MRR ≥ 0.35.
- **Latency:** p95 < 500 ms (warm) for `/api/search` with k=20, small dataset.
- **UX:** empty-state suggestions; preview works on desktop & mobile.


## Roadmap (post-MVP)
- Add pgvector adapter + provider A/B switch.
- Simple audio tags enrichment (detect vocals/tempo if missing).
- Better re-ranking (keyword weights by intent; genre boosts).
- Tiny evaluation script + CI job printing metrics on PRs.
- Stretch: audio-to-audio search (CLAP-like) or “expand to playlist”.


## How to run (short)

### Prerequisites
1. Start the boogie-vec backend server (see boogie-vec repository for instructions)
2. Ensure the backend is running on `http://127.0.0.1:8080` (or configure `BOOGIE_VEC_URL`)

### Setup
```bash
# Install dependencies
pnpm i

# Copy environment file and fill in your API keys
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Seed the vector index (generates vectors.bin, ids.json, and tracks.json)
pnpm seed

# Start the Next.js dev server
pnpm dev
# Open http://localhost:3000
```

### Environment Variables
See `.env.example` for all available configuration options:
- `EMBEDDINGS_PROVIDER`: Embedding provider (default: `openai`)
- `OPENAI_API_KEY`: Your OpenAI API key (required for OpenAI provider)
- `VECTOR_DIM`: Vector dimension (default: `384`)
- `BOOGIE_VEC_URL`: boogie-vec backend URL (default: `http://127.0.0.1:8080`)
- `AUTO_LOAD_INDEX`: Auto-load index after seeding (default: `true`)