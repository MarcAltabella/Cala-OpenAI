import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listCompanies, type Company } from '../lib/api';
import { AgentFlow } from '../components/AgentFlow';

export function CompanyPage({ companyId, onBack }: { companyId: string; onBack: () => void }) {
  const [company, setCompany] = useState<Company>();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('runs');

  useEffect(() => {
    setError(null);
    listCompanies()
      .then((all) => {
        const match = all.find((item) => item.id === companyId);
        if (!match) throw new Error(`Company ${companyId} not found in Postgres`);
        setCompany(match);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load company'));
  }, [companyId]);

  if (error) return <p>Could not load from Postgres: {error}</p>;
  if (!company) return <p>Loading company…</p>;

  return <>
    <div className="company-back"><Button variant="outline" size="sm" className="company-back-button" onClick={onBack}><ArrowLeft data-icon="inline-start" /> Companies</Button></div>
    <header className="page-header company-page-header"><div><h1>{company.name}</h1><p>{company.ticker} · company intelligence workspace</p></div></header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList><TabsTrigger value="runs">Agent runs</TabsTrigger><TabsTrigger value="outputs">Outputs</TabsTrigger></TabsList>
      <TabsContent value="runs" className="runs-flow-panel" keepMounted>
        <AgentFlow companyId={company.id} onViewResults={() => setTab('outputs')} />
      </TabsContent>
      <TabsContent value="outputs" className="output-document">
        <h2>{company.name} development report</h2>
        <p>Reports are generated from completed agent runs and persisted evidence. Run the agents to generate a report for this company.</p>
      </TabsContent>
    </Tabs>
  </>;
}
