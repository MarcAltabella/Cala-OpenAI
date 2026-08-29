import type { Company } from '@cala/contracts';

export type DocumentKind = 'paper' | 'patent' | 'trial' | 'news' | 'filing' | 'label' | 'press';

export type NormalizedDocument = {
  provider: string;
  providerId: string;
  companyId: string | null;
  url: string | null;
  publishedAt: string | null;
  title: string;
  text: string;
  rawPayload: unknown;
  contentHash: string;
  documentKind: DocumentKind;
};

// A source adapter fetches provider deltas for a company since a given time.
// `fetchImpl` is injected so adapters are testable against fixtures with no
// network access. Adapters throw a provider-scoped error the workflow records
// without aborting sibling providers.
export type FetchImpl = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export type SourceContext = {
  company: Company;
  since: Date;
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
};

export interface SourceAdapter {
  readonly provider: string;
  fetch(context: SourceContext): Promise<NormalizedDocument[]>;
}

export class SourceAdapterError extends Error {
  constructor(public readonly provider: string, message: string, public readonly cause?: unknown) {
    super(`[${provider}] ${message}`);
    this.name = 'SourceAdapterError';
  }
}
