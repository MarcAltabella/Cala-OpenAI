import { Router } from 'express';
import { createRepositoriesFromEnv } from '@cala/db';
import { listSourceDocuments } from '@cala/db/src/repositories/source-documents.js';
import { listDevelopments } from '@cala/db/src/repositories/developments.js';
import { listRuns } from '@cala/db/src/repositories/runs.js';
import { listPeopleForCompany } from '@cala/db/src/repositories/people.js';

export const companiesRouter = Router();
companiesRouter.get('/', async (_req, res) => res.json(await createRepositoriesFromEnv().companies.list()));
companiesRouter.post('/', async (req, res) => {
  const { name, ticker = null } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || (ticker !== null && typeof ticker !== 'string')) {
    return res.status(400).json({ error: 'name and ticker are required' });
  }
  return res.status(201).json(await createRepositoriesFromEnv().companies.create({ name: name.trim(), ticker }));
});
companiesRouter.get('/:id', async (req, res) => {
  const company = await createRepositoriesFromEnv().companies.get(req.params.id);
  return company ? res.json({ ...company, latestRun: listRuns(company.id)[0] ?? null }) : res.status(404).json({ error: 'company not found' });
});
companiesRouter.get('/:id/agent-runs', (req, res) => res.json(listRuns(req.params.id)));
companiesRouter.get('/:id/timeline', (req, res) =>
  res.json(
    listSourceDocuments(req.params.id).map((document) => ({
      id: document.id,
      kind: 'source_document',
      provider: document.provider,
      title: document.normalizedText.slice(0, 120),
      occurredAt: document.publishedAt ?? document.createdAt,
    })),
  ),
);
companiesRouter.get('/:id/people', (req, res) => res.json(listPeopleForCompany(req.params.id)));
companiesRouter.get('/:id/developments', (req, res) => res.json(listDevelopments(req.params.id)));
