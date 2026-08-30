import { describe, expect, it } from 'vitest';
import { assertReadOnlySelect } from '@cala/db';
import { StubChatModel } from './models.js';
import { generateSqlQuery, inferGraphFilter } from './sql.js';

describe('assertReadOnlySelect', () => {
  it('accepts a select and strips a trailing semicolon', () => {
    expect(assertReadOnlySelect('SELECT id, name FROM companies;')).toBe('SELECT id, name FROM companies');
  });

  it('rejects writes and stacked statements', () => {
    expect(() => assertReadOnlySelect('DELETE FROM companies')).toThrow(/read-only/i);
    expect(() => assertReadOnlySelect('SELECT 1; DROP TABLE companies')).toThrow(/single SELECT/i);
  });
});

describe('graph ask filters', () => {
  it('infers Moderna clinical trials and news', () => {
    expect(inferGraphFilter('show me the moderna clinical trials and news related')).toMatchObject({
      companyTicker: 'MRNA',
      entityTypes: expect.arrayContaining(['company', 'clinical_trial', 'news']),
      relationshipTypes: expect.arrayContaining(['TRIAL_BY', 'REPORTED_ON']),
    });
  });

});

describe('generateSqlQuery', () => {
  it('asks the model and validates the returned SQL', async () => {
    const chat = new StubChatModel(() => JSON.stringify({
      sql: 'SELECT name, ticker FROM companies ORDER BY display_order LIMIT 20',
      explanation: 'List watchlist companies.',
      graphFilter: { allCompanies: true, entityTypes: ['company'] },
    }));
    const result = await generateSqlQuery(chat, 'show all companies');
    expect(result.sql).toMatch(/^SELECT name, ticker FROM companies/i);
    expect(result.explanation).toContain('watchlist');
    expect(result.graphFilter.allCompanies).toBe(true);
    expect(chat.calls[0]?.user).toBe('show all companies');
  });

});
