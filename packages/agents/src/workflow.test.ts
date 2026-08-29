import type { Company } from '@cala/contracts';
import { createInMemoryRepositories, createInMemoryStore } from '@cala/db';
import { InMemoryGraph } from '@cala/graph';
import type { NormalizedDocument, SourceContext } from '@cala/ingestion';
import { SourceAdapterError } from '@cala/ingestion';
import { describe, expect, it } from 'vitest';
import { MockCalaClient } from './cala.js';
import { MockFastinoClient } from './fastino.js';
import type { WorkflowDeps } from './deps.js';
import type { ResearchTool } from './tools.js';
import { runIntelligenceWorkflow } from './workflow.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, recency: 'high', createdAt: '2026-01-01T00:00:00.000Z' };
const runId = 'run-1';

function paperDoc(id: string): NormalizedDocument {
  return { provider: 'pubmed', providerId: id, companyId: company.id, url: null, publishedAt: null, title: `Paper ${id}`, text: `text ${id}`, rawPayload: {}, contentHash: `h${id}`, documentKind: 'paper' };
}
const okTool = (name: string, docs: NormalizedDocument[]): ResearchTool => ({ name, run: async (_c: SourceContext) => docs });
const failTool = (name: string): ResearchTool => ({ name, run: async () => { throw new SourceAdapterError(name, 'boom'); } });

type MockOptions = { gate?: { isNew: boolean; isRelevant: boolean }; failingTool?: string };

function mockDeps(options: MockOptions = {}): WorkflowDeps & { cala: MockCalaClient } {
  const store = createInMemoryStore({ companies: [company] });
  const repos = createInMemoryRepositories(store);
  // The run is created by the API; seed it here.
  void repos.runs.update(runId, { companyId: company.id, mode: 'delta', status: 'queued', phase: 'queued' });
  const tools: ResearchTool[] = options.failingTool
    ? [failTool(options.failingTool), okTool('clinicaltrials', [paperDoc('ct1')])]
    : [okTool('pubmed', [paperDoc('1')])];
  return {
    cala: new MockCalaClient(),
    // Default gate stops before finance so callers opt in to the finance branch.
    fastino: new MockFastinoClient({ gate: options.gate ?? { isNew: true, isRelevant: false } }),
    repos,
    graph: new InMemoryGraph(),
    tools,
  };
}

describe('runIntelligenceWorkflow', () => {
  it('runs Cala healthcare and research in parallel and does not call Cala finance before the gate', async () => {
    const deps = mockDeps();
    await runIntelligenceWorkflow(runId, deps);
    expect(deps.cala.healthcareCalls).toBe(1);
    expect(deps.cala.financeCalls).toBe(0);
  });

  it('stops without Cala finance when Fastino Healthcare returns not new or not relevant', async () => {
    const deps = mockDeps({ gate: { isNew: true, isRelevant: false } });
    const state = await runIntelligenceWorkflow(runId, deps);
    expect(state.financeImpactId).toBeNull();
    expect(deps.cala.financeCalls).toBe(0);
    expect((await deps.repos.runs.get(runId))?.phase).toBe('stopped');
  });

  it('calls Cala finance and Fastino Finance when the gate is new and relevant', async () => {
    const deps = mockDeps({ gate: { isNew: true, isRelevant: true } });
    const state = await runIntelligenceWorkflow(runId, deps);
    expect(deps.cala.financeCalls).toBe(1);
    expect(state.financeImpactId).toBeTruthy();
    expect((await deps.repos.runs.get(runId))?.phase).toBe('completed');
  });

  it('records a failing research tool without aborting the Cala branch', async () => {
    const deps = mockDeps({ failingTool: 'pubmed' });
    const state = await runIntelligenceWorkflow(runId, deps);
    expect(state.errors.some((e) => e.includes('pubmed'))).toBe(true);
    expect(deps.cala.healthcareCalls).toBe(1);
    expect(state.calaHealthcareSnapshotId).toBeTruthy();
  });
});
