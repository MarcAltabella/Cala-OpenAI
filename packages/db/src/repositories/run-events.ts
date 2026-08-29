import type { RunEvent } from '@cala/contracts';
import { randomUUID } from 'node:crypto';

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
