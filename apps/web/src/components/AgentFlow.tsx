import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TaskRows, { type TaskRow } from './TaskRows';
import calaLogo from '../assets/cala-logo.png';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
type AgentNodeData = { id: string; title: string; summary: string; amount: string; status: StepStatus };
type AgentNode = Node<AgentNodeData, 'agent'>;

const COL_WIDTH = 300;
const PROCESS_Y = 36;

const PROCESS = [
  {
    id: 'sources',
    title: 'Agent scraping website',
    summary: 'Public research sources fan out',
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
    title: 'Cala response',
    summary: 'Healthcare intelligence retrieved',
    amount: '3 tools',
    tools: [
      { key: 'cala-query', label: 'Cala healthcare query', amount: '1 call', status: 'done' as const, details: [{ label: 'Healthcare snapshot', meta: 'ok' }, { label: 'Entities returned', meta: 'done' }] },
      { key: 'index', label: 'Entity extraction', amount: 'entities', status: 'running' as const, step: 2, details: [{ label: 'Companies and trials', meta: 'ok' }, { label: 'Graph upsert', meta: '68%' }] },
      { key: 'snapshot', label: 'Source snapshot', amount: '1 pack', status: 'sequence' as const, step: 3, details: [{ label: 'Documents stored', meta: 'draft' }, { label: 'Ready for relations', meta: 'draft' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'health',
    title: 'Healthcare updates',
    summary: 'Relations and relevance evaluated',
    amount: '3 tools',
    tools: [
      { key: 'relations', label: 'Build relation pack', amount: '1 pack', status: 'done' as const, details: [{ label: 'Nodes and edges', meta: 'ok' }, { label: 'Brief drafted', meta: 'done' }] },
      { key: 'index', label: 'Healthcare gate', amount: '1 score', status: 'running' as const, step: 2, details: [{ label: 'Fastino relevance', meta: 'ok' }, { label: 'Signal check', meta: '68%' }] },
      { key: 'signal', label: 'New signal check', amount: '1 gate', status: 'sequence' as const, step: 3, details: [{ label: 'isNew / isRelevant', meta: 'draft' }, { label: 'Route to finance', meta: 'draft' }] },
    ] satisfies TaskRow[],
  },
  {
    id: 'finance',
    title: 'Financial output',
    summary: 'Impact assessment and report',
    amount: '3 tools',
    tools: [
      { key: 'cala-finance', label: 'Cala finance query', amount: '1 call', status: 'done' as const, details: [{ label: 'Finance snapshot', meta: 'ok' }, { label: 'Entities returned', meta: 'done' }] },
      { key: 'index', label: 'Financial impact', amount: '1 score', status: 'running' as const, step: 2, details: [{ label: 'Impact assessed', meta: 'ok' }, { label: 'Watch list draft', meta: '68%' }] },
      { key: 'watch', label: 'Watch-list recommendation', amount: '1 rec', status: 'sequence' as const, step: 3, details: [{ label: 'Recommendation', meta: 'draft' }, { label: 'Report ready', meta: 'draft' }] },
    ] satisfies TaskRow[],
  },
] as const;

const DEMO_DELAYS_MS = [700, 1400, 1400, 1400, 1200] as const;

function CalaMark() {
  return <img className="agent-flow-cala-mark" src={calaLogo} alt="Cala" />;
}

const AgentNodeCard = memo(({ data }: NodeProps<AgentNode>) => (
  <div className={`agent-flow-node is-${data.status}`}>
    <Handle type="target" position={Position.Left} className="agent-flow-handle" />
    <div className="agent-flow-trigger">
      <span className={`agent-flow-status is-${data.status} ${data.id === 'cala' ? 'is-cala' : ''}`}>
        {data.id === 'cala' ? <CalaMark /> : data.status === 'completed' ? '✓' : data.status === 'running' ? '•' : '·'}
      </span>
      <span className="agent-flow-copy">
        <strong>{data.title}</strong>
        <small>{data.summary}</small>
      </span>
      <span className="agent-flow-amount">{data.status === 'completed' ? 'done' : data.amount}</span>
    </div>
    <Handle type="source" position={Position.Right} className="agent-flow-handle" />
  </div>
));

const nodeTypes = { agent: AgentNodeCard };

const processEdges = PROCESS.slice(0, -1).map((item, index) => ({
  id: `edge-${item.id}`,
  source: item.id,
  target: PROCESS[index + 1].id,
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#9fb2a4', strokeWidth: 1.8 },
}));

function statusesForTick(tick: number): StepStatus[] {
  if (tick <= 0) return PROCESS.map(() => 'pending');
  if (tick > PROCESS.length) return PROCESS.map(() => 'completed');
  return PROCESS.map((_, index) => {
    if (index < tick - 1) return 'completed';
    if (index === tick - 1) return 'running';
    return 'pending';
  });
}

export function AgentFlow({ onViewResults }: { onViewResults?: () => void }) {
  const [tick, setTick] = useState(1);
  const [playing, setPlaying] = useState(true);
  const statuses = statusesForTick(tick);
  const running = playing && tick > 0 && tick <= PROCESS.length;
  const complete = tick > PROCESS.length;

  const nodes = useMemo<AgentNode[]>(
    () => PROCESS.map((item, index) => ({
      id: item.id,
      type: 'agent',
      position: { x: index * COL_WIDTH, y: PROCESS_Y },
      data: { ...item, status: statuses[index] },
    })),
    [statuses],
  );

  useEffect(() => {
    if (!playing) return;
    if (tick > PROCESS.length) {
      setPlaying(false);
      return;
    }
    const delay = DEMO_DELAYS_MS[Math.min(tick, DEMO_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => setTick((value) => value + 1), delay);
    return () => clearTimeout(timer);
  }, [playing, tick]);

  return (
    <div className="agent-flow">
      <div className="agent-flow-heading">
        <button type="button" className="agent-flow-run" onClick={() => { setPlaying(true); setTick(1); }} disabled={running}>
          {running ? 'Running…' : complete ? 'Run again' : 'Run agent'}
        </button>
      </div>
      <div className="agent-flow-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={processEdges}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 28, y: 0, zoom: 1 }}
            minZoom={0.5}
            maxZoom={1.2}
            nodesDraggable={false}
            nodesConnectable={false}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div className="agent-flow-capsules">
        {PROCESS.map((process, index) => (
          <div className={`agent-flow-capsule-col is-${statuses[index]}`} key={process.id}>
            {statuses[index] !== 'pending' && (
              <TaskRows variant="Capsules" rows={[...process.tools]} className="agent-flow-task-rows" />
            )}
          </div>
        ))}
      </div>
      {complete && (
        <button type="button" className="agent-flow-results" onClick={onViewResults}>
          View results <span>→</span>
        </button>
      )}
    </div>
  );
}
