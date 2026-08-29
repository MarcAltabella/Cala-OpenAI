const DAY_MS = 24 * 60 * 60 * 1000;

// Invoke `tick` once per interval. Returns a stop function. The timer is unref'd
// so it never keeps the process alive on its own.
export function startDailyScheduler(tick: () => void, intervalMs: number = DAY_MS): () => void {
  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return () => clearInterval(timer);
}
