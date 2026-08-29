import { Router } from 'express';
import { neighborhood } from '@cala/graph/src/queries.js';
export const knowledgeGraphRouter = Router();
knowledgeGraphRouter.get('/', async (req, res) => {
  const types = typeof req.query.types === 'string' ? req.query.types.split(',').filter(Boolean) : undefined;
  const graph = await neighborhood({ companyId: typeof req.query.companyId === 'string' ? req.query.companyId : undefined, types, query: typeof req.query.query === 'string' ? req.query.query : undefined });
  return res.json(graph);
});
