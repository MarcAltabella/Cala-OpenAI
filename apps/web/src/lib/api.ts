export type Company = { id: string; name: string; ticker: string | null; displayOrder: number };
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type RunPhase = 'queued' | 'fanout' | 'relations' | 'healthcare_gate' | 'stopped' | 'finance' | 'completed' | 'failed';
export type Run = { id: string; companyId: string | null; mode: 'seed' | 'delta'; status: RunStatus; phase: RunPhase; startedAt: string | null; finishedAt: string | null; error: string | null; counts: Record<string, number> };
export type RunEvent = { id: string; runId?: string; phase: RunPhase; kind: 'phase' | 'tool_call' | 'tool_result' | 'error'; tool: string | null; summary: string | null; input?: Record<string, unknown>; output?: Record<string, unknown>; createdAt: string };
export type QueuedRun = { id: string; status: 'queued' };
export type GraphNode = { id: string; type: string; label: string; x: number; y: number };
export type GraphEdge = { id: string; source: string; target: string };

const companies: Company[] = [
  ['moderna', 'Moderna', 'MRNA'], ['pfizer', 'Pfizer', 'PFE'], ['eli-lilly', 'Eli Lilly', 'LLY'], ['jnj', 'Johnson & Johnson', 'JNJ'], ['roche', 'Roche', 'RHHBY'], ['abbvie', 'AbbVie', 'ABBV'], ['merck', 'Merck & Co.', 'MRK'], ['novartis', 'Novartis', 'NVS'], ['amgen', 'Amgen', 'AMGN'], ['sanofi', 'Sanofi', 'SNY']
].map(([id, name, ticker], displayOrder) => ({ id, name, ticker, displayOrder }));
const runs: Run[] = companies.map((c, i) => ({ id: `run-${c.id}`, companyId: c.id, mode: 'delta', status: i === 0 ? 'completed' : 'running', phase: i === 0 ? 'completed' : 'healthcare_gate', startedAt: null, finishedAt: null, error: null, counts: {} }));

const API_BASE_URL = (((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}`);
  return response.json() as Promise<T>;
}

export async function listCompanies() { try { const response = await fetch(apiUrl('/companies')); if (response.ok) return await response.json() as Company[]; } catch {} return companies; }
export async function listCompanyRuns(companyId: string) { try { const response = await fetch(apiUrl(`/companies/${companyId}/agent-runs`)); if (response.ok) return await response.json() as Run[]; } catch {} return runs.filter((r) => r.companyId === companyId).map((run) => ({ ...run, companyId: run.companyId } as Run)); }
export async function createAgentRun(companyId: string, mode: 'seed' | 'delta' = 'delta') { return requestJson<QueuedRun>('/runs', { method: 'POST', body: JSON.stringify({ companyId, mode }) }); }
export async function getRun(runId: string) { return requestJson<Run>(`/runs/${encodeURIComponent(runId)}`); }
export async function getRunEvents(runId: string) { return requestJson<RunEvent[]>(`/runs/${encodeURIComponent(runId)}/events`); }
export function graphData(query = '') { const nodes: GraphNode[] = [{ id: 'moderna', type: 'company', label: 'Moderna', x: 470, y: 220 }, { id: 'melanoma', type: 'therapy area', label: 'Melanoma vaccine', x: 220, y: 100 }, { id: 'paper', type: 'paper', label: 'mRNA-4157 paper', x: 220, y: 340 }, { id: 'trial', type: 'clinical trial', label: 'Phase 3 trial', x: 720, y: 100 }, { id: 'patent', type: 'patent', label: 'Cancer vaccine patent', x: 720, y: 340 }]; const filtered = query ? nodes.filter((n) => `${n.label} ${n.type}`.toLowerCase().includes(query.toLowerCase()) || n.id === 'moderna') : nodes; return { nodes: filtered, edges: [{ id: 'e1', source: 'moderna', target: 'melanoma' }, { id: 'e2', source: 'moderna', target: 'paper' }, { id: 'e3', source: 'moderna', target: 'trial' }, { id: 'e4', source: 'moderna', target: 'patent' }].filter((e) => filtered.some((n) => n.id === e.source) && filtered.some((n) => n.id === e.target)) }; }
