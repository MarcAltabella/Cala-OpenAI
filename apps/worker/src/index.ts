import { runIntelligenceWorkflow, type WorkflowDeps, type WorkflowState } from '@cala/agents';
import { appendRunEvent, appendRunEventPersisted } from '@cala/db/src/repositories/run-events.js';
import { databaseEnabled, updateRun, updateRunPersisted } from '@cala/db/src/repositories/runs.js';

// Execute a run to completion. Deps are injectable for tests; production uses
// the default OpenAI/Cala/Fastino/graph wiring.
export async function runNow(runId: string, deps?: Partial<WorkflowDeps>): Promise<WorkflowState> {
  const append = databaseEnabled() ? appendRunEventPersisted : async (input: Parameters<typeof appendRunEvent>[0]) => appendRunEvent(input);
  const update = databaseEnabled() ? updateRunPersisted : async (id: string, patch: Parameters<typeof updateRun>[1]) => updateRun(id, patch);
  await append({ runId, phase: 'fanout', kind: 'phase', tool: null, summary: 'Run started' });
  try {
    const state = await runIntelligenceWorkflow(runId, deps);
    await append({ runId, phase: 'completed', kind: 'phase', tool: null, summary: 'Run completed' });
    return state;
  } catch (error) {
    await update(runId, { status: 'failed', phase: 'failed', error: error instanceof Error ? error.message : String(error), finishedAt: new Date().toISOString() });
    await append({ runId, phase: 'failed', kind: 'error', tool: null, summary: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Fire-and-forget bridge used by the API's POST /runs route.
export function enqueueRun(runId: string): void {
  runNow(runId).catch((error) => {
    console.error(`run ${runId} failed`, error);
  });
}

export { startDailyScheduler } from './scheduler.js';
