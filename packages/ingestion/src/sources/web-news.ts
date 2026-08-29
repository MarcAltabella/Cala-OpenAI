import type { Company } from '@cala/contracts';
import { contentHash, fetchJson, normalizeText } from '../normalize.js';
import { SourceAdapterError, type NormalizedDocument, type SourceAdapter, type SourceContext } from '../types.js';

const PROVIDER = 'web_news';
const TAVILY_SEARCH = 'https://api.tavily.com/search';
const MAX_RESULTS = 10;
const MS_PER_DAY = 86_400_000;

type TavilyResult = { title?: string; url?: string; content?: string; published_date?: string };
type TavilyPayload = { results?: TavilyResult[] };

export type WebNewsAdapterOptions = { apiKey?: string | null };

export function webNewsQuery(company: Company): string {
  const name = `"${company.name}"`;
  const ticker = company.ticker ? ` OR ${company.ticker}` : '';
  return `${name}${ticker} (trial OR FDA OR vaccine OR partnership)`;
}

export function daysSince(since: Date, now = Date.now()): number {
  return Math.min(365, Math.max(1, Math.ceil((now - since.getTime()) / MS_PER_DAY)));
}

// Parse a Tavily search payload into news documents (title + snippet + URL only).
export function parseWebNews(payload: unknown, company: Company): NormalizedDocument[] {
  const results = (payload as TavilyPayload)?.results;
  if (!Array.isArray(results)) return [];
  const docs: NormalizedDocument[] = [];
  for (const item of results) {
    const url = item.url ?? null;
    if (!url) continue;
    const title = item.title ?? '';
    const snippet = item.content ?? '';
    const text = normalizeText([title, snippet].filter(Boolean).join('. '));
    docs.push({
      provider: PROVIDER,
      providerId: url,
      companyId: company.id,
      url,
      publishedAt: item.published_date ? new Date(item.published_date).toISOString() : null,
      title,
      text,
      rawPayload: item,
      contentHash: contentHash(title, text),
      documentKind: 'news',
    });
  }
  return docs;
}

export function createWebNewsAdapter(options: WebNewsAdapterOptions = {}): SourceAdapter {
  return {
    provider: PROVIDER,
    async fetch(context: SourceContext): Promise<NormalizedDocument[]> {
      const apiKey = options.apiKey === undefined ? process.env.TAVILY_API_KEY ?? null : options.apiKey;
      if (!apiKey) return [];
      try {
        const payload = await fetchJson(TAVILY_SEARCH, {
          fetchImpl: context.fetchImpl,
          timeoutMs: context.timeoutMs,
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: webNewsQuery(context.company),
            topic: 'news',
            include_raw_content: false,
            include_answer: false,
            max_results: MAX_RESULTS,
            days: daysSince(context.since),
          }),
        });
        return parseWebNews(payload, context.company);
      } catch (error) {
        throw new SourceAdapterError(PROVIDER, 'failed to fetch Tavily web news', error);
      }
    },
  };
}
