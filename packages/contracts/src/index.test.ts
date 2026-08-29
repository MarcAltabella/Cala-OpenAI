import { describe, expect, it } from 'vitest';
import type { AgentRun, CalaSnapshot, FinanceImpact, HealthcareGate, RelationPack } from './index.js';

describe('contracts', () => {
  it('models an agent run with a phase', () => {
    const run: AgentRun = { id: 'r1', companyId: 'c1', mode: 'delta', status: 'running', phase: 'fanout', startedAt: null, finishedAt: null, error: null, counts: {} };
    expect(run.phase).toBe('fanout');
  });

  it('models a cala snapshot', () => {
    const snapshot: CalaSnapshot = { id: 's1', companyId: 'c1', kind: 'healthcare', input: 'companies.name=Moderna', entities: [{ id: 'e1', entityType: 'Company', name: 'Moderna', mentions: ['Moderna'] }], results: [{ company: 'Moderna' }], createdAt: '2026-01-01T00:00:00.000Z' };
    expect(snapshot.entities[0].name).toBe('Moderna');
  });

  it('models a healthcare gate and finance impact', () => {
    const gate: HealthcareGate = { isNew: true, isRelevant: true, relevanceScore: 0.9, rationale: 'r', developmentSummary: 's' };
    const impact: FinanceImpact = { developmentSummary: 's', potentialProductOrCatalyst: 'vaccine', expectedImpact: { direction: 'up', magnitude: 'high', horizon: '12m', confidence: 0.7 }, rationale: 'r', evidenceIds: ['doc-1'] };
    expect(gate.isNew && impact.expectedImpact.direction === 'up').toBe(true);
  });

  it('models a relation pack', () => {
    const pack: RelationPack = { companyId: 'c1', brief: 'b', nodes: [], edges: [] };
    expect(pack.companyId).toBe('c1');
  });
});
