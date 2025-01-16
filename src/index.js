/* global Bun */

import { router } from './router';
import { log } from './logger';

// FIXME: cron jobs
// if (event.cron === '0 * * * *') ctx.waitUntil(updateCache(env));
// if (event.cron === '0 0 * * *') ctx.waitUntil(createSnapshot(env));

const server = Bun.serve({
	idleTimeout: process.env.IDLE_TIMEOUT ?? 10,
	port: process.env.PORT ?? 8080,
	...router,
});

log.success('Listening on port %d', server.port);