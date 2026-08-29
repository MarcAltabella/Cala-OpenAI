import type { CalaEntity, Company } from '@cala/contracts';

export type CalaQueryResult = { input: string; entities: CalaEntity[]; results: Record<string, unknown>[] };

// Cala knowledge-query client. Healthcare and finance are two query strings
// against POST https://api.cala.ai/v1/knowledge/query.
export interface CalaClient {
  queryHealthcare(company: Company): Promise<CalaQueryResult>;
  queryFinance(company: Company): Promise<CalaQueryResult>;
}

// Query builders. The DSL is generic (`field=value` filters); these are tuned
// against the live API during integration.
export function healthcareQuery(company: Company): string {
  return `companies.name=${company.name}`;
}
export function financeQuery(company: Company): string {
  const scope = company.ticker ? `companies.ticker=${company.ticker}` : `companies.name=${company.name}`;
  return `${scope}.funding`;
}

type FetchImpl = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type HttpCalaClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
};

function parseResult(input: string, payload: unknown): CalaQueryResult {
  const body = (payload ?? {}) as { entities?: unknown; results?: unknown };
  const entities = Array.isArray(body.entities)
    ? (body.entities as Record<string, unknown>[]).map((e) => ({
        id: String(e.id ?? ''),
        entityType: String(e.entity_type ?? e.entityType ?? ''),
        name: String(e.name ?? ''),
        mentions: Array.isArray(e.mentions) ? (e.mentions as unknown[]).map(String) : [],
      }))
    : [];
  const results = Array.isArray(body.results) ? (body.results as Record<string, unknown>[]) : [];
  return { input, entities, results };
}

export class HttpCalaClient implements CalaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchImpl;
  private readonly timeoutMs: number;
  constructor(options: HttpCalaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.CALA_BASE_URL ?? 'https://api.cala.ai/v1';
    this.apiKey = options.apiKey ?? process.env.CALA_API_KEY ?? '';
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }
  private async query(input: string): Promise<CalaQueryResult> {
    if (!this.apiKey) throw new Error('CALA_API_KEY is required for HttpCalaClient');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/knowledge/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Cala query failed with status ${response.status}`);
      return parseResult(input, await response.json());
    } finally {
      clearTimeout(timeout);
    }
  }
  async queryHealthcare(company: Company): Promise<CalaQueryResult> {
    return this.query(healthcareQuery(company));
  }
  async queryFinance(company: Company): Promise<CalaQueryResult> {
    return this.query(financeQuery(company));
  }
}

// Deterministic Cala client for tests; counts calls to assert routing.
export class MockCalaClient implements CalaClient {
  public healthcareCalls = 0;
  public financeCalls = 0;
  constructor(private readonly seed: { healthcare?: Partial<CalaQueryResult>; finance?: Partial<CalaQueryResult> } = {}) {}
  async queryHealthcare(company: Company): Promise<CalaQueryResult> {
    this.healthcareCalls += 1;
    return { input: healthcareQuery(company), entities: [], results: [], ...this.seed.healthcare };
  }
  async queryFinance(company: Company): Promise<CalaQueryResult> {
    this.financeCalls += 1;
    return { input: financeQuery(company), entities: [], results: [], ...this.seed.finance };
  }
}
