import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react';
import { createAgentRun, getRun, type Run, type RunPhase } from '../lib/api';
import calaLogo from '../assets/cala-logo.png';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
type AgentNodeData = { id: string; title: string; summary: string; status: StepStatus; cala?: boolean };
type AgentNode = Node<AgentNodeData, 'agent'>;
const PROCESS = [
  { id: 'research', title: 'Web research agent', summary: 'Research sources and documents' },
  { id: 'healthcare', title: 'Healthcare agent', summary: 'Relations and relevance evaluation' },
  { id: 'finance', title: 'Financial agent', summary: 'Financial impact analysis', cala: true },
  { id: 'output', title: 'Financial output', summary: 'Persisted report and references' },
] as const;
const PHASE_INDEX: Record<RunPhase, number> = { queued: 0, fanout: 0, relations: 1, healthcare_gate: 1, stopped: 1, finance: 2, completed: 3, failed: 3 };
function CalaMark() { return <img className="agent-flow-cala-mark" src={calaLogo} alt="Cala" />; }
const AgentNodeCard = memo(({ data }: NodeProps<AgentNode>) => <div className={`agent-flow-node is-${data.status}`}><Handle type="target" position={Position.Left} className="agent-flow-handle" /><div className="agent-flow-trigger"><span className={`agent-flow-status is-${data.status}`}>{data.cala ? <CalaMark /> : data.status === 'completed' ? '✓' : '•'}</span><span className="agent-flow-copy"><strong>{data.title}</strong><small>{data.summary}</small></span></div><Handle type="source" position={Position.Right} className="agent-flow-handle" /></div>);
const nodeTypes = { agent: AgentNodeCard };
function statusFor(index: number, run: Run | null): StepStatus { if (!run) return 'pending'; if (run.status === 'failed' && index === PHASE_INDEX[run.phase]) return 'failed'; if (run.status === 'completed' || run.phase === 'stopped') return index <= PHASE_INDEX[run.phase] ? 'completed' : 'pending'; const active = PHASE_INDEX[run.phase]; return index < active ? 'completed' : index === active ? 'running' : 'pending'; }

export function AgentFlow({ companyId, onViewResults }: { companyId: string; onViewResults?: () => void }) {
  const [run, setRun] = useState<Run | null>(null); const [error, setError] = useState<string | null>(null); const [starting, setStarting] = useState(false);
  const refresh = async (runId: string) => { const next = await getRun(runId); setRun(next); return next; };
  useEffect(() => { if (!run || (run.status !== 'queued' && run.status !== 'running')) return; const timer = window.setInterval(() => { void refresh(run.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Failed to load run')); }, 1000); return () => window.clearInterval(timer); }, [run]);
  const start = async () => { setStarting(true); setError(null); try { const queued = await createAgentRun(companyId); await refresh(queued.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Failed to start run'); } finally { setStarting(false); } };
  const nodes = useMemo<AgentNode[]>(() => PROCESS.map((item, index) => ({ id: item.id, type: 'agent', position: { x: index * 320, y: 120 }, data: { ...item, status: statusFor(index, run) } })), [run]);
  const active = run?.status === 'queued' || run?.status === 'running';
  const edges = PROCESS.slice(0, -1).map((item, index) => ({ id: `edge-${item.id}`, source: item.id, target: PROCESS[index + 1].id, type: 'smoothstep', animated: Boolean(active && statusFor(index + 1, run) === 'running'), style: { stroke: statusFor(index + 1, run) === 'completed' ? '#20a35a' : '#9fb2a4', strokeWidth: 1.8 } }));
  return <div className="agent-flow"><div className="agent-flow-heading"><button type="button" className="agent-flow-run" onClick={start} disabled={starting || active}>{active ? 'Running…' : 'Run agent'}</button></div><div className="agent-flow-canvas"><ReactFlowProvider><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={{ x: 28, y: 0, zoom: 1 }} minZoom={0.5} maxZoom={1.2} nodesDraggable={false} nodesConnectable={false} panOnDrag panOnScroll zoomOnScroll={false} proOptions={{ hideAttribution: true }} style={{ width: '100%', height: '100%' }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" /></ReactFlow></ReactFlowProvider></div>{error && <p className="agent-flow-error">{error}</p>}{run?.status === 'completed' && <button type="button" className="agent-flow-results" onClick={onViewResults}>View results <span>→</span></button>}</div>;
}
