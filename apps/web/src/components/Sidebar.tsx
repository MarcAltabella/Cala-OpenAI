import { useState } from 'react';
import { Building2, FileText, Network, Plus, Search, Settings, X } from 'lucide-react';

const recentAnalyses = [
  { label: 'Moderna vaccine momentum', companyId: 'moderna' },
  { label: 'Pfizer clinical trial signals', companyId: 'pfizer' },
  { label: 'Eli Lilly oncology market scan', companyId: 'eli-lilly' },
  { label: 'Johnson & Johnson regulatory updates', companyId: 'jnj' },
];

export function Sidebar({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const recent = recentAnalyses.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const go = (next: string) => onNavigate(next);
  return <aside className="predict-sidebar" aria-label="Workspace navigation"><div className="predict-sidebar-inner"><div className="predict-workspace"><div className="predict-workspace-button" aria-label="Predict workspace"><span className="predict-sidebar-copy">Predict</span></div></div><div className="predict-sidebar-actions"><button className="predict-sidebar-row" onClick={() => go('/')} title="New analysis"><span><Plus size={17} /></span><b className="predict-sidebar-copy">New analysis</b></button><button className={`predict-sidebar-row ${!path.startsWith('/knowledge-graph') && !path.startsWith('/companies/') ? 'is-active' : ''}`} onClick={() => go('/')} title="Companies"><span><Building2 size={17} /></span><b className="predict-sidebar-copy">Companies</b></button><button className={`predict-sidebar-row ${path.startsWith('/knowledge-graph') ? 'is-active' : ''}`} onClick={() => go('/knowledge-graph')} title="Knowledge graph"><span><Network size={17} /></span><b className="predict-sidebar-copy">Knowledge graph</b></button></div><div className="predict-recents"><div className="predict-recents-head"><span className="predict-sidebar-copy">Recent analyses</span><button onClick={() => setSearchOpen((open) => !open)} aria-label="Search analyses">{searchOpen ? <X size={15} /> : <Search size={15} />}</button></div>{searchOpen && <div className="predict-recents-search"><Search size={14} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search analyses" /></div>}<div className="predict-recent-list">{recent.map((item) => <button key={item.companyId} className="predict-recent-row" title={item.label} onClick={() => go(`/companies/${item.companyId}`)}><FileText size={14} /><span className="predict-sidebar-copy">{item.label}</span></button>)}{query && recent.length === 0 && <span className="predict-empty predict-sidebar-copy">No analyses found</span>}</div></div><div className="predict-sidebar-footer"><button className="predict-sidebar-row" title="Settings"><span><Settings size={17} /></span><b className="predict-sidebar-copy">Settings</b></button></div></div></aside>;
}
