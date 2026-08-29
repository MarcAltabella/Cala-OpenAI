import { describe, expect, it, vi } from 'vitest';
import { contentHash, fetchJson, normalizeText } from './normalize.js';

describe('normalize', () => {
  it('creates the same hash for equivalent normalized content', () => {
    expect(contentHash('Title', 'Body')).toBe(contentHash('Title', 'Body'));
    expect(contentHash('  Title  ', 'Body\n\nmore')).toBe(contentHash('Title', 'Body more'));
  });

  it('produces different hashes for different content', () => {
    expect(contentHash('Title', 'Body')).not.toBe(contentHash('Title', 'Other'));
  });

  it('collapses whitespace', () => {
    expect(normalizeText('a\n  b   c ')).toBe('a b c');
  });

  it('fetchJson aborts after the timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(fetchJson('https://example.test', { fetchImpl: fetchImpl as never, timeoutMs: 5 })).rejects.toThrow();
  });

  it('fetchJson throws on non-ok responses', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => '' }));
    await expect(fetchJson('https://example.test', { fetchImpl: fetchImpl as never })).rejects.toThrow(/503/);
  });

  it('fetchJson forwards POST method, headers, and body', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }));
    await fetchJson('https://example.test/search', {
      fetchImpl: fetchImpl as never,
      method: 'POST',
      headers: { Authorization: 'Bearer k' },
      body: '{"q":"x"}',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/search',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer k' }, body: '{"q":"x"}' }),
    );
  });
});
