import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { createRun, resetRuns } from '@cala/db/src/repositories/runs.js';
import { appendRunEvent, resetRunEvents } from '@cala/db/src/repositories/run-events.js';

beforeEach(() => { resetRuns(); resetRunEvents(); });

describe('run observability API', () => {
  it('returns safe run events in append order', async () => {
    const run = createRun({ companyId: 'company-1', mode: 'delta' });
    appendRunEvent({ runId: run.id, phase: 'fanout', kind: 'tool_call', tool: 'search_pubmed', input: { apiKey: 'secret', query: 'melanoma' }, summary: 'Searching PubMed' });
    const response = await request(app).get(`/runs/${run.id}/events`);
    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ kind: 'tool_call', tool: 'search_pubmed', input: { query: 'melanoma' } });
    expect(response.body[0].input.apiKey).toBeUndefined();
  });
});
