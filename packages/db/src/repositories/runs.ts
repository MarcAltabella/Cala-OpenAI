import type { AgentRun, AgentRunPhase, RunInput } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { databaseEnabled, db } from '../client.js';
import { agentRuns } from '../schema.js';
const runs = new Map<string, AgentRun>();
export function createRun(input: RunInput): AgentRun {
  const run: AgentRun = {
    id: randomUUID(),
    companyId: input.companyId ?? null,
    mode: input.mode,
    status: 'queued',
    phase: 'queued',
    startedAt: null,
    finishedAt: null,
    error: null,
    counts: { calaHealthcare: 0, documents: 0, gate: 0, finance: 0 },
  };
  runs.set(run.id, run);
  return run;
}
export function getRun(id: string): AgentRun | undefined {
  return runs.get(id);
}

export function listRuns(companyId: string): AgentRun[] {
  return [...runs.values()]
    .filter((run) => run.companyId === companyId)
    .sort((a, b) => Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? ''));
}

export function updateRun(id: string, patch: Partial<Omit<AgentRun, 'id'>>): AgentRun | undefined {
  const run = runs.get(id);
  if (!run) return undefined;
  const next = { ...run, ...patch };
  runs.set(id, next);
  return next;
}
export function setRunPhase(id: string, phase: AgentRunPhase): AgentRun | undefined {
  return updateRun(id, { phase });
}

export function resetRuns(): void {
  runs.clear();
}

export { databaseEnabled };

function fromRow(row: typeof agentRuns.$inferSelect): AgentRun {
  return {
    id: row.id,
    companyId: row.companyId,
    mode: row.mode === 'seed' ? 'seed' : 'delta',
    status: row.status as AgentRun['status'],
    phase: row.phase as AgentRunPhase,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    error: row.error,
    counts: row.counts ?? {},
  };
}

export async function createRunPersisted(input: RunInput): Promise<AgentRun> {
  const [row] = await db
    .insert(agentRuns)
    .values({ companyId: input.companyId ?? null, mode: input.mode, status: 'queued', phase: 'queued', counts: {} })
    .returning();
  return fromRow(row);
}

export async function getRunPersisted(id: string): Promise<AgentRun | undefined> {
  const [row] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return row ? fromRow(row) : undefined;
}

export async function listRunsPersisted(companyId: string): Promise<AgentRun[]> {
  const rows = await db.select().from(agentRuns).where(eq(agentRuns.companyId, companyId)).orderBy(desc(agentRuns.startedAt));
  return rows.map(fromRow);
}

export async function updateRunPersisted(id: string, patch: Partial<Omit<AgentRun, 'id'>>): Promise<AgentRun | undefined> {
  const { startedAt, finishedAt, ...rest } = patch;
  const values: Partial<typeof agentRuns.$inferInsert> = rest;
  if ('startedAt' in patch) values.startedAt = startedAt ? new Date(startedAt) : null;
  if ('finishedAt' in patch) values.finishedAt = finishedAt ? new Date(finishedAt) : null;
  const [row] = await db.update(agentRuns).set(values).where(eq(agentRuns.id, id)).returning();
  return row ? fromRow(row) : undefined;
}
