import { Bot } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TaskRows, { type TaskRow } from './TaskRows';
import { createAgentRun, getRun, getRunEvents, listCompanyRuns, type Run, type RunEvent, type RunPhase } from '../lib/api';
import calaLogo from '../assets/cala-logo.png';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
type AgentNodeData = { id: string; title: string; summary: string; amount: string; status: StepStatus; rows: TaskRow[]; showTools: boolean };
type AgentNode = Node<AgentNodeData, 'agent'>;

const COL_WIDTH = 280;
const INPUT_X = -64;
const PROCESS_Y = 36;
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  sources: { x: INPUT_X, y: -50 },
  cala: { x: INPUT_X, y: 360 },
  health: { x: COL_WIDTH, y: 160 },
  'cala-finance': { x: COL_WIDTH * 2, y: 160 },
  impact: { x: COL_WIDTH * 3, y: 160 },
  output: { x: COL_WIDTH * 4, y: 160 },
};

const PROCESS = [
  {
    id: 'sources',
    title: 'Web research agent',
    summary: 'Public research sources',
    amount: '4 tools',
    tools: [
      { key: 'pubmed', label: 'PubMed', amount: 'papers', status: 'done' as const, details: [{ label: 'Fetched PubMed deltas', meta: 'ok' }, { label: 'Papers normalized', meta: 'done' }] },
      { key: 'index', label: 'ClinicalTrials.gov', amount: 'trials', status: 'running' as const, step: 2, details: [{ label: 'Fetched studies', meta: 'ok' }, { label: 'Trials linked', meta: '68%' }] },
      { key: 'news', label: 'IR / RSS news', amount: 'items', status: 'sequence' as const, step: 3, details: [{ label: 'IR / RSS items', meta: 'draft' }, { label: 'Headlines stored', meta: 'draft' }] },
      { key: 'web', label: 'Web news', amount: 'snippets', status: 'sequence' as const, step: 4, details: [{ label: 'Tavily snippets', meta: 'draft' }, { label: 'Web news stored', meta: 'draft' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'cala',
    title: 'Cala healthcare query',
    summary: 'Healthcare intelligence retrieved',
    amount: '1 tool',
    tools: [
      { key: 'cala-query', label: 'Cala healthcare query', amount: '1 call', status: 'done' as const, details: [{ label: 'Healthcare snapshot', meta: 'ok' }, { label: 'Entities returned', meta: 'done' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'health',
    title: 'Healthcare agent',
    summary: 'Healthcare signal analysis',
    amount: '2 tools',
    tools: [
      { key: 'relations', label: 'Build relationships', amount: 'tool', status: 'pending' as const, step: 1, details: [] },
      { key: 'index', label: 'Evaluate healthcare signal', amount: 'tool', status: 'pending' as const, step: 2, details: [] },
    ] satisfies TaskRow[],
  },
  {
    id: 'cala-finance',
    title: 'Cala finance query',
    summary: 'Financial intelligence retrieved',
    amount: '1 tool',
    tools: [
      { key: 'cala-finance', label: 'Cala finance query', amount: '1 call', status: 'pending' as const, step: 1, details: [{ label: 'Finance snapshot', meta: 'pending' }, { label: 'Entities returned', meta: 'pending' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'impact',
    title: 'Financial agent',
    summary: 'Financial impact analysis',
    amount: '1 tool',
    tools: [
      { key: 'index', label: 'Financial impact', amount: '1 score', status: 'pending' as const, step: 1, details: [{ label: 'Impact assessed', meta: 'pending' }, { label: 'Watch list draft', meta: 'pending' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'output',
    title: 'Financial output',
    summary: 'Report and references assembled',
    amount: 'report',
    tools: [
      { key: 'report', label: 'Report ready', amount: 'output', status: 'pending' as const, step: 1, details: [{ label: 'Report persisted', meta: 'pending' }, { label: 'References attached', meta: 'pending' }] },
    ] satisfies TaskRow[],
  },
] as const;

function CalaMark() {
  return <img className="agent-flow-cala-mark" src={calaLogo} alt="Cala" />;
}

const AgentNodeCard = memo(({ data }: NodeProps<AgentNode>) => (
  <div className="agent-flow-node-stack">
    <div className={`agent-flow-node is-${data.status}`}>
      <Handle type="target" position={Position.Left} className="agent-flow-handle" />
      <div className="agent-flow-trigger">
        <span className={`agent-flow-status ${data.id === 'cala' || data.id === 'cala-finance' ? 'is-cala' : ''}`}>
          {data.id === 'cala' || data.id === 'cala-finance' ? <CalaMark /> : <Bot size={17} aria-label="Agent" />}
        </span>
        <span className="agent-flow-copy">
          <strong>{data.title}</strong>
          <small>{data.summary}</small>
        </span>
        <span className="agent-flow-amount">{data.amount}</span>
      </div>
      <Handle type="source" position={Position.Right} className="agent-flow-handle" />
    </div>
    {data.showTools && <TaskRows variant="List" rows={data.rows} animate={false} className="agent-flow-task-rows" />}
  </div>
));

const nodeTypes = { agent: AgentNodeCard };

const processEdges = [
  ['sources', 'health'],
  ['cala', 'health'],
  ['health', 'cala-finance'],
  ['cala-finance', 'impact'],
  ['impact', 'output'],
].map(([source, target]) => ({
  id: `edge-${source}-${target}`,
  source,
  target,
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#b8c4ba', strokeWidth: 1.4, strokeDasharray: '4 6' },
}));

function statusesForPhase(phase: RunPhase | null): StepStatus[] {
  if (!phase || phase === 'queued') return PROCESS.map(() => 'pending');
  if (phase === 'failed') return PROCESS.map(() => 'failed');
  if (phase === 'completed') return PROCESS.map(() => 'completed');
  if (phase === 'stopped') return ['completed', 'completed', 'completed', 'pending', 'pending', 'pending'];
  if (phase === 'fanout') return ['running', 'running', 'pending', 'pending', 'pending', 'pending'];
  if (phase === 'relations' || phase === 'healthcare_gate') return ['completed', 'completed', 'running', 'pending', 'pending', 'pending'];
  if (phase === 'finance') return ['completed', 'completed', 'completed', 'running', 'pending', 'pending'];
  return ['completed', 'completed', 'completed', 'completed', 'running', 'pending'];
}

export function AgentFlow({ companyId, onViewResults }: { companyId: string; onViewResults?: () => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const statuses = statusesForPhase(run?.phase ?? null);
  const running = run?.status === 'queued' || run?.status === 'running';
  const complete = run?.status === 'completed';
  const statusById = Object.fromEntries(PROCESS.map((item, index) => [item.id, statuses[index]]));
  const backendTool = (processId: string, key: string) => ({
    sources: { pubmed: 'pubmed', index: 'clinicaltrials', news: 'news', web: 'web_news' },
    cala: { 'cala-query': 'cala_healthcare' },
    health: { relations: 'relation_pack', index: 'healthcare_gate' },
    'cala-finance': { 'cala-finance': 'cala_finance' },
    impact: { index: 'finance_impact' },
    output: { report: null },
  }[processId] as Record<string, string>)[key];
  const rowsFor = (process: typeof PROCESS[number]) => process.tools.map((tool) => {
    const name = backendTool(process.id, tool.key);
    const event = [...events].reverse().find((item) => item.tool === name);
    const status = process.id === 'output' && complete ? 'done' : event?.kind === 'tool_result' ? 'done' : event?.kind === 'error' ? 'failed' : event?.kind === 'tool_call' ? 'running' : 'pending';
    const summary = event?.tool === 'relation_pack' ? 'Healthcare context assembled' : event?.tool === 'healthcare_gate' ? 'Healthcare signal evaluated' : event?.summary;
    return { ...tool, details: event ? [{ label: summary ?? tool.label, meta: event.kind.replace('tool_', '') }] : [], status: status as TaskRow['status'] };
  });
  const edges = processEdges.map((edge) => {
    const completed = statusById[edge.target] === 'completed';
    const active = statusById[edge.source] === 'running' || statusById[edge.target] === 'running';
    return { ...edge, className: completed ? 'agent-flow-edge-completed' : 'agent-flow-edge-active', animated: running && active && !completed, style: { ...edge.style, stroke: completed ? '#4caf70' : '#b8c4ba' } };
  });

  const nodes = useMemo<AgentNode[]>(
    () => PROCESS.map((item, index) => ({
      id: item.id,
      type: 'agent',
      position: NODE_POSITIONS[item.id] ?? { x: index * COL_WIDTH, y: PROCESS_Y },
      data: { ...item, status: statuses[index], rows: rowsFor(item), showTools: Boolean(run) },
    })),
    [statuses, events, complete, run],
  );

  useEffect(() => {
    let active = true;
    listCompanyRuns(companyId).then(async (runs) => {
      const latest = runs[0];
      if (!latest || !active) return;
      const latestEvents = await getRunEvents(latest.id);
      if (active) { setRun(latest); setEvents(latestEvents); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [companyId]);

  useEffect(() => {
    if (!run || !running) return;
    const timer = setTimeout(() => {
      Promise.all([getRun(run.id), getRunEvents(run.id)]).then(([nextRun, nextEvents]) => { setRun(nextRun); setEvents(nextEvents); }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Run status unavailable'));
    }, 1000);
    return () => clearTimeout(timer);
  }, [run, running]);

  const startRun = async () => {
    setError(null);
    setRun(null);
    setEvents([]);
    try {
      const queued = await createAgentRun(companyId);
      const [nextRun, nextEvents] = await Promise.all([getRun(queued.id), getRunEvents(queued.id)]);
      setRun(nextRun);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start agent run');
    }
  };

  return (
    <div className="agent-flow">
      <div className="agent-flow-heading">
        <button type="button" className="agent-flow-run" onClick={startRun} disabled={running}>
          {running ? 'Running…' : complete ? 'Run again' : 'Run agent'}
        </button>
      </div>
      {(error || run?.error) && <p className="agent-flow-error">{error ?? run?.error}</p>}
      <div className="agent-flow-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.02, maxZoom: 1.2 }}
            minZoom={0.5}
            maxZoom={1.2}
            nodesDraggable={false}
            nodesConnectable={false}
            panOnDrag
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      {complete && (
        <button type="button" className="agent-flow-results" onClick={onViewResults}>
          View results <span>→</span>
        </button>
      )}
    </div>
  );
}
