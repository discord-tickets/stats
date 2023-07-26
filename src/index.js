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
import { router as v4 } from './v4';
import {
	db,
	getRealmUser,
	sum,
} from './utils';

const createSnapshot = async env => {
	console.log('Creating snapshot...');
	const $db = db({ $RealmUser: await getRealmUser(env) });
	const data = await $db.collection('clients').find();
	const guilds = data.reduce((acc, row) => acc + (typeof row.guilds === 'number' ? row.guilds : Object.keys(row.guilds).length), 0);
	const res1 = await fetch(`https://top.gg/api/bots/${env.TOPGG_ID}/stats`, {
		body: JSON.stringify({ server_count: guilds }),
		headers: {
			'Authorization': env.TOPGG_TOKEN,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});
	console.log('Top.gg:', res1.status, res1.statusText);
	const res2 = await $db.collection('snapshots').insertOne({
		activated_users: sum(data, 'activated_users'),
		avg_resolution_time: sum(data, 'avg_resolution_time') / data.length,
		avg_response_time: sum(data, 'avg_response_time') / data.length,
		categories: sum(data, 'categories'),
		clients: data.length,
		date: new Date(),
		guilds,
		members: sum(data, 'members'),
		messages: sum(data, 'messages'),
		tags: sum(data, 'tags'),
		tickets: sum(data, 'tickets'),
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
	.get('/', () => Response.redirect('https://grafana.eartharoid.me/goto/fqAqi2Xnz?orgId=1', 302))
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
		ctx.waitUntil(createSnapshot(env));
		// TODO: restore hourly cache filling
		// TODO: top.gg
		// TODO offload most to database
	},

};