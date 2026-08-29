import { Router, type Router as RouterType } from 'express';
import { getInstitution, listInstitutions } from '@cala/db/src/repositories/institutions.js';
import { listRelationships } from '@cala/db/src/repositories/entities.js';
export const institutionsRouter: RouterType = Router();
institutionsRouter.get('/', (_req, res) => res.json(listInstitutions()));
institutionsRouter.get('/:id', (req, res) => { const institution = getInstitution(req.params.id); return institution ? res.json({ ...institution, neighborhood: { relationships: listRelationships().filter(edge => edge.fromEntityId === institution.id || edge.toEntityId === institution.id) } }) : res.status(404).json({ error: 'institution not found' }); });
