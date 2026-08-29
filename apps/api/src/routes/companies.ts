import { Router } from 'express';
import { createCompany, listCompanies } from '@cala/db/src/repositories/companies.js';
export const companiesRouter = Router();
companiesRouter.get('/', (_req, res) => res.json(listCompanies()));
companiesRouter.post('/', (req, res) => {
  const { name, ticker = null } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || (ticker !== null && typeof ticker !== 'string')) return res.status(400).json({ error: 'name and ticker are required' });
  return res.status(201).json(createCompany({ name: name.trim(), ticker }));
});
