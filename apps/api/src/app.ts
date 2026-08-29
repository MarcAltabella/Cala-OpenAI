import express from 'express';
import { companiesRouter } from './routes/companies.js';
import { runsRouter } from './routes/runs.js';
import { knowledgeGraphRouter } from './routes/knowledge-graph.js';
import { peopleRouter } from './routes/people.js';
import { institutionsRouter } from './routes/institutions.js';
import { reportsRouter } from './routes/reports.js';
export function createApp() { const app = express(); app.use(express.json()); app.use('/companies', companiesRouter); app.use('/runs', runsRouter); app.use('/knowledge-graph', knowledgeGraphRouter); app.use('/people', peopleRouter); app.use('/institutions', institutionsRouter); app.use('/reports', reportsRouter); return app; }
export const app = createApp();
