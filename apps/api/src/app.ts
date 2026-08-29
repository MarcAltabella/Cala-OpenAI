import express from 'express';
import { companiesRouter } from './routes/companies.js';
import { runsRouter } from './routes/runs.js';
import { knowledgeGraphRouter } from './routes/knowledge-graph.js';
export function createApp() { const app = express(); app.use(express.json()); app.use('/companies', companiesRouter); app.use('/runs', runsRouter); app.use('/knowledge-graph', knowledgeGraphRouter); return app; }
export const app = createApp();
