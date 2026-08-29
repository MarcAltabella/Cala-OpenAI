import type { Company } from '@cala/contracts';
import { describe, expect, it, vi } from 'vitest';
import { HttpCalaClient, MockCalaClient, financeQuery, healthcareQuery } from './cala.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' };

describe('cala query builders', () => {
  it('builds healthcare and finance queries', () => {
    expect(healthcareQuery(company)).toContain('Moderna');
    expect(financeQuery(company)).toContain('MRNA');
  });
});

describe('HttpCalaClient', () => {
  it('posts to the knowledge query endpoint and maps entities', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: { headers: Record<string, string> }) => ({
      ok: true,
      status: 200,
      json: async () => ({ entities: [{ entity_type: 'Company', id: 'e1', name: 'Moderna', mentions: ['Moderna'] }], results: [{ company: 'Moderna' }] }),
    }));
    const client = new HttpCalaClient({ apiKey: 'k', fetchImpl: fetchImpl as never });
    const result = await client.queryHealthcare(company);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers['X-API-KEY']).toBe('k');
    expect(result.entities[0]).toMatchObject({ entityType: 'Company', name: 'Moderna' });
    expect(result.results).toHaveLength(1);
  });

  it('throws without an api key', async () => {
    const client = new HttpCalaClient({ apiKey: '', fetchImpl: (async () => ({ ok: true, status: 200, json: async () => ({}) })) as never });
    await expect(client.queryFinance(company)).rejects.toThrow(/CALA_API_KEY/);
  });
});

describe('MockCalaClient', () => {
  it('counts healthcare and finance calls independently', async () => {
    const cala = new MockCalaClient();
    await cala.queryHealthcare(company);
    await cala.queryHealthcare(company);
    await cala.queryFinance(company);
    expect(cala.healthcareCalls).toBe(2);
    expect(cala.financeCalls).toBe(1);
  });
});
