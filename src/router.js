import {
	AutoRouter,
	cors,
} from 'itty-router';
import { router as router3 } from './v3/router';
import { router as router4 } from './v4/router';
import { updateV3Client } from './v3/houston';
import {
	logErrors,
	logRequests,
	logResponses,
} from './logger';

const {
	preflight,
	corsify,
} = cors();

export const router = AutoRouter({
	before: [logRequests, preflight],
	catch: logErrors,
	finally: [logResponses, corsify],
});

router
	.get('/', () => Response.redirect('https://grafana.eartharoid.me/d/n5IceB34z/discord-tickets-h4?orgId=1', 302))
	// v1 (but without `/guild`)
	.post('/client', async req => await updateV3Client(req, true))
	// v2, client-only
	.post('/v2', async req => await updateV3Client(req, true))
	// v3, client-only
	.all('/api/v3/*', router3.fetch)
	// v4, client and guilds again
	.all('/api/v4/*', router4.fetch);