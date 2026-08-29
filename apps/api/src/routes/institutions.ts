import { Router } from 'express';
import { getInstitution, listInstitutions } from '@cala/db/src/repositories/institutions.js';
export const institutionsRouter = Router();
institutionsRouter.get('/', (_req, res) => res.json(listInstitutions()));
institutionsRouter.get('/:id', (req, res) => { const institution = getInstitution(req.params.id); return institution ? res.json({ ...institution, neighborhood: { relationships: [] } }) : res.status(404).json({ error: 'institution not found' }); });
