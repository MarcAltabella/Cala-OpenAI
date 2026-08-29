export type Company = { id: string; name: string; ticker: string | null; displayOrder: number; recency?: 'mid' | 'high' };
export type Run = { id: string; companyId: string; status: 'completed' | 'running' | 'failed'; phase: string; healthcare: string; finance: string; updatedAt: string };
export type RunEvent = { id: string; kind: 'phase' | 'tool_call' | 'tool_result' | 'error'; toolName?: string; summary: string; output?: string; createdAt: string };
export type GraphEntity = { id: string; entityType: string; label: string; sourceId: string | null };
export type GraphRelationship = { id: string; fromEntityId: string; toEntityId: string; relationshipType: string; evidenceDocumentId: string | null };
export type GraphNeighborhood = { nodes: GraphEntity[]; edges: GraphRelationship[] };
export type GraphDocument = { id: string; provider: string; providerId: string; url: string | null; publishedAt: string | null; excerpt: string };
export type GraphEntityDetail = {
  entity: GraphEntity & { externalId: string | null; properties: Record<string, unknown> };
  company: Company | null;
  document: GraphDocument | null;
  relationships: Array<GraphRelationship & { evidenceUrl: string | null; confidence: number }>;
  evidence: GraphDocument[];
};
export type ServiceHealth = { status: 'ok' | 'degraded'; postgres: 'connected' | 'unavailable'; neo4j: 'connected' | 'unavailable' };

const companies: Company[] = [
  ['moderna', 'Moderna', 'MRNA'], ['pfizer', 'Pfizer', 'PFE'], ['eli-lilly', 'Eli Lilly', 'LLY'], ['jnj', 'Johnson & Johnson', 'JNJ'], ['roche', 'Roche', 'RHHBY'], ['abbvie', 'AbbVie', 'ABBV'], ['merck', 'Merck & Co.', 'MRK'], ['novartis', 'Novartis', 'NVS'], ['amgen', 'Amgen', 'AMGN'], ['sanofi', 'Sanofi', 'SNY']
].map(([id, name, ticker], displayOrder) => ({ id, name, ticker, displayOrder, recency: displayOrder % 2 === 0 ? 'high' : 'mid' }));
const runs: Run[] = companies.map((c, i) => ({ id: `run-${c.id}`, companyId: c.id, status: i === 0 ? 'completed' : 'running', phase: i === 0 ? 'completed' : 'healthcare_gate', healthcare: i % 3 === 0 ? 'Positive' : 'Neutral', finance: i % 3 === 0 ? 'High' : 'Medium', updatedAt: 'May 12, 2025 9:41 AM' }));
const events: RunEvent[] = ['search_news', 'search_clinical_trials', 'search_fda', 'search_pubmed'].map((toolName, i) => ({ id: toolName, kind: 'tool_result', toolName, summary: 'Results retrieved', output: 'Source records normalized and linked to the company graph.', createdAt: `09:4${i}:2${i} AM` }));

export async function listCompanies() { try { const response = await fetch('/companies'); if (response.ok) return await response.json() as Company[]; } catch {} return companies; }
export async function listCompanyRuns(companyId: string) { try { const response = await fetch(`/companies/${companyId}/agent-runs`); if (response.ok) return await response.json() as Run[]; } catch {} return runs.filter((r) => r.companyId === companyId); }
export async function getRunEvents(runId: string) { try { const response = await fetch(`/runs/${runId}/events`); if (response.ok) return await response.json() as RunEvent[]; } catch {} return events; }

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getKnowledgeGraph(filters: {
  companyId?: string;
  nodeId?: string;
  entityTypes?: string[];
  relationshipTypes?: string[];
  query?: string;
  limit?: number;
}): Promise<GraphNeighborhood> {
  const params = new URLSearchParams();
  if (filters.companyId) params.set('companyId', filters.companyId);
  if (filters.nodeId) params.set('nodeId', filters.nodeId);
  if (filters.entityTypes?.length) params.set('entityTypes', filters.entityTypes.join(','));
  if (filters.relationshipTypes?.length) params.set('relationshipTypes', filters.relationshipTypes.join(','));
  if (filters.query) params.set('query', filters.query);
  if (filters.limit) params.set('limit', String(filters.limit));
  return json<GraphNeighborhood>(`/knowledge-graph?${params}`);
}

export const getGraphEntityDetail = (id: string) => json<GraphEntityDetail>(`/knowledge-graph/entities/${encodeURIComponent(id)}`);
export const getServiceHealth = () => json<ServiceHealth>('/health');

export type GraphAskFilter = {
  allCompanies?: boolean;
  companyTicker?: string | null;
  companyName?: string | null;
  entityTypes?: string[];
  relationshipTypes?: string[];
  labelQuery?: string | null;
};

export type GraphSqlResult = {
  question: string;
  sql: string;
  explanation: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  graphFilter?: GraphAskFilter;
};

export async function askGraphSql(question: string): Promise<GraphSqlResult> {
  const response = await fetch('/knowledge-graph/sql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const payload = await response.json().catch(() => null) as (GraphSqlResult & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? `SQL agent failed (${response.status})`);
  return payload as GraphSqlResult;
}
