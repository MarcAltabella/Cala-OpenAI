import { Router, type Router as RouterType } from 'express';
import { getMomentumReport } from '@cala/db/src/repositories/reports.js';
export const reportsRouter: RouterType = Router();
reportsRouter.get('/momentum/:companyId', (req, res) => { const report = getMomentumReport(req.params.companyId); return report ? res.json(report) : res.status(404).json({ error: 'momentum report not found' }); });
