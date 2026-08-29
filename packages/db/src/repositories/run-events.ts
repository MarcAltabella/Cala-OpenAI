import type { RunEvent } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { runEvents } from '../schema.js';
import { databaseEnabled } from './runs.js';

const events = new Map<string, RunEvent[]>();
const secretKeys = /apiKey|api_key|token|secret|authorization|password/i;
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !secretKeys.test(key)).map(([key, child]) => [key, redact(child)]));
}
export function appendRunEvent(input: Omit<RunEvent, 'id' | 'createdAt'>): RunEvent {
  const event: RunEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), input: input.input ? redact(input.input) as Record<string, unknown> : undefined, output: input.output ? redact(input.output) as Record<string, unknown> : undefined };
  const runEvents = events.get(event.runId) ?? [];
  runEvents.push(event); events.set(event.runId, runEvents); return event;
}
export function listRunEvents(runId: string): RunEvent[] { return [...(events.get(runId) ?? [])]; }
export function resetRunEvents(): void { events.clear(); }

function fromRow(row: typeof runEvents.$inferSelect): RunEvent {
  return { id: row.id, runId: row.runId, phase: row.phase as RunEvent['phase'], kind: row.kind as RunEvent['kind'], tool: row.tool, input: row.input as Record<string, unknown> | undefined, output: row.output as Record<string, unknown> | undefined, summary: row.summary, createdAt: row.createdAt.toISOString() };
}

export async function appendRunEventPersisted(input: Omit<RunEvent, 'id' | 'createdAt'>): Promise<RunEvent> {
  const safeInput = input.input ? redact(input.input) as Record<string, unknown> : undefined;
  const safeOutput = input.output ? redact(input.output) as Record<string, unknown> : undefined;
  const [row] = await db.insert(runEvents).values({ runId: input.runId, phase: input.phase, kind: input.kind, tool: input.tool, input: safeInput, output: safeOutput, summary: input.summary }).returning();
  return fromRow(row);
}

export async function listRunEventsPersisted(runId: string): Promise<RunEvent[]> {
  const rows = await db.select().from(runEvents).where(eq(runEvents.runId, runId)).orderBy(asc(runEvents.createdAt));
  return rows.map(fromRow);
}
