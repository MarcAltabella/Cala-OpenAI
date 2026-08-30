import type { Company, HealthcareGate, RelationPack } from '@cala/contracts';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { CalaQueryResult } from './cala.js';
import { defaultDeps, type WorkflowDeps } from './deps.js';
import { buildRelationPack } from './relations.js';
import { runResearch } from './research.js';

export type WorkflowState = {
  runId: string;
  companyId: string;
  calaHealthcareSnapshotId: string | null;
  documentIds: string[];
  entityIds: string[];
  relationshipIds: string[];
  healthcareGate: HealthcareGate | null;
  calaFinanceSnapshotId: string | null;
  financeImpactId: string | null;
  errors: string[];
};

const lastValue = <T>(def: T) => Annotation<T>({ reducer: (_current, next) => next, default: () => def });
const concatList = <T>() => Annotation<T[]>({ reducer: (current, next) => current.concat(next), default: () => [] });

const StateAnnotation = Annotation.Root({
  runId: lastValue<string>(''),
  companyId: lastValue<string>(''),
  calaHealthcareSnapshotId: lastValue<string | null>(null),
  calaHealthcareResult: lastValue<CalaQueryResult | null>(null),
  documentIds: concatList<string>(),
  entityIds: concatList<string>(),
  relationshipIds: concatList<string>(),
  documentSummaries: concatList<string>(),
  errors: concatList<string>(),
  relationPack: lastValue<RelationPack | null>(null),
  healthcareGate: lastValue<HealthcareGate | null>(null),
  calaFinanceSnapshotId: lastValue<string | null>(null),
  financeImpactId: lastValue<string | null>(null),
});
type GraphState = typeof StateAnnotation.State;

function resolveDeps(partial?: Partial<WorkflowDeps>): WorkflowDeps {
  if (partial && partial.cala && partial.fastino && partial.repos && partial.graph && partial.tools) return partial as WorkflowDeps;
  return { ...defaultDeps(), ...partial };
}

