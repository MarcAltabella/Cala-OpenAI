import { and, desc, eq } from 'drizzle-orm';
import { db } from '../client.js';
import { agentRuns, calaSnapshots, financeImpacts, healthcareGates, sourceDocuments } from '../schema.js';

export async function getCompanyOutput(companyId: string) {
  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.companyId, companyId)).orderBy(desc(agentRuns.startedAt)).limit(1);
  if (!run) return null;
  const [gate, impact, snapshots, references] = await Promise.all([
    db.select().from(healthcareGates).where(eq(healthcareGates.runId, run.id)).orderBy(desc(healthcareGates.createdAt)).limit(1),
    db.select().from(financeImpacts).where(eq(financeImpacts.runId, run.id)).orderBy(desc(financeImpacts.createdAt)).limit(1),
    db.select().from(calaSnapshots).where(eq(calaSnapshots.runId, run.id)).orderBy(desc(calaSnapshots.createdAt)),
    db.select().from(sourceDocuments).where(and(eq(sourceDocuments.companyId, companyId))).orderBy(desc(sourceDocuments.publishedAt), desc(sourceDocuments.createdAt)).limit(50),
  ]);
  return {
    run,
    healthcareGate: gate[0] ?? null,
    financeImpact: impact[0] ?? null,
    snapshots,
    references: references.map((document) => ({
      id: document.id,
      provider: document.provider,
      providerId: document.providerId,
      url: document.url,
      publishedAt: document.publishedAt?.toISOString() ?? null,
      excerpt: document.normalizedText.slice(0, 420),
    })),
  };
}
