import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { resetEntities, insertEntity, insertRelationship } from '@cala/db/src/repositories/entities.js';
import { insertMomentumReport, resetReports } from '@cala/db/src/repositories/reports.js';
import { insertSourceDocument, resetSourceDocuments } from '@cala/db/src/repositories/source-documents.js';

beforeEach(() => {
  resetEntities();
  resetReports();
  resetSourceDocuments();
});

describe('directory and analysis API', () => {
  it('returns people and institutions with neighborhood relationships', async () => {
    const person = insertEntity({ type: 'person', label: 'Dr. Ada Lovelace' });
    const institution = insertEntity({ type: 'institution', label: 'Moderna Research' });
    insertRelationship({ type: 'WORKS_AT', fromEntityId: person.id, toEntityId: institution.id, sourceDocumentId: null, evidenceUrl: null, confidence: 0.9 });

    const personResponse = await request(app).get(`/people/${person.id}`);
    expect(personResponse.status).toBe(200);
    expect(personResponse.body.neighborhood.relationships).toHaveLength(1);

    const institutionResponse = await request(app).get(`/institutions/${institution.id}`);
    expect(institutionResponse.status).toBe(200);
    expect(institutionResponse.body.neighborhood.relationships[0].type).toBe('WORKS_AT');
  });

  it('returns the latest momentum report or a not-found response', async () => {
    insertMomentumReport({ companyId: 'company-1', thesis: 'Momentum is building', events: [], generatedAt: new Date().toISOString() });
    const response = await request(app).get('/reports/momentum/company-1');
    expect(response.status).toBe(200);
    expect(response.body.thesis).toBe('Momentum is building');
    expect((await request(app).get('/reports/momentum/missing')).status).toBe(404);
  });

  it('returns company timeline events newest first', async () => {
    insertSourceDocument({ companyId: 'company-1', provider: 'pubmed', providerId: 'old', contentHash: 'old', publishedAt: '2025-01-01T00:00:00.000Z', normalizedText: 'Old paper' });
    insertSourceDocument({ companyId: 'company-1', provider: 'news', providerId: 'new', contentHash: 'new', publishedAt: '2025-02-01T00:00:00.000Z', normalizedText: 'New announcement' });
    const response = await request(app).get('/companies/company-1/timeline');
    expect(response.status).toBe(200);
    expect(response.body.map((event: { provider: string }) => event.provider)).toEqual(['news', 'pubmed']);
  });
});
