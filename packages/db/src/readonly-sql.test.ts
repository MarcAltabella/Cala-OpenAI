import { describe, expect, it } from 'vitest';
import { assertReadOnlySelect } from './readonly-sql.js';

describe('assertReadOnlySelect', () => {
  it('allows select and with queries', () => {
    expect(assertReadOnlySelect('SELECT name FROM companies')).toBe('SELECT name FROM companies');
    expect(assertReadOnlySelect('WITH x AS (SELECT 1) SELECT * FROM x;')).toMatch(/^WITH /);
  });
});
