import type { Company, RelationPack } from '@cala/contracts';
import type { GraphProjector } from '@cala/graph';
import type { ChatModel } from './models.js';

export type RelationDeps = {
  graph: GraphProjector;
  chat?: ChatModel;
};

// Deterministic one-line brief so the pack is useful without an LLM.
function deterministicBrief(company: Company, edgeCount: number, kinds: string[]): string {
  const kindList = kinds.length > 0 ? kinds.join(', ') : 'no linked entities';
  return `${company.name}: ${edgeCount} relationship(s) across ${kindList}.`;
}

// Build the compact graph neighborhood + brief passed to the healthcare/finance
// models. Uses the graph read model projected during the research step.
export async function buildRelationPack(company: Company, deps: RelationDeps): Promise<RelationPack> {
  const { nodes, edges } = await deps.graph.neighborhood({ companyId: company.id });
  const kinds = [...new Set(nodes.filter((n) => n.entityType !== 'company').map((n) => n.entityType))];
  let brief = deterministicBrief(company, edges.length, kinds);
  if (deps.chat) {
    const user = [
      `Company: ${company.name}`,
      `Nodes: ${nodes.map((n) => `${n.entityType}:${n.label}`).slice(0, 40).join('; ')}`,
      `Edges: ${edges.map((e) => e.relationshipType).slice(0, 40).join(', ')}`,
      'Write one sentence summarizing the company\'s recent healthcare research momentum.',
    ].join('\n');
    const summary = (await deps.chat.complete({ user, temperature: 0.2 })).trim();
    if (summary) brief = summary;
  }
  return { companyId: company.id, brief, nodes, edges };
}
