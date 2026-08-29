import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetCompanies } from '@cala/db/src/repositories/companies.js';
beforeEach(() => resetCompanies());
describe('companies API', () => {
  it('returns companies ordered by display order then name', async () => { await request(app).post('/companies').send({ name: 'Zulu', ticker: null }); await request(app).post('/companies').send({ name: 'Alpha', ticker: null }); const response = await request(app).get('/companies'); expect(response.status).toBe(200); expect(response.body.map((c: {name: string}) => c.name)).toEqual(['Zulu', 'Alpha']); });
  it('creates an additional watchlist company', async () => { const response = await request(app).post('/companies').send({ name: 'Moderna', ticker: 'MRNA' }); expect(response.status).toBe(201); expect(response.body).toMatchObject({ name: 'Moderna', ticker: 'MRNA' }); });
});
