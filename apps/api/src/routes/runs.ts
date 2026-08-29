import { Router } from 'express';
import { createRun, createRunPersisted, databaseEnabled, getRun, getRunPersisted } from '@cala/db/src/repositories/runs.js';
import { listRunEvents, listRunEventsPersisted } from '@cala/db/src/repositories/run-events.js';
export const runsRouter = Router();
export let enqueueRun = (_runId: string): void => {};
// Allows the worker to replace the default no-op at server startup.
export function setEnqueueRun(fn: (runId: string) => void): void { enqueueRun = fn; }
runsRouter.post('/', async (req, res) => {
  const { companyId, mode } = req.body ?? {};
  if (typeof companyId !== 'string' || (mode !== 'seed' && mode !== 'delta')) return res.status(400).json({ error: "companyId and mode ('seed' or 'delta') are required" });
  const run = databaseEnabled() ? await createRunPersisted({ companyId, mode }) : createRun({ companyId, mode }); enqueueRun(run.id);
  return res.status(202).json({ id: run.id, status: 'queued' });
});
runsRouter.get('/:id', async (req, res) => { const run = databaseEnabled() ? await getRunPersisted(req.params.id) : getRun(req.params.id); return run ? res.json(run) : res.status(404).json({ error: 'run not found' }); });
runsRouter.get('/:id/events', async (req, res) => { const run = databaseEnabled() ? await getRunPersisted(req.params.id) : getRun(req.params.id); if (!run) return res.status(404).json({ error: 'run not found' }); return res.json(databaseEnabled() ? await listRunEventsPersisted(run.id) : listRunEvents(run.id)); });
