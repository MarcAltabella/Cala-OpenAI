import type { AgentRun, RunInput } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const runs = new Map<string, AgentRun>();
export function createRun(input: RunInput): AgentRun { const run: AgentRun = { id: randomUUID(), companyId: input.companyId ?? null, mode: input.mode, status: 'queued', phase: 'queued', startedAt: null, finishedAt: null, error: null, counts: {} }; runs.set(run.id, run); return run; }
export function getRun(id: string): AgentRun | undefined { return runs.get(id); }
export function listRuns(companyId: string): AgentRun[] { return [...runs.values()].filter(run => run.companyId === companyId).sort((a, b) => Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? '')); }
export function updateRun(id: string, patch: Partial<AgentRun>): AgentRun | undefined { const run = runs.get(id); if (!run) return undefined; Object.assign(run, patch); return run; }
export function resetRuns(): void { runs.clear(); }
