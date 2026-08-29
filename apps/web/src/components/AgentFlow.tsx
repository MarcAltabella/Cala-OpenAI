import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
type AgentNodeData = { id: string; title: string; summary: string; amount: string; status: StepStatus };
type ToolNodeData = { label: string; status: StepStatus };
type AgentNode = Node<AgentNodeData, 'agent'>;
type ToolNode = Node<ToolNodeData, 'tool'>;
type FlowNode = AgentNode | ToolNode;

const COL_WIDTH = 300;
const PROCESS_Y = 110;
const TOOLS_Y = 250;
const TOOL_ROW_HEIGHT = 44;

const PROCESS = [
  {
    id: 'sources',
    title: 'Agent scraping website',
    summary: 'Public research sources fan out',
    amount: '4 tools',
    tools: ['PubMed', 'ClinicalTrials.gov', 'IR / RSS news', 'Web news'],
  },
  {
    id: 'cala',
    title: 'Cala response',
    summary: 'Healthcare intelligence retrieved',
    amount: '3 tools',
    tools: ['Cala healthcare query', 'Entity extraction', 'Source snapshot'],
  },
  {
    id: 'health',
    title: 'Healthcare updates',
    summary: 'Relations and relevance evaluated',
    amount: '3 tools',
    tools: ['Build relation pack', 'Healthcare gate', 'New signal check'],
  },
  {
    id: 'finance',
    title: 'Financial output',
    summary: 'Impact assessment and report',
    amount: '3 tools',
    tools: ['Cala finance query', 'Financial impact', 'Watch-list recommendation'],
  },
] as const;

const DEMO_DELAYS_MS = [700, 1400, 1400, 1400, 1200] as const;

function CalaMark() {
  return (
    <svg className="agent-flow-cala-mark" viewBox="0 0 48 48" aria-label="Cala" role="img">
      <path d="M40 10C31 4 17 7 12 17c-4 8-1 17 6 21 7 4 17 2 22-4-8 3-16-1-17-8-1-7 6-13 17-16Z" fill="currentColor" />
    </svg>
  );
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

const ToolNodeCard = memo(({ data }: NodeProps<ToolNode>) => (
  <div className={`agent-flow-tool-node is-${data.status}`}>
    <span className="agent-flow-tool-dot" />
    <span className="agent-flow-tool-label">{data.label}</span>
    <b>{data.status === 'running' ? 'running' : data.status === 'failed' ? 'failed' : 'done'}</b>
  </div>
));

const nodeTypes = { agent: AgentNodeCard, tool: ToolNodeCard };

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

function buildFlowNodes(statuses: StepStatus[]): FlowNode[] {
  const nodes: FlowNode[] = PROCESS.map((item, index) => ({
    id: item.id,
    type: 'agent',
    position: { x: index * COL_WIDTH, y: PROCESS_Y },
    data: { ...item, status: statuses[index] },
  }));

  PROCESS.forEach((process, colIndex) => {
    if (statuses[colIndex] === 'pending') return;
    process.tools.forEach((tool, toolIndex) => {
      nodes.push({
        id: `${process.id}-${toolIndex}`,
        type: 'tool',
        position: { x: colIndex * COL_WIDTH, y: TOOLS_Y + toolIndex * TOOL_ROW_HEIGHT },
        data: { label: tool, status: statuses[colIndex] },
        selectable: false,
        draggable: false,
      });
    });
  });

  return nodes;
}

export function AgentFlow({ onViewResults }: { onViewResults?: () => void }) {
  const [tick, setTick] = useState(1);
  const [playing, setPlaying] = useState(true);
  const statuses = statusesForTick(tick);
  const running = playing && tick > 0 && tick <= PROCESS.length;
  const complete = tick > PROCESS.length;
  const nodes = useMemo(() => buildFlowNodes(statuses), [statuses]);

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
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={processEdges}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 28, y: 8, zoom: 1 }}
          fitView
          fitViewOptions={{ padding: 0.18, minZoom: 0.7, maxZoom: 1 }}
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
      {complete && (
        <button type="button" className="agent-flow-results" onClick={onViewResults}>
          View results <span>→</span>
        </button>
      )}
    </div>
  );
}
