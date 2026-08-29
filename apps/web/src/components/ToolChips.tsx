"use client";

import { useState } from "react";

type Status = "running" | "done" | "failed";

type ToolCall = {
  id: string;
  name: string;
  label: string;
  status: Status;
  duration: string;
  input: string;
  output: string;
};

const calls: ToolCall[] = [
  {
    id: "search",
    name: "web.search",
    label: "Web search",
    status: "done",
    duration: "1.4s",
    input: '{ "q": "eu battery recycling quota 2027" }',
    output: "9 results · top domains: europa.eu, reuters.com",
  },
  {
    id: "read",
    name: "fs.readFile",
    label: "Read file",
    status: "done",
    duration: "0.1s",
    input: '{ "path": "notes/supply-chain.md" }',
    output: "4.2 KB · 118 lines read into context",
  },
  {
    id: "query",
    name: "db.query",
    label: "Run query",
    status: "running",
    duration: "6.8s",
    input: "select region, sum(units) from shipments …",
    output: "Streaming rows — 2 of 5 partitions scanned",
  },
  {
    id: "chart",
    name: "chart.render",
    label: "Render chart",
    status: "failed",
    duration: "0.9s",
    input: '{ "type": "stacked-bar", "series": "units" }',
    output: "Error: series `units` not present in result set",
  },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "running") {
    return (
      <svg viewBox="0 0 16 16" className="size-3.5 animate-spin text-accent" aria-hidden="true">
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.25"
        />
        <path
          d="M8 2a6 6 0 0 1 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg viewBox="0 0 16 16" className="size-3.5 text-red" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 5v3.5M8 10.6v.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-green" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.16" />
      <path
        d="M5.2 8.2 7.2 10.2 10.9 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const statusCopy: Record<Status, string> = {
  running: "Running",
  done: "Completed",
  failed: "Failed",
};

export function ToolChipsDemo() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = calls.find((c) => c.id === openId) ?? null;

  return (
    <div className="w-full max-w-lg">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
        4 tool calls this turn
      </p>

      <div className="flex flex-wrap gap-2">
        {calls.map((call) => {
          const isOpen = call.id === openId;
          return (
            <button
              key={call.id}
              type="button"
              onClick={() => setOpenId(isOpen ? null : call.id)}
              aria-expanded={isOpen}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors duration-200 ${
                isOpen
                  ? "border-accent/50 bg-accent-tint text-accent-ink"
                  : "border-line bg-field text-ink-muted hover:border-ink-faint/50 hover:text-ink"
              }`}
            >
              <StatusIcon status={call.status} />
              <span className="font-medium">{call.label}</span>
              <span className="font-mono text-[11px] text-ink-faint">
                {call.duration}
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-field">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
            <span className="font-mono text-[12px] text-ink">{open.name}</span>
            <span
              className={`font-mono text-[11px] ${
                open.status === "failed"
                  ? "text-red"
                  : open.status === "running"
                    ? "text-accent"
                    : "text-green"
              }`}
            >
              {statusCopy[open.status]}
            </span>
          </div>
          <div className="space-y-2.5 px-3.5 py-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Input
              </p>
              <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-ink-muted">
                {open.input}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Result
              </p>
              <p
                className={`mt-1 break-words text-[12.5px] leading-relaxed ${
                  open.status === "failed" ? "text-red" : "text-ink"
                }`}
              >
                {open.output}
              </p>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <p className="mt-3 text-[12.5px] text-ink-faint">
          Select a chip to inspect its input and result.
        </p>
      )}
    </div>
  );
}
