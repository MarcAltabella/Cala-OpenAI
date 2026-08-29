import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from './in-memory.js';

describe('in-memory repositories', () => {
  it('deduplicates source documents by provider identifier', async () => {
    const repos = createInMemoryRepositories();
    const first = await repos.documents.upsert({ provider: 'pubmed', providerId: '123', contentHash: 'a' });
    const second = await repos.documents.upsert({ provider: 'pubmed', providerId: '123', contentHash: 'a' });
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
    expect(second.record.id).toBe(first.record.id);
  });

  it('merges an identical relationship only once', async () => {
    const repos = createInMemoryRepositories();
    const a = await repos.entities.upsert({ entityType: 'company', label: 'Moderna' });
    const b = await repos.entities.upsert({ entityType: 'paper', label: 'mRNA melanoma' });
    const r1 = await repos.relationships.upsert({ fromEntityId: b.record.id, toEntityId: a.record.id, relationshipType: 'DEVELOPED_BY' });
    const r2 = await repos.relationships.upsert({ fromEntityId: b.record.id, toEntityId: a.record.id, relationshipType: 'DEVELOPED_BY' });
    expect(r1.isNew).toBe(true);
    expect(r2.isNew).toBe(false);
    expect(await repos.relationships.listAll()).toHaveLength(1);
  });

  it('persists cala snapshots, gates, and finance impacts', async () => {
    const repos = createInMemoryRepositories();
    const snapshot = await repos.calaSnapshots.insert({ companyId: 'c1', kind: 'healthcare', input: 'companies.name=Moderna', entities: [], results: [] });
    const gate = await repos.healthcareGates.insert({ isNew: true, isRelevant: true, relevanceScore: 0.9, rationale: 'r', developmentSummary: 's' });
    const impact = await repos.financeImpacts.insert({ developmentSummary: 's', potentialProductOrCatalyst: 'vaccine', expectedImpact: { direction: 'up', magnitude: 'high', horizon: '12m', confidence: 0.7 }, rationale: 'r', evidenceIds: [] });
    expect(snapshot.id).toBeTruthy();
    expect(gate.id).toBeTruthy();
    expect(impact.id).toBeTruthy();
  });
});
