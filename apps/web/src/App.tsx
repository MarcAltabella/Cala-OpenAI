import { VirusIcon } from '@iconicicons/react';
import { AppNav } from './components/AppNav';
import { CompaniesPage } from './pages/CompaniesPage';

export function App() {
  return (
    <div className="min-h-screen bg-[#fbfcfa]">
      <AppNav />
      <CompaniesPage />
      <button
        className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-md bg-[#153b33] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#214b41] focus:outline-none focus:ring-2 focus:ring-[#4d8170] focus:ring-offset-2"
        type="button"
      >
        <VirusIcon aria-hidden="true" className="size-4" />
        Run now
      </button>
    </div>
  );
}
