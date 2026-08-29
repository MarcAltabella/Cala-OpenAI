import { useEffect, useState } from 'react';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyPage } from './pages/CompanyPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { Sidebar } from './components/Sidebar';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { document.title = 'predict'; const onPop = () => setPath(window.location.pathname); addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop); }, []);
  const companyMatch = path.match(/^\/companies\/([^/]+)/);
  const navigate = (next: string) => { history.pushState({}, '', next); setPath(next); };
  const graphRoute = path.startsWith('/knowledge-graph');
  return <div className="app-shell"><Sidebar path={path} onNavigate={navigate} /><main className={`main-content ${graphRoute ? 'graph-main-content' : ''}`}>{graphRoute ? <KnowledgeGraphPage /> : companyMatch ? <CompanyPage companyId={companyMatch[1]} onBack={() => navigate('/')} /> : <CompaniesPage onOpen={(id) => navigate(`/companies/${id}`)} />}</main></div>;
}
