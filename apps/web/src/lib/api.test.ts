import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentRun, getRun, getRunEvents } from './api';

describe('agent run API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates a delta run for a company', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'run-1', status: 'queued' }), { status: 202 }),
    );

    await expect(createAgentRun('moderna')).resolves.toEqual({ id: 'run-1', status: 'queued' });
    expect(fetchMock).toHaveBeenCalledWith('/runs', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ companyId: 'moderna', mode: 'delta' }),
    }));
  });

  it('retrieves a run and its ordered events', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'run-1', status: 'running', phase: 'research' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'event-1', phase: 'research', kind: 'tool_result', tool: 'pubmed', summary: 'Retrieved records' }]), { status: 200 }));

    await expect(getRun('run-1')).resolves.toMatchObject({ id: 'run-1', status: 'running' });
    await expect(getRunEvents('run-1')).resolves.toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/runs/run-1', '/runs/run-1/events']);
  });
});
