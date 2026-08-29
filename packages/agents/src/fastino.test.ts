import type { Company, RelationPack } from '@cala/contracts';
import { describe, expect, it } from 'vitest';
import { MockCalaClient } from './cala.js';
import { MockFastinoClient, OpenAIFastinoClient, financeImpactSchema, healthcareGateSchema } from './fastino.js';
import { StubChatModel } from './models.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, recency: 'high', createdAt: '2026-01-01T00:00:00.000Z' };
const relationPack: RelationPack = { companyId: 'moderna', brief: 'Moderna develops mRNA-4157 with Merck', nodes: [], edges: [] };
const cala = new MockCalaClient();

describe('OpenAIFastinoClient', () => {
  it('parses a valid healthcare gate response', async () => {
    const chat = new StubChatModel(() =>
      JSON.stringify({ isNew: true, isRelevant: true, relevanceScore: 0.92, rationale: 'novel phase 2b readout', developmentSummary: 'mRNA-4157 cut recurrence' }),
    );
    const client = new OpenAIFastinoClient(chat);
    const gate = await client.healthcareGate({ company, relationPack, calaHealthcare: await cala.queryHealthcare(company), documentSummaries: ['paper: melanoma vaccine'] });
    expect(gate).toMatchObject({ isNew: true, isRelevant: true });
    expect(chat.calls[0].jsonSchema?.name).toBe('healthcare_gate');
  });

  it('rejects an out-of-range gate response', async () => {
    const chat = new StubChatModel(() => JSON.stringify({ isNew: true, isRelevant: true, relevanceScore: 5, rationale: 'x', developmentSummary: 'y' }));
    const client = new OpenAIFastinoClient(chat);
    await expect(client.healthcareGate({ company, relationPack, calaHealthcare: await cala.queryHealthcare(company), documentSummaries: [] })).rejects.toThrow();
  });

  it('parses a valid finance impact response', async () => {
    const chat = new StubChatModel(() =>
      JSON.stringify({
        developmentSummary: 'mRNA-4157 melanoma readout',
        potentialProductOrCatalyst: 'individualized neoantigen therapy approval',
        expectedImpact: { direction: 'up', magnitude: 'high', horizon: '18m', confidence: 0.65 },
        rationale: 'first-in-class adjuvant benefit',
        evidenceIds: ['doc-1'],
      }),
    );
    const client = new OpenAIFastinoClient(chat);
    const impact = await client.financeImpact({ company, developmentSummary: 'mRNA-4157 melanoma readout', relationPack, calaFinance: await cala.queryFinance(company) });
    expect(impact.expectedImpact.direction).toBe('up');
  });
});

describe('schemas', () => {
  it('validate expected shapes', () => {
    expect(() => healthcareGateSchema.parse({ isNew: true, isRelevant: false, relevanceScore: 0.1, rationale: 'r', developmentSummary: 's' })).not.toThrow();
    expect(() => financeImpactSchema.parse({ developmentSummary: 's', potentialProductOrCatalyst: 'p', expectedImpact: { direction: 'down', magnitude: 'low', horizon: '3m', confidence: 0.2 }, rationale: 'r', evidenceIds: [] })).not.toThrow();
  });
});

describe('MockFastinoClient', () => {
  it('respects seeded gate overrides and counts calls', async () => {
    const fastino = new MockFastinoClient({ gate: { isRelevant: false } });
    const gate = await fastino.healthcareGate({ company, relationPack, calaHealthcare: await cala.queryHealthcare(company), documentSummaries: [] });
    expect(gate.isRelevant).toBe(false);
    expect(fastino.gateCalls).toBe(1);
  });
});
