'use client';

import { useState, useEffect } from 'react';
import { Track } from '@boogie/shared/schemas/track';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  tags: string;
  url: string;
  preview_url: string;
  bpm?: string;
  has_vocals: boolean;
  score: number;
}

interface SearchResponse {
  tracks: SearchResult[];
  latency_ms: number;
  backend: string;
}

const EXAMPLE_QUERIES = [
  'coding session instrumentals',
  'fast freestyle beats',
  'funny songs about cats',
  'chill lofi study music',
  'energetic workout music',
];

export default function Page() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  // Debounce query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      setLatency(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: debouncedQuery, k: 20 }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data: SearchResponse = await response.json();
        setResults(data.tracks);
        setLatency(data.latency_ms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Boogie</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Semantic music search - describe what you want to hear
        </p>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., coding session instrumentals, fast freestyle beats..."
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#0070f3')}
          onBlur={(e) => (e.target.style.borderColor = '#ddd')}
        />
        {loading && (
          <div style={{ marginTop: '0.5rem', color: '#666' }}>Searching...</div>
        )}
        {latency !== null && !loading && (
          <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
            Found {results.length} results in {latency.toFixed(1)}ms
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {!query.trim() && !loading && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Try these examples:</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Results:</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {results.map((track) => (
              <div
                key={track.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, marginBottom: '0.25rem' }}>
                    {track.title}
                  </h3>
                  <p style={{ color: '#666', margin: 0, marginBottom: '0.5rem' }}>
                    {track.artist}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {track.tags.split('|').map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {track.bpm && (
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>
                      BPM: {track.bpm} • {track.has_vocals ? 'Vocals' : 'Instrumental'}
                    </span>
                  )}
                </div>
                {track.preview_url && (
                  <audio
                    controls
                    src={track.preview_url}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#999' }}>
                  Similarity: {(track.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}