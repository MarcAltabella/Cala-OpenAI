import type { Company } from '@cala/contracts';
import { contentHash, fetchJson, normalizeText } from '../normalize.js';
import { SourceAdapterError, type NormalizedDocument, type SourceAdapter, type SourceContext } from '../types.js';

const PROVIDER = 'pubmed';
const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

type ESummaryItem = { uid: string; title?: string; pubdate?: string; source?: string; fulljournalname?: string };
type ESummaryPayload = { result?: Record<string, ESummaryItem | string[]> & { uids?: string[] } };

// Parse an NCBI ESummary payload into normalized paper documents.
export function parsePubmed(payload: unknown, company: Company): NormalizedDocument[] {
  const result = (payload as ESummaryPayload)?.result;
  if (!result || !Array.isArray(result.uids)) return [];
  const docs: NormalizedDocument[] = [];
  for (const uid of result.uids) {
    const item = result[uid] as ESummaryItem | undefined;
    if (!item || typeof item !== 'object') continue;
    const title = item.title ?? '';
    const text = normalizeText([title, item.fulljournalname ?? item.source ?? ''].filter(Boolean).join('. '));
    docs.push({
      provider: PROVIDER,
      providerId: uid,
      companyId: company.id,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      publishedAt: item.pubdate ? new Date(item.pubdate).toISOString() : null,
      title,
      text,
      rawPayload: item,
      contentHash: contentHash(title, text),
      documentKind: 'paper',
    });
  }
  return docs;
}

export function createPubmedAdapter(): SourceAdapter {
  return {
    provider: PROVIDER,
    async fetch(context: SourceContext): Promise<NormalizedDocument[]> {
      try {
        const term = encodeURIComponent(`${context.company.name}[Affiliation] OR ${context.company.name}[Title/Abstract]`);
        const search = (await fetchJson(`${ESEARCH}?db=pubmed&retmode=json&term=${term}`, context)) as {
          esearchresult?: { idlist?: string[] };
        };
        const ids = search.esearchresult?.idlist ?? [];
        if (ids.length === 0) return [];
        const summary = await fetchJson(`${ESUMMARY}?db=pubmed&retmode=json&id=${ids.join(',')}`, context);
        return parsePubmed(summary, context.company);
      } catch (error) {
        throw new SourceAdapterError(PROVIDER, 'failed to fetch PubMed deltas', error);
      }
    },
  };
}
