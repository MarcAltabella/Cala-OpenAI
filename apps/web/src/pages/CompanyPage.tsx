import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listCompanies, type Company } from '../lib/api';
import { RecommendationCard } from '../components/RecommendationCard';
import { ContextCards } from '../components/ContextCards';
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
        <AgentFlow onViewResults={() => setTab('outputs')} />
      </TabsContent>
      <TabsContent value="outputs" className="output-document">
        <h2>{company.name} development report</h2>
        <p>A new development was detected in the company’s research and clinical footprint. The evidence trail indicates meaningful progress with potential downstream financial relevance.</p>
        <h3>Healthcare evaluation</h3>
        <p>The phase 3 melanoma vaccine signal is supported by recent trial activity and publication evidence. The linked records suggest continued momentum in Moderna’s oncology pipeline.</p>
        <h3>Financial evaluation</h3>
        <p>The development creates a meaningful monitoring event for investors tracking clinical readouts, regulatory milestones, and potential pipeline value.</p>
        <h3>Evidence summary</h3>
        <p>Publications, clinical trials, regulatory filings, and company news were cross-checked and linked to the knowledge graph.</p>
        <ContextCards />
        <RecommendationCard />
      </TabsContent>
    </Tabs>
  </>;
}
