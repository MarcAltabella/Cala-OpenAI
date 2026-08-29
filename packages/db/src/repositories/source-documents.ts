import type { SourceDocument } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const documents = new Map<string, SourceDocument>();
export function insertSourceDocument(input: Pick<SourceDocument, 'provider' | 'providerId' | 'contentHash'> & Partial<SourceDocument>): SourceDocument {
  const key = `${input.provider}:${input.providerId}`;
  if (documents.has(key)) throw new Error('duplicate source document provider identifier');
  const document: SourceDocument = { id: randomUUID(), companyId: input.companyId ?? null, provider: input.provider, providerId: input.providerId, url: input.url ?? null, publishedAt: input.publishedAt ?? null, rawPayload: input.rawPayload ?? {}, normalizedText: input.normalizedText ?? '', contentHash: input.contentHash, createdAt: new Date().toISOString() };
  documents.set(key, document); return document;
}
export function listSourceDocuments(companyId: string): SourceDocument[] { return [...documents.values()].filter(document => document.companyId === companyId).sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt)); }
export function resetSourceDocuments(): void { documents.clear(); }
