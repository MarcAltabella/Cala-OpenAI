import type { Company } from '@cala/contracts';
import { MockCalaClient, MockFastinoClient, type WorkflowDeps } from '@cala/agents';
import { createInMemoryRepositories, createInMemoryStore } from '@cala/db';
import { InMemoryGraph } from '@cala/graph';
import type { NormalizedDocument } from '@cala/ingestion';
import { describe, expect, it, vi } from 'vitest';
import { runNow } from './index.js';
import { startDailyScheduler } from './scheduler.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' };
const runId = 'run-worker-1';
const paper: NormalizedDocument = { provider: 'pubmed', providerId: '1', companyId: company.id, url: null, publishedAt: null, title: 'Paper', text: 'text', rawPayload: {}, contentHash: 'h1', documentKind: 'paper' };

function deps(gate: { isNew: boolean; isRelevant: boolean }): WorkflowDeps {
  const repos = createInMemoryRepositories(createInMemoryStore({ companies: [company] }));
  void repos.runs.update(runId, { companyId: company.id, mode: 'delta', status: 'queued', phase: 'queued' });
  return {
    cala: new MockCalaClient(),
    fastino: new MockFastinoClient({ gate }),
    repos,
    graph: new InMemoryGraph(),
    tools: [{ name: 'pubmed', run: async () => [paper] }],
  };
}

describe('runNow', () => {
  it('completes a run and updates its phase', async () => {
    const d = deps({ isNew: true, isRelevant: true });
    const state = await runNow(runId, d);
    expect(state.financeImpactId).toBeTruthy();
    expect((await d.repos.runs.get(runId))?.phase).toBe('completed');
  });
});

describe('startDailyScheduler', () => {
  it('invokes the tick on each interval and stops cleanly', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const stop = startDailyScheduler(tick, 1000);
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(2000);
    expect(tick).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
