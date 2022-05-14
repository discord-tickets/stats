import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';
import joi from 'joi';
import md5 from 'md5';

const router = Router();
// eslint-disable-next-line no-undef
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

router.get('/');

router.post('/client');

router.get('/api/v3/current');

router.get('/api/v3/history');

router.post('/api/v3/houston', async request => {
	const body = await request.json();
	const schema = joi.object({
		activated_users: joi.number().integer(),
		arch: joi.string(),
		avg_response_time: joi.number(), // in minutes
		categories: joi.number().integer(),
		guilds: joi.number().integer().required(),
		id: joi.string().required(), // pre-hashed (md5)
		members: joi.number().integer().required(),
		messages: joi.number().integer(),
		node: joi.string(),
		os: joi.string(),
		tags: joi.number().integer(),
		tickets: joi.number().integer().required(),
		version: joi.string(),
	});
	const {
		error: validationError,
		value,
	} = schema.validate(body);

	if (validationError) return new Response(validationError, { status: 400 });

	value.last_seen = new Date();

	const { error } = await supabase.from('stats:clients').upsert(value, { returning: 'minimal' });

	if (error) return new Response(error, { status: 500 });
	else return new Response('OK', { status: 200 });
});

router.post('/v2', async request => {
	const body = await request.json();
	const schema = joi.object({
		client: joi.string().required(),
		guilds: joi.number().integer().required(),
		members: joi.number().integer().required(),
		tickets: joi.number().integer().required(),
		version: joi.string(),
	});
	const {
		error: validationError,
		value,
	} = schema.validate(body);

	if (validationError) return new Response(validationError, { status: 400 });

	value.id = md5(value.client);
	delete value.client;
	value.last_seen = new Date();

	const { error } = await supabase.from('stats:clients').upsert(value, { returning: 'minimal' });

	if (error) return new Response(error, { status: 500 });
	else return new Response('OK', { status: 200 });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

addEventListener('fetch', event => event.respondWith(router.handle(event.request)));

addEventListener('scheduled', event => event.waitUntil(async event => {
	// create a snapshot
}));
