import type { Company } from '@cala/contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createPubmedAdapter, parsePubmed } from './pubmed.js';
import { createClinicalTrialsAdapter, parseClinicalTrials } from './clinical-trials.js';
import { createNewsAdapter, parseNews } from './news.js';
import { createWebNewsAdapter, parseWebNews, webNewsQuery } from './web-news.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' };
const load = (name: string): unknown => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const okResponse = (payload: unknown) => ({ ok: true, status: 200, json: async () => payload, text: async () => '' });

describe('pubmed adapter', () => {
  it('parses ESummary into paper documents', () => {
    const docs = parsePubmed(load('pubmed'), company);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({ provider: 'pubmed', providerId: '37000001', documentKind: 'paper', companyId: 'moderna' });
    expect(docs[0].url).toContain('37000001');
    expect(docs[0].contentHash).toHaveLength(64);
  });

  it('fetches via esearch then esummary', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ esearchresult: { idlist: ['37000001', '37000002'] } }))
      .mockResolvedValueOnce(okResponse(load('pubmed')));
    const docs = await createPubmedAdapter().fetch({ company, since: new Date(0), fetchImpl: fetchImpl as never });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(docs).toHaveLength(2);
  });

  it('wraps provider failures in a provider-scoped error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '' }));
    await expect(createPubmedAdapter().fetch({ company, since: new Date(0), fetchImpl: fetchImpl as never })).rejects.toThrow(/\[pubmed\]/);
  });
});

describe('clinical trials adapter', () => {
  it('parses studies into trial documents', () => {
    const docs = parseClinicalTrials(load('clinical-trials'), company);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ provider: 'clinicaltrials', providerId: 'NCT03897881', documentKind: 'trial' });
  });

  it('fetches and parses studies', async () => {
    const fetchImpl = vi.fn(async () => okResponse(load('clinical-trials')));
    const docs = await createClinicalTrialsAdapter().fetch({ company, since: new Date(0), fetchImpl: fetchImpl as never });
    expect(docs[0].providerId).toBe('NCT03897881');
  });
});

describe('news adapter', () => {
  it('parses feed items into news documents', () => {
    const docs = parseNews(load('news'), company);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ provider: 'news', documentKind: 'news' });
    expect(docs[0].url).toContain('modernatx');
  });

  it('returns nothing when no feed url is configured', async () => {
    const docs = await createNewsAdapter(() => null).fetch({ company, since: new Date(0) });
    expect(docs).toEqual([]);
  });

  it('fetches when a feed url is configured', async () => {
    const fetchImpl = vi.fn(async () => okResponse(load('news')));
    const docs = await createNewsAdapter(() => 'https://feed.test/moderna.json').fetch({ company, since: new Date(0), fetchImpl: fetchImpl as never });
    expect(docs).toHaveLength(1);
  });
});

describe('web news adapter', () => {
  it('parses Tavily results into news documents', () => {
    const docs = parseWebNews(load('web-news'), company);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      provider: 'web_news',
      providerId: 'https://example.com/moderna-melanoma-vaccine',
      documentKind: 'news',
      url: 'https://example.com/moderna-melanoma-vaccine',
    });
    expect(docs[0].text).toContain('mRNA-4157');
    expect(docs[0].text).not.toMatch(/<html/i);
  });

  it('returns nothing when no Tavily key is configured', async () => {
    const docs = await createWebNewsAdapter({ apiKey: null }).fetch({ company, since: new Date(0) });
    expect(docs).toEqual([]);
  });

  it('POSTs a company query to Tavily and parses the fixture', async () => {
    let postedBody = '';
    const fetchImpl = vi.fn(async (_url: string, init?: { body?: string }) => {
      postedBody = init?.body ?? '';
      return okResponse(load('web-news'));
    });
    const docs = await createWebNewsAdapter({ apiKey: 'test-key' }).fetch({
      company,
      since: new Date(0),
      fetchImpl: fetchImpl as never,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
    expect(JSON.parse(postedBody)).toMatchObject({ topic: 'news', include_raw_content: false, include_answer: false });
    expect(JSON.parse(postedBody).query).toBe(webNewsQuery(company));
    expect(docs).toHaveLength(1);
  });

  it('wraps provider failures in a provider-scoped error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '' }));
    await expect(
      createWebNewsAdapter({ apiKey: 'test-key' }).fetch({ company, since: new Date(0), fetchImpl: fetchImpl as never }),
    ).rejects.toThrow(/\[web_news\]/);
  });
});
