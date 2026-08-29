import { Router } from 'express';
import { createRun, getRun } from '@cala/db/src/repositories/runs.js';
export const runsRouter = Router();
export let enqueueRun = (_runId: string): void => {};
runsRouter.post('/', (req, res) => {
  const { companyId, mode } = req.body ?? {};
  if (typeof companyId !== 'string' || (mode !== 'seed' && mode !== 'delta')) return res.status(400).json({ error: "companyId and mode ('seed' or 'delta') are required" });
  const run = createRun({ companyId, mode }); enqueueRun(run.id);
  return res.status(202).json({ id: run.id, status: 'queued' });
});
runsRouter.get('/:id', (req, res) => { const run = getRun(req.params.id); return run ? res.json(run) : res.status(404).json({ error: 'run not found' }); });