// Build the LangGraph run graph. Cala healthcare and OpenAI research fan out in
// parallel; both join at the relation step; the Fastino healthcare gate decides
// whether to run the Cala finance + Fastino finance branch or stop.
function buildGraph(deps: WorkflowDeps, company: Company) {
  const setPhase = (runId: string, phase: Parameters<WorkflowDeps['repos']['runs']['update']>[1]['phase']) =>
    deps.repos.runs.update(runId, { phase });

  const calaHealthcareNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    await deps.onEvent?.({ runId: state.runId, phase: 'fanout', kind: 'tool_call', tool: 'cala_healthcare', summary: 'Querying Cala healthcare intelligence' });
    const result = await deps.cala.queryHealthcare(company);
    const snapshot = await deps.repos.calaSnapshots.insert({ runId: state.runId, companyId: company.id, kind: 'healthcare', input: result.input, entities: result.entities, results: result.results });
    await deps.onEvent?.({ runId: state.runId, phase: 'fanout', kind: 'tool_result', tool: 'cala_healthcare', summary: 'Cala healthcare intelligence received', output: { entities: result.entities.length, results: result.results.length } });
    return { calaHealthcareSnapshotId: snapshot.id, calaHealthcareResult: result };
  };

  const researchNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    const res = await runResearch({ company }, { tools: deps.tools, repos: deps.repos, graph: deps.graph, embeddings: deps.openai?.embeddings, onEvent: (event) => deps.onEvent?.({ ...event, runId: state.runId }) });
    return { documentIds: res.documentIds, entityIds: res.entityIds, relationshipIds: res.relationshipIds, documentSummaries: res.documentSummaries, errors: res.errors };
  };

  const relationsNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    await setPhase(state.runId, 'relations');
    await deps.onEvent?.({ runId: state.runId, phase: 'relations', kind: 'tool_call', tool: 'relation_pack', summary: 'Building relation pack' });
    const pack = await buildRelationPack(company, { graph: deps.graph, chat: deps.openai?.chat });
    await deps.onEvent?.({ runId: state.runId, phase: 'relations', kind: 'tool_result', tool: 'relation_pack', summary: 'Relation pack built', output: { nodes: pack.nodes.length, edges: pack.edges.length } });
    return { relationPack: pack };
  };

  const gateNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    await setPhase(state.runId, 'healthcare_gate');
    await deps.onEvent?.({ runId: state.runId, phase: 'healthcare_gate', kind: 'tool_call', tool: 'healthcare_gate', summary: 'Evaluating healthcare relevance' });
    const gate = await deps.fastino.healthcareGate({
      company,
      relationPack: state.relationPack ?? { companyId: company.id, brief: '', nodes: [], edges: [] },
      calaHealthcare: state.calaHealthcareResult ?? { input: '', entities: [], results: [] },
      documentSummaries: state.documentSummaries,
    });
    const persisted = await deps.repos.healthcareGates.insert({ ...gate, runId: state.runId, companyId: company.id });
    await deps.onEvent?.({ runId: state.runId, phase: 'healthcare_gate', kind: 'tool_result', tool: 'healthcare_gate', summary: 'Healthcare gate completed', output: { isNew: gate.isNew, isRelevant: gate.isRelevant, relevanceScore: gate.relevanceScore } });
    return { healthcareGate: persisted };
  };

  const financeNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    await setPhase(state.runId, 'finance');
    await deps.onEvent?.({ runId: state.runId, phase: 'finance', kind: 'tool_call', tool: 'cala_finance', summary: 'Querying Cala financial intelligence' });
    const finance = await deps.cala.queryFinance(company);
    const snapshot = await deps.repos.calaSnapshots.insert({ runId: state.runId, companyId: company.id, kind: 'finance', input: finance.input, entities: finance.entities, results: finance.results });
    await deps.onEvent?.({ runId: state.runId, phase: 'finance', kind: 'tool_result', tool: 'cala_finance', summary: 'Cala financial intelligence received', output: { entities: finance.entities.length, results: finance.results.length } });
    await deps.onEvent?.({ runId: state.runId, phase: 'finance', kind: 'tool_call', tool: 'finance_impact', summary: 'Assessing financial impact' });
    const impact = await deps.fastino.financeImpact({
      company,
      developmentSummary: state.healthcareGate?.developmentSummary ?? '',
      relationPack: state.relationPack ?? { companyId: company.id, brief: '', nodes: [], edges: [] },
      calaFinance: finance,
    });
    await deps.onEvent?.({ runId: state.runId, phase: 'finance', kind: 'tool_result', tool: 'finance_impact', summary: 'Financial impact assessed', output: { evidence: impact.evidenceIds.length } });
    const persisted = await deps.repos.financeImpacts.insert({ ...impact, runId: state.runId, companyId: company.id });
    await deps.repos.runs.update(state.runId, { phase: 'completed', status: 'completed', finishedAt: new Date().toISOString() });
    return { calaFinanceSnapshotId: snapshot.id, financeImpactId: persisted.id ?? null };
  };

  const stopNode = async (state: GraphState): Promise<Partial<GraphState>> => {
    await deps.repos.runs.update(state.runId, { phase: 'stopped', status: 'completed', finishedAt: new Date().toISOString() });
    return {};
  };

  const routeAfterGate = (state: GraphState): 'finance' | 'stop' =>
    state.healthcareGate?.isNew && state.healthcareGate?.isRelevant ? 'finance' : 'stop';

  return new StateGraph(StateAnnotation)
    .addNode('cala_healthcare', calaHealthcareNode)
    .addNode('research', researchNode)
    .addNode('relations', relationsNode)
    .addNode('gate', gateNode)
    .addNode('finance', financeNode)
    .addNode('stop', stopNode)
    .addEdge(START, 'cala_healthcare')
    .addEdge(START, 'research')
    .addEdge('cala_healthcare', 'relations')
    .addEdge('research', 'relations')
    .addEdge('relations', 'gate')
    .addConditionalEdges('gate', routeAfterGate, { finance: 'finance', stop: 'stop' })
    .addEdge('finance', END)
    .addEdge('stop', END)
    .compile();
}

export async function runIntelligenceWorkflow(runId: string, deps?: Partial<WorkflowDeps>): Promise<WorkflowState> {
  const resolved = resolveDeps(deps);
  const run = await resolved.repos.runs.get(runId);
  if (!run) throw new Error(`run ${runId} not found`);
  const companyId = run.companyId ?? '';
  const company = (await resolved.repos.companies.get(companyId)) ?? { id: companyId, name: companyId, ticker: null, displayOrder: 0, recency: 'high', createdAt: new Date().toISOString() };

  await resolved.repos.runs.update(runId, { status: 'running', phase: 'fanout', startedAt: new Date().toISOString() });

  try {
    const graph = buildGraph(resolved, company);
    const final = (await graph.invoke({ runId, companyId })) as GraphState;
    return {
      runId,
      companyId,
      calaHealthcareSnapshotId: final.calaHealthcareSnapshotId,
      documentIds: final.documentIds,
      entityIds: final.entityIds,
      relationshipIds: final.relationshipIds,
      healthcareGate: final.healthcareGate,
      calaFinanceSnapshotId: final.calaFinanceSnapshotId,
      financeImpactId: final.financeImpactId,
      errors: final.errors,
    };
  } catch (error) {
    await resolved.repos.runs.update(runId, { status: 'failed', phase: 'failed', error: error instanceof Error ? error.message : String(error), finishedAt: new Date().toISOString() });
    throw error;
  }
}
