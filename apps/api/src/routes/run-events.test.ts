import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetRepositoriesForTests } from '@cala/db';
import { appendRunEvent, resetRunEvents } from '@cala/db/src/repositories/run-events.js';

beforeEach(() => {
  resetRepositoriesForTests();
  resetRunEvents();
});

describe('run observability API', () => {
  it('returns safe run events in append order', async () => {
    const created = await request(app).post('/runs').send({ companyId: 'company-1', mode: 'delta' });
    appendRunEvent({ runId: created.body.id, phase: 'fanout', kind: 'tool_call', tool: 'search_pubmed', input: { apiKey: 'secret', query: 'melanoma' }, summary: 'Searching PubMed' });
    const response = await request(app).get(`/runs/${created.body.id}/events`);
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ kind: 'tool_call', tool: 'search_pubmed', input: { query: 'melanoma' } });
    expect(response.body[0].input.apiKey).toBeUndefined();
  });
});
