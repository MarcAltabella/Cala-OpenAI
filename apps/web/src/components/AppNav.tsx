import {
  ChartIcon,
  LayersIcon,
  VirusIcon,
} from '@iconicicons/react';

type AppNavProps = {
  activePath?: string;
};

const navigation = [
  { href: '/companies', label: 'Companies', Icon: VirusIcon },
  { href: '/knowledge-graph', label: 'Knowledge graph', Icon: LayersIcon },
  { href: '/reports', label: 'Reports', Icon: ChartIcon },
];

export function AppNav({ activePath = '/companies' }: AppNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfcfa]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        <a
          aria-label="Cala market intelligence home"
          className="group flex shrink-0 items-center gap-2.5"
          href="/companies"
        >
          <span className="grid size-9 place-items-center rounded-md bg-[#153b33] text-sm font-black text-[#d8f25b] shadow-sm transition-transform group-hover:-rotate-3">
            C
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-slate-950 sm:block">
            CALA <span className="font-normal text-slate-500">market intelligence</span>
          </span>
        </a>

        <nav aria-label="Primary navigation" className="flex items-center gap-1">
          {navigation.map(({ href, label, Icon }) => {
            const isActive = activePath === href;

            return (
              <a
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#eaf2d5] text-[#153b33] shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                }`}
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-4" />
                <span className="hidden md:block">{label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
