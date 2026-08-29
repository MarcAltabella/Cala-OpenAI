import { enqueueRun } from '@cala/worker';
import { app } from './app.js';
import { setEnqueueRun } from './routes/runs.js';

// Bridge POST /runs to the worker pipeline at server startup.
setEnqueueRun(enqueueRun);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`api listening on ${port}`));
