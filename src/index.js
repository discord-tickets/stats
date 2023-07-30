import {
	createCors,
	error,
	json,
	Router,
} from 'itty-router';
import {
	router as v3,
	updateClient,
} from './v3';
import {
	updateCache,
	router as v4,
} from './v4';
import {
	db,
	getRealmUser,
} from './utils';

const createSnapshot = async env => {
	// TODO: $merge or $out aggregation
	console.log('Creating snapshot...');
	const $db = db({ $RealmUser: await getRealmUser(env) });
	const stats = JSON.parse(await env.CACHE.get('dt:stats/v4'));
	const res1 = await fetch(`https://top.gg/api/bots/${env.PUBLIC_BOT_ID}/stats`, {
		body: JSON.stringify({ server_count: stats.combined.active.guilds.count }),
		headers: {
			'Authorization': env.TOPGG_TOKEN,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});
	console.log('Top.gg:', res1.status, res1.statusText);
	const res2 = await $db.collection('snapshots').insertOne({
		date: new Date(),
		...stats.combined.total,
	});
	console.log('DB:', res2);
	return res2;
};

const {
	preflight,
	corsify,
} = createCors({
	methods: ['GET', 'POST'],
	origins: ['*'],
});

const router = Router();

router
	.all('*', preflight)
	.get('/', () => Response.redirect('https://grafana.eartharoid.me/d/n5IceB34z/discord-tickets-h4?orgId=1', 302))
	// v1 (but without `/guild`)
	.post('/client', async req => await updateClient(req.query, true))
	// v2, client-only
	.post('/v2', async req => await updateClient(req, true))
	// v3, client-only
	.all('/api/v3/*', v3.handle)
	// v4, client and guilds again
	.all('/api/v4/*', v4.handle)
	.all('*', () => error(404));

export default {
	async fetch(req, env, ctx) {
		req.$RealmUser = await getRealmUser(env);
		return router
			.handle(req, env, ctx)
			.then(json)
			.catch(error)
			.then(corsify);
	},
	async scheduled(event, env, ctx) {
		if (event.cron === '0 * * * *') ctx.waitUntil(updateCache(env));
		if (event.cron === '0 0 * * *') ctx.waitUntil(createSnapshot(env));
	},

};