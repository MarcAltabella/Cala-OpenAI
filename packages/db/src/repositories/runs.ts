import type { AgentRun, RunInput } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const runs = new Map<string, AgentRun>();
export function createRun(input: RunInput): AgentRun { const run: AgentRun = { id: randomUUID(), companyId: input.companyId ?? null, mode: input.mode, status: 'queued', startedAt: null, finishedAt: null, error: null, counts: {} }; runs.set(run.id, run); return run; }
export function getRun(id: string): AgentRun | undefined { return runs.get(id); }
export function resetRuns(): void { runs.clear(); }
