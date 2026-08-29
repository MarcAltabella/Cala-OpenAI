import { Router } from 'express';
import { createGraphFromEnv } from '@cala/graph';

const graph = createGraphFromEnv();
export const knowledgeGraphRouter = Router();
knowledgeGraphRouter.get('/', async (req, res) => {
  const types = typeof req.query.types === 'string' ? req.query.types.split(',').filter(Boolean) : undefined;
  res.json(await graph.neighborhood({
    companyId: typeof req.query.companyId === 'string' ? req.query.companyId : undefined,
    types,
    personId: typeof req.query.personId === 'string' ? req.query.personId : undefined,
    institutionId: typeof req.query.institutionId === 'string' ? req.query.institutionId : undefined,
  }));
});
