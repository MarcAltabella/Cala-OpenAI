import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetRuns } from '@cala/db/src/repositories/runs.js';
beforeEach(() => resetRuns());
describe('runs API', () => { it('queues a delta run without blocking', async () => { const response = await request(app).post('/runs').send({ companyId: 'company-1', mode: 'delta' }); expect(response.status).toBe(202); expect(response.body).toMatchObject({ status: 'queued' }); const status = await request(app).get(`/runs/${response.body.id}`); expect(status.body).toMatchObject({ status: 'queued', phase: 'queued', mode: 'delta' }); }); });
