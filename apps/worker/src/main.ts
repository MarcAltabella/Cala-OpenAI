import { enqueueRun, startDailyScheduler } from './index.js';

// Standalone worker entrypoint: schedules a daily delta sweep. Individual runs
// are normally triggered by the API's POST /runs route via enqueueRun.
const stop = startDailyScheduler(() => {
  console.log('daily scheduler tick');
});

process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});

export { enqueueRun };
