import { Router } from 'itty-router';
import { createClient } from '@supabase/supabase-js';
import joi from 'joi';

const router = Router();
// eslint-disable-next-line no-undef
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET);

router.get('/');

router.post('/client');

router.get('/api/v3/current');

router.get('/api/v3/history');

router.post('/api/v3/houston');


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
		error,
		value,
	} = schema.validate(body);

	if (error) return new Response(error, { status: 400 });

	return new Response('OK', { status: 200 });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

addEventListener('fetch', event => event.respondWith(router.handle(event.request)));

addEventListener('scheduled', event => event.waitUntil(async event => {
	// create a snapshot
}));
