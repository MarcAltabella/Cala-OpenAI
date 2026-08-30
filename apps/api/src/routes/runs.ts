import { Router } from 'express';
import { createRepositoriesFromEnv } from '@cala/db';
import { listRunEvents, listRunEventsPersisted } from '@cala/db/src/repositories/run-events.js';
import { databaseEnabled } from '@cala/db/src/repositories/runs.js';

export const runsRouter = Router();
export let enqueueRun = (_runId: string): void => {};
export function setEnqueueRun(fn: (runId: string) => void): void {
  enqueueRun = fn;
}
runsRouter.post('/', async (req, res) => {
  const { companyId } = req.body ?? {};
  if (typeof companyId !== 'string') {
    return res.status(400).json({ error: 'companyId is required' });
  }
  const run = await createRepositoriesFromEnv().runs.create({ companyId, mode: 'delta' });
  console.log(`[run ${run.id}] queued company=${companyId} mode=delta`);
  enqueueRun(run.id);
  return res.status(202).json({ id: run.id, status: 'queued' });
});
runsRouter.get('/:id', async (req, res) => {
  const run = await createRepositoriesFromEnv().runs.get(req.params.id);
  return run ? res.json(run) : res.status(404).json({ error: 'run not found' });
});
runsRouter.get('/:id/events', async (req, res) => {
  const run = await createRepositoriesFromEnv().runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  return res.json(databaseEnabled() ? await listRunEventsPersisted(run.id) : listRunEvents(run.id));
});
