import { Router } from 'express';
import { getPerson, listPeople } from '@cala/db/src/repositories/people.js';
export const peopleRouter = Router();
peopleRouter.get('/', (_req, res) => res.json(listPeople()));
peopleRouter.get('/:id', (req, res) => { const person = getPerson(req.params.id); return person ? res.json({ ...person, neighborhood: { relationships: [] } }) : res.status(404).json({ error: 'person not found' }); });
