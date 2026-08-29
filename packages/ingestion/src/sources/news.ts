import type { Company } from '@cala/contracts';
import { contentHash, fetchJson, normalizeText } from '../normalize.js';
import { SourceAdapterError, type NormalizedDocument, type SourceAdapter, type SourceContext } from '../types.js';

const PROVIDER = 'news';

type NewsItem = { id?: string; guid?: string; title?: string; summary?: string; description?: string; url?: string; link?: string; published?: string; pubDate?: string };
type NewsPayload = { items?: NewsItem[] };

// Parse a normalized JSON news/IR feed into normalized news documents.
export function parseNews(payload: unknown, company: Company): NormalizedDocument[] {
  const items = (payload as NewsPayload)?.items;
  if (!Array.isArray(items)) return [];
  const docs: NormalizedDocument[] = [];
  for (const item of items) {
    const url = item.url ?? item.link ?? null;
    const id = item.id ?? item.guid ?? url;
    if (!id) continue;
    const title = item.title ?? '';
    const body = item.summary ?? item.description ?? '';
    const text = normalizeText([title, body].filter(Boolean).join('. '));
    const published = item.published ?? item.pubDate ?? null;
    docs.push({
      provider: PROVIDER,
      providerId: id,
      companyId: company.id,
      url,
      publishedAt: published ? new Date(published).toISOString() : null,
      title,
      text,
      rawPayload: item,
      contentHash: contentHash(title, text),
      documentKind: 'news',
    });
  }
  return docs;
}

// The feed URL is configured per company (company_sources) or via env; a
// missing feed yields no documents rather than an error.
export function createNewsAdapter(feedUrlFor: (company: Company) => string | null): SourceAdapter {
  return {
    provider: PROVIDER,
    async fetch(context: SourceContext): Promise<NormalizedDocument[]> {
      const feedUrl = feedUrlFor(context.company);
      if (!feedUrl) return [];
      try {
        const payload = await fetchJson(feedUrl, context);
        return parseNews(payload, context.company);
      } catch (error) {
        throw new SourceAdapterError(PROVIDER, 'failed to fetch news feed', error);
      }
    },
  };
}
