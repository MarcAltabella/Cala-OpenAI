import { describe, expect, it } from 'vitest';
import { assertReadOnlySelect } from '@cala/db';
import { StubChatModel } from './models.js';
import { generateSqlQuery, inferGraphFilter, matchHardcodedSql } from './sql.js';

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

  it('returns a hardcoded filter for Moderna trials and news', () => {
    const result = matchHardcodedSql('show me the moderna clinical trials and news related');
    expect(result?.graphFilter).toMatchObject({
      companyTicker: 'MRNA',
      entityTypes: ['company', 'clinical_trial', 'news'],
      relationshipTypes: ['TRIAL_BY', 'REPORTED_ON'],
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

  it('returns hardcoded Moderna and clinical-trial demos without calling the model', async () => {
    const chat = new StubChatModel(() => {
      throw new Error('should not call the model');
    });
    const moderna = await generateSqlQuery(chat, 'Show Moderna graph coverage');
    expect(moderna.sql).toMatch(/ticker = 'MRNA'/i);
    expect(moderna.graphFilter.companyTicker).toBe('MRNA');
    expect(chat.calls).toHaveLength(0);

    const trial = await generateSqlQuery(chat, 'Find the KEYNOTE-942 clinical trial');
    expect(trial.sql).toMatch(/NCT03897881|mRNA-4157/i);
    expect(trial.graphFilter.entityTypes).toEqual(expect.arrayContaining(['clinical_trial']));
  });
});
