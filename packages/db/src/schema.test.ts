import { describe, expect, it } from 'vitest';
import { schemaStatements } from './schema.js';
import { insertSourceDocument, resetSourceDocuments } from './repositories/source-documents.js';
describe('database schema', () => { it('enforces one source document per provider identifier', () => { resetSourceDocuments(); insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'a' }); expect(() => insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'b' })).toThrow(); }); it('declares the database uniqueness constraint', () => expect(schemaStatements.join('\n')).toContain('UNIQUE(provider, provider_id)')); });
