import { Router } from 'express';
import { createCompany, createCompanyPersisted, databaseEnabled, getCompanyPersisted, listCompanies, listCompaniesPersisted } from '@cala/db/src/repositories/companies.js';
import { listSourceDocuments } from '@cala/db/src/repositories/source-documents.js';
import { listDevelopments } from '@cala/db/src/repositories/developments.js';
import { listRuns, listRunsPersisted } from '@cala/db/src/repositories/runs.js';
import { listPeopleForCompany } from '@cala/db/src/repositories/people.js';
export const companiesRouter = Router();
companiesRouter.get('/', async (_req, res) => res.json(databaseEnabled() ? await listCompaniesPersisted() : listCompanies()));
companiesRouter.post('/', async (req, res) => {
  const { name, ticker = null } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || (ticker !== null && typeof ticker !== 'string')) return res.status(400).json({ error: 'name and ticker are required' });
  return res.status(201).json(databaseEnabled() ? await createCompanyPersisted({ name: name.trim(), ticker }) : createCompany({ name: name.trim(), ticker }));
});
companiesRouter.get('/:id', async (req, res) => { const company = databaseEnabled() ? await getCompanyPersisted(req.params.id) : listCompanies().find(item => item.id === req.params.id); const runs = databaseEnabled() ? await listRunsPersisted(req.params.id) : listRuns(req.params.id); return company ? res.json({ ...company, latestRun: runs[0] ?? null }) : res.status(404).json({ error: 'company not found' }); });
companiesRouter.get('/:id/agent-runs', async (req, res) => res.json(databaseEnabled() ? await listRunsPersisted(req.params.id) : listRuns(req.params.id)));
companiesRouter.get('/:id/timeline', (req, res) => res.json(listSourceDocuments(req.params.id).map(document => ({ id: document.id, kind: 'source_document', provider: document.provider, title: document.normalizedText.slice(0, 120), occurredAt: document.publishedAt ?? document.createdAt }))));
companiesRouter.get('/:id/people', (req, res) => res.json(listPeopleForCompany(req.params.id)));
companiesRouter.get('/:id/developments', (req, res) => res.json(listDevelopments(req.params.id)));
