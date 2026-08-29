import { Router, type Router as RouterType } from 'express';
import { getPerson, listPeople } from '@cala/db/src/repositories/people.js';
import { listRelationships } from '@cala/db/src/repositories/entities.js';
export const peopleRouter: RouterType = Router();
peopleRouter.get('/', (_req, res) => res.json(listPeople()));
peopleRouter.get('/:id', (req, res) => { const person = getPerson(req.params.id); return person ? res.json({ ...person, neighborhood: { relationships: listRelationships().filter(edge => edge.fromEntityId === person.id || edge.toEntityId === person.id) } }) : res.status(404).json({ error: 'person not found' }); });
