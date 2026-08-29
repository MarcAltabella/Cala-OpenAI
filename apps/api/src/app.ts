import express from 'express';
import helmet from 'helmet';
import { companiesRouter } from './routes/companies.js';
import { runsRouter } from './routes/runs.js';
import { knowledgeGraphRouter } from './routes/knowledge-graph.js';
import { peopleRouter } from './routes/people.js';
import { institutionsRouter } from './routes/institutions.js';
import { reportsRouter } from './routes/reports.js';
function isLoopback(ip: string | undefined): boolean { return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'; }
export function createApp() { const app = express(); app.disable('x-powered-by'); app.use(helmet({ contentSecurityPolicy: false })); app.use(express.json({ limit: '1mb' })); app.use((req, res, next) => { const token = process.env.LOCAL_OPERATOR_TOKEN; if (token ? req.get('x-local-operator-token') === token : isLoopback(req.ip)) return next(); return res.status(403).json({ error: 'Local operator access required' }); }); app.use('/companies', companiesRouter); app.use('/runs', runsRouter); app.use('/knowledge-graph', knowledgeGraphRouter); app.use('/people', peopleRouter); app.use('/institutions', institutionsRouter); app.use('/reports', reportsRouter); app.use((_req, res) => res.status(404).json({ error: 'Not found' })); app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error(error); res.status(500).json({ error: 'Internal server error' }); }); return app; }
export const app = createApp();
