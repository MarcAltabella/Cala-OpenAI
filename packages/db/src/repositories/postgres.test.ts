import { describe, expect, it } from 'vitest';
import { createPostgresRepositories } from './postgres.js';

const skip = !process.env.DATABASE_URL || Boolean(process.env.VITEST);

describe.skipIf(skip)('postgres repositories', () => {
  it('upserts a source document once per provider identifier', async () => {
    const repos = createPostgresRepositories();
    const providerId = `test-${Date.now()}`;
    const first = await repos.documents.upsert({ provider: 'pubmed', providerId, contentHash: 'a', normalizedText: 't' });
    const second = await repos.documents.upsert({ provider: 'pubmed', providerId, contentHash: 'a', normalizedText: 't' });
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
    expect(second.record.id).toBe(first.record.id);
  });
});
