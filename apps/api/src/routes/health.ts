import { Router } from 'express';
import { pool } from '@cala/db';
import { createGraphFromEnv } from '@cala/graph';

const graph = createGraphFromEnv();
export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const [postgres, neo4j] = await Promise.allSettled([
    pool.query('SELECT 1'),
    graph.verifyConnectivity(),
  ]);
  const body = {
    status: postgres.status === 'fulfilled' && neo4j.status === 'fulfilled' ? 'ok' : 'degraded',
    postgres: postgres.status === 'fulfilled' ? 'connected' : 'unavailable',
    neo4j: neo4j.status === 'fulfilled' ? 'connected' : 'unavailable',
  };
  return res.status(body.status === 'ok' ? 200 : 503).json(body);
});
