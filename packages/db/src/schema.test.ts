import { describe, expect, it } from 'vitest';
import { sourceDocuments } from './schema.js';
import { insertSourceDocument, resetSourceDocuments } from './repositories/source-documents.js';
describe('database schema', () => { it('enforces one source document per provider identifier', () => { resetSourceDocuments(); insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'a' }); expect(() => insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'b' })).toThrow(); }); it('defines the source document table', () => expect(sourceDocuments).toBeDefined()); });
