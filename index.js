import joi from 'joi';
import md5 from 'md5';
import { createClient } from '@supabase/supabase-js';
import { Router } from 'itty-router';

const schema = joi.object({
	activated_users: joi.number().integer(),
	arch: joi.any().valid('arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64'),
	avg_response_time: joi.number(), // in minutes
	categories: joi.number().integer(),
	guilds: joi.number().integer(),
	id: joi.string().required(),
	members: joi.number().integer(),
	messages: joi.number().integer(),
	node: joi.string().pattern(/^v\d+\.\d+\.\d+$/),
	os: joi.any().valid('aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32'),
	tags: joi.number().integer(),
	tickets: joi.number().integer().required(),
	version: joi.string().pattern(/^\d+\.\d+\.\d+$/),
}).rename('client', 'id');

// eslint-disable-next-line no-undef
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

const isActive = lastSeen => (Date.now() - Date.parse(lastSeen)) / 1000 / 60 / 60 / 24 < 7;

const sum = (data, prop) => data.reduce((acc, row) => acc + row[prop], 0);

const transform = (data, prop) => {
	const counts = data.reduce(($, row) => (($[row[prop]] += 1) || ($[row[prop]] = 1), $), {});
	return Object.keys(counts)
		.map(i => ({
			count: counts[i],
			name: i,
		}))
		.sort((a, b) => b.count - a.count);
};

const updateClient = async (body, compatMode = false) => {
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) return new Response(validationError, { status: 400 });
	if (compatMode) value.id = md5(value.id);
	value.last_seen = new Date();
	const { error } = await supabase.from('stats:clients').upsert(value, { returning: 'minimal' });
	if (error) return new Response(JSON.stringify(error), { status: 500 });
	else return new Response('OK', { status: 200 });
};

const updateCache = async () => {
	const {
		data,
		error,
	} = await supabase.from('stats:clients').select(); // IMPORTANT: returns max 10,000 rows
	if (error) return new Response(JSON.stringify(error), { status: 500 });
	const activeClients = data.filter(row => isActive(row.last_seen));
	const stats = {
		activated_users: sum(data, 'activated_users'),
		arch: transform(activeClients, 'arch'),
		avg_response_time: sum(data, 'avg_response_time') / data.length,
		categories: sum(data, 'categories'),
		clients: {
			active: activeClients.length,
			total: data.length,
		},
		guilds: {
			active: sum(activeClients, 'guilds'),
			total: sum(data, 'guilds'),
		},
		members: sum(data, 'members'),
		messages: sum(data, 'messages'),
		node: transform(activeClients, 'node'),
		os: transform(activeClients, 'os'),
		tags: sum(data, 'tags'),
		tickets: sum(data, 'tickets'),
		version: transform(activeClients, 'version'),
	};
	// eslint-disable-next-line no-undef
	await CACHE.put('dt:stats', JSON.stringify(stats), { expirationTtl: 3660 }); // 61 min
	return stats;
};

const createSnapshot = async () => {
	const {
		data,
		error,
	} = await supabase.from('stats:clients').select(); // IMPORTANT: returns max 10,000 rows
	if (error) return new Response(JSON.stringify(error), { status: 500 });
	const stats = {
		activated_users: sum(data, 'activated_users'),
		avg_response_time: sum(data, 'avg_response_time') / data.length,
		categories: sum(data, 'categories'),
		clients: data.length,
		date: new Date(),
		guilds: sum(data, 'guilds'),
		members: sum(data, 'members'),
		messages: sum(data, 'messages'),
		tags: sum(data, 'tags'),
		tickets: sum(data, 'tickets'),
	};
	return await supabase.from('stats:snapshots').insert(stats);
};

const router = Router();

router.get('/', () => Response.redirect('https://grafana.eartharoid.me/goto/fqAqi2Xnz?orgId=1', 302));

router.post('/client', async request => await updateClient(request.query, true));

router.get('/api/v3/current', async () => {
	// eslint-disable-next-line no-undef
	let stats = await CACHE.get('dt:stats', { type: 'json' });
	if (!stats) stats = await updateCache();
	return new Response(JSON.stringify(stats), { headers: { 'content-type': 'application/json' } });
});

router.get('/api/v3/history', async request => {
	const days = request.query.days || 30;
	const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10); // yyyy-mm-dd
	const {
		data,
		error,
	} = await supabase.from('stats:snapshots').select('*').gte('date', date); // .order('date', { ascending: false })
	if (error) return new Response(JSON.stringify(error), { status: 500 });
	else return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
});

router.post('/api/v3/houston', async request => await updateClient(await request.json(), false));

router.post('/v2', async request => await updateClient(await request.json(), true));

router.all('*', () => new Response('Not Found', { status: 404 }));

addEventListener('fetch', event => event.respondWith(router.handle(event.request)));

addEventListener('scheduled', event => event.waitUntil(async () => {
	if (event.cron === '0 * * * *') await updateCache();  // every hour: update cache
	else if (event.cron === '0 0 * * *') await createSnapshot();  // every day: create a snapshot
}));
