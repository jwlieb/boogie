const BOOGIE_VEC_URL = process.env.BOOGIE_VEC_URL || 'http://127.0.0.1:8080';

export interface Neighbor {
  id: string;
  score: number;
}

export interface QueryResponse {
  neighbors: Neighbor[];
  latency_ms: number;
  backend: string;
}

export interface LoadResponse {
  ok: boolean;
  loaded: {
    count: number;
    dim: number;
    backend: string;
  };
}

export interface StatsResponse {
  status: 'ready' | 'empty';
  count: number;
  dim: number;
  backend: string;
  metric: string;
  snapshot_version: string;
  uptime_sec: number;
  qps_1m: number;
  latency_ms: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface BoogieVecClient {
  loadIndex(
    path: string,
    dim: number,
    idsPath?: string,
    backend?: 'bruteforce' | 'annoy',
    metric?: 'cosine' | 'l2',
    nTrees?: number
  ): Promise<LoadResponse>;
  query(vector: number[], k: number): Promise<QueryResponse>;
  getStats(): Promise<StatsResponse>;
  healthCheck(): Promise<string>;
}

class BoogieVecClientImpl implements BoogieVecClient {
  private baseUrl: string;

  constructor(baseUrl: string = BOOGIE_VEC_URL) {
    this.baseUrl = baseUrl;
  }

  async loadIndex(
    path: string,
    dim: number,
    idsPath?: string,
    backend: 'bruteforce' | 'annoy' = 'bruteforce',
    metric: 'cosine' | 'l2' = 'cosine',
    nTrees: number = 50
  ): Promise<LoadResponse> {
    const body: any = {
      path,
      dim,
      metric,
      backend,
    };

    if (idsPath) {
      body.ids_path = idsPath;
    }

    if (backend === 'annoy') {
      body.n_trees = nTrees;
    }

    const response = await fetch(`${this.baseUrl}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(`Failed to load index: ${error.error.message}`);
    }

    return await response.json();
  }

  async query(vector: number[], k: number): Promise<QueryResponse> {
    if (k <= 0) {
      throw new Error('k must be greater than 0');
    }

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        k,
        vector,
      }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(`Query failed: ${error.error.message}`);
    }

    return await response.json();
  }

  async getStats(): Promise<StatsResponse> {
    const response = await fetch(`${this.baseUrl}/stats`);

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(`Failed to get stats: ${error.error.message}`);
    }

    return await response.json();
  }

  async healthCheck(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/healthz`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.text();
  }
}

/**
 * Creates a new boogie-vec client instance.
 */
export function createBoogieVecClient(baseUrl?: string): BoogieVecClient {
  return new BoogieVecClientImpl(baseUrl);
}

