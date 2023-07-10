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
	db,
	getRealmUser,
	sum,
} from './utils';

const createSnapshot = async env => {
	console.log('Creating snapshot...');
	const $db = db({ $RealmUser: await getRealmUser(env) });
	const data = await $db.collection('clients').find();
	const res = await $db.collection('snapshots').insertOne({
		activated_users: sum(data, 'activated_users'),
		avg_resolution_time: sum(data, 'avg_resolution_time') / data.length,
		avg_response_time: sum(data, 'avg_response_time') / data.length,
		categories: sum(data, 'categories'),
		clients: data.length,
		date: new Date(),
		guilds: sum(data, 'guilds'),
		members: sum(data, 'members'),
		messages: sum(data, 'messages'),
		tags: sum(data, 'tags'),
		tickets: sum(data, 'tickets'),
	});
	console.log(res);
	return res;
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
	.post('/client', async req => await updateClient(req.query, true))
	.all('/api/v3/*', v3.handle)
	.post('/v2', async req => await updateClient(req, true))
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
	},

};