import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { listCompanies, type Company } from '../lib/api';

export function CompaniesPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'recency'>('name');
  useEffect(() => {
    listCompanies()
      .then((rows) => { setCompanies(rows); setError(null); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load companies from Postgres'));
  }, []);
  const rows = useMemo(() => companies
    .filter((company) => `${company.name} ${company.ticker ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b.recency ?? '').localeCompare(a.recency ?? '') || a.name.localeCompare(b.name)), [companies, query, sort]);

  if (error) return <div className="records-page"><p>Could not load companies from Postgres: {error}</p></div>;

  return (
    <div className="records-page">
      <header className="page-header records-page-header">
        <div>
          <h1>Companies</h1>
          <p>Healthcare companies and the latest signals worth tracking.</p>
        </div>
      </header>
      <div className="records-toolbar">
        <label className="records-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies, categories, developments…" />
        </label>
        <button className="records-sort" onClick={() => setSort((value) => value === 'name' ? 'recency' : 'name')}>
          <ArrowUpDown size={15} /> Sort: {sort === 'name' ? 'Company' : 'Recency'}
        </button>
      </div>
      <div className="records-table-shell">
        <table className="records-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Ticker</th>
              <th>Recency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.id} onClick={() => onOpen(company.id)}>
                <td>
                  <span className="company-initial">{company.name.slice(0, 1)}</span>
                  <span className="records-company-name">{company.name}</span>
                  <small>{company.ticker}</small>
                </td>
                <td>{company.ticker ?? '—'}</td>
                <td><span className={`recency recency-${company.recency ?? 'mid'}`}>{company.recency === 'high' ? 'High' : 'Mid'}</span></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                {rows.length} companies
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
