import { runIntelligenceWorkflow, type WorkflowDeps, type WorkflowState } from '@cala/agents';

// Execute a run to completion. Deps are injectable for tests; production uses
// the default OpenAI/Cala/Fastino/graph wiring.
export async function runNow(runId: string, deps?: Partial<WorkflowDeps>): Promise<WorkflowState> {
  return runIntelligenceWorkflow(runId, deps);
}

// Fire-and-forget bridge used by the API's POST /runs route.
export function enqueueRun(runId: string): void {
  runNow(runId).catch((error) => {
    console.error(`run ${runId} failed`, error);
  });
}

export { startDailyScheduler } from './scheduler.js';
