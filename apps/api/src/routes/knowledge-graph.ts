import { Router } from 'express';
import { createOpenAIClient, generateSqlQuery, matchHardcodedSql } from '@cala/agents';
import { executeReadOnlySql, getGraphEntityDetail } from '@cala/db';
import { createGraphFromEnv } from '@cala/graph';

const graph = createGraphFromEnv();
const GRAPH_LIMIT_CAP = 100_000;

export const knowledgeGraphRouter = Router();
knowledgeGraphRouter.get('/', async (req, res) => {
  const list = (value: unknown) => typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : undefined;
  const hasSeed = typeof req.query.companyId === 'string' || typeof req.query.nodeId === 'string' || typeof req.query.personId === 'string' || typeof req.query.institutionId === 'string';
  const requestedLimit = Number(req.query.limit ?? (hasSeed ? 5_000 : GRAPH_LIMIT_CAP));
  if (!Number.isFinite(requestedLimit) || requestedLimit < 1) return res.status(400).json({ error: 'limit must be a positive number' });
  try {
    return res.json(await graph.neighborhood({
      nodeId: typeof req.query.nodeId === 'string' ? req.query.nodeId : undefined,
      companyId: typeof req.query.companyId === 'string' ? req.query.companyId : undefined,
      entityTypes: list(req.query.entityTypes),
      relationshipTypes: list(req.query.relationshipTypes ?? req.query.types),
      personId: typeof req.query.personId === 'string' ? req.query.personId : undefined,
      institutionId: typeof req.query.institutionId === 'string' ? req.query.institutionId : undefined,
      query: typeof req.query.query === 'string' ? req.query.query.trim() || undefined : undefined,
      limit: Math.min(requestedLimit, GRAPH_LIMIT_CAP),
    }));
  } catch {
    return res.status(503).json({ error: 'Neo4j is unavailable' });
  }
});

knowledgeGraphRouter.get('/entities/:id', async (req, res) => {
  try {
    const detail = await getGraphEntityDetail(req.params.id);
    return detail ? res.json(detail) : res.status(404).json({ error: 'entity not found' });
  } catch {
    return res.status(503).json({ error: 'PostgreSQL is unavailable' });
  }
});

knowledgeGraphRouter.post('/sql', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'question is required' });
  try {
    const hardcoded = matchHardcodedSql(question);
    if (hardcoded) {
      return res.json({ question, ...hardcoded });
    }
    const generated = await generateSqlQuery(createOpenAIClient().chat, question);
    const result = await executeReadOnlySql(generated.sql);
    return res.json({ question, ...generated, ...result });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'SQL query failed';
    const status = /OPENAI_API_KEY|unavailable/i.test(message) ? 503 : 400;
    return res.status(status).json({ error: message });
  }
});
