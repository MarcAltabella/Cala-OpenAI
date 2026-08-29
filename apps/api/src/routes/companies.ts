import { Router } from 'express';
import { createCompany, listCompanies } from '@cala/db/src/repositories/companies.js';
import { listSourceDocuments } from '@cala/db/src/repositories/source-documents.js';
import { listDevelopments } from '@cala/db/src/repositories/developments.js';
import { listRuns } from '@cala/db/src/repositories/runs.js';
export const companiesRouter = Router();
companiesRouter.get('/', (_req, res) => res.json(listCompanies()));
companiesRouter.post('/', (req, res) => {
  const { name, ticker = null } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || (ticker !== null && typeof ticker !== 'string')) return res.status(400).json({ error: 'name and ticker are required' });
  return res.status(201).json(createCompany({ name: name.trim(), ticker }));
});
companiesRouter.get('/:id', (req, res) => { const company = listCompanies().find(item => item.id === req.params.id); return company ? res.json({ ...company, latestRun: listRuns(company.id)[0] ?? null }) : res.status(404).json({ error: 'company not found' }); });
companiesRouter.get('/:id/agent-runs', (req, res) => res.json(listRuns(req.params.id)));
companiesRouter.get('/:id/timeline', (req, res) => res.json(listSourceDocuments(req.params.id).map(document => ({ id: document.id, kind: 'source_document', provider: document.provider, title: document.normalizedText.slice(0, 120), occurredAt: document.publishedAt ?? document.createdAt }))));
companiesRouter.get('/:id/people', (_req, res) => res.json([]));
companiesRouter.get('/:id/developments', (req, res) => res.json(listDevelopments(req.params.id)));
