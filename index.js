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

async function updateStats(request, compatMode = false) {
	const body = await request.json();
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) return new Response(validationError, { status: 400 });
	if (compatMode) value.id = md5(value.id);
	value.last_seen = new Date();
	const { error } = await supabase.from('stats:clients').upsert(value, { returning: 'minimal' });
	if (error) return new Response(error, { status: 500 });
	else return new Response('OK', { status: 200 });
}

const router = Router();

router.get('/', async request => {
	const {
		data,
		error,
	} = await supabase.from('stats:clients').select('guilds, members, tickets'); // IMPORTANT: returns max 10,000 rows

	if (error) return new Response(error, { status: 500 });

	const stats = {
		clients: data.length,
		guilds: data.reduce((acc, row) => acc + row.guilds, 0),
		members: data.reduce((acc, row) => acc + row.members, 0),
		tickets: data.reduce((acc, row) => acc + row.tickets, 0),
	};

	return new Response(JSON.stringify(stats), { headers: { 'content-type': 'application/json' } });
});

router.post('/client', async request => await updateStats(request, true));

router.get('/api/v3/current', async request => {
	const {
		data,
		error,
	} = await supabase.from('stats:clients').select();

	if (error) return new Response(error, { status: 500 });

	console.log(data)
	return new Response(data);
});

router.get('/api/v3/history');

router.post('/api/v3/houston', async request => await updateStats(request, false));

router.post('/v2', async request => await updateStats(request, true));


router.all('*', () => new Response('Not Found', { status: 404 }));

addEventListener('fetch', event => event.respondWith(router.handle(event.request)));

addEventListener('scheduled', event => event.waitUntil(async event => {
	// create a snapshot
}));
