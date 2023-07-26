import {
	Router,
	error,
} from 'itty-router';
import joi from 'joi';
import md5 from 'md5';
import {
	db,
	isActive,
	transform,
	sum,
} from './utils';

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const schema = joi
	.object({
		activated_users: joi.number().integer(),
		arch: joi.any().valid('arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64'),
		avg_resolution_time: joi.number(), // in minutes
		avg_response_time: joi.number(), // in minutes
		categories: joi.number().integer(),
		database: joi.any().valid('mysql', 'postgresql', 'sqlite'),
		guilds: joi.number().integer(),
		id: joi.string().required(),
		members: joi.number().integer(),
		messages: joi.number().integer(),
		node: joi.string().pattern(/^v\d+\.\d+\.\d+$/),
		os: joi.any().valid('aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32'),
		tags: joi.number().integer(),
		tickets: joi.number().integer().required(),
		version: joi.string().pattern(semver),
	})
	.rename('client', 'id');

export const updateClient = async (req, compatMode = false) => {
	const body = await req.json();
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) return error(400, validationError);
	if (compatMode) value.id = md5(value.id);
	const id = value.id;
	delete value.id;
	console.log('Updating stats for client', id);
	value.last_seen = new Date();
	return await db(req).collection('clients').updateOne(
		{ _id: id },
		{ $set: value },
		{ $setOnInsert: { first_seen: new Date() } },
		{ upsert: true },
	);
};

export const router = Router({ base: '/api/v3' });

router.get('/current', async (req, env, ctx) => {
	let stats = await env.CACHE.get('dt:stats', { type: 'json' });
	if (stats) return stats;

	console.log('Updating cache...');
	const data = await db(req).collection('clients').find();
	const activeClients = data.filter(row => isActive(row.last_seen));
	stats = {
		activated_users: sum(data, 'activated_users'),
		arch: transform(activeClients, 'arch'),
		avg_resolution_time: sum(data, 'avg_resolution_time') / data.length,
		avg_response_time: sum(data, 'avg_response_time') / data.length,
		categories: sum(data, 'categories'),
		clients: {
			active: activeClients.length,
			total: data.length,
		},
		database: transform(activeClients, 'database'),
		guilds: {
			active: activeClients.reduce((acc, row) => acc + (typeof row.guilds === 'number' ? row.guilds : Object.keys(row.guilds).length), 0),
			total: data.reduce((acc, row) => acc + (typeof row.guilds === 'number' ? row.guilds : Object.keys(row.guilds).length), 0),
		},
		members: sum(data, 'members'),
		messages: sum(data, 'messages'),
		node: transform(activeClients, 'node'),
		os: transform(activeClients, 'os'),
		tags: sum(data, 'tags'),
		tickets: sum(data, 'tickets'),
		version: transform(activeClients, 'version'),
	};

	ctx.waitUntil(env.CACHE.put('dt:stats/v3', JSON.stringify(stats), { expirationTtl: 3660 })); // 61 min
	return stats;
});

router.get('/history', async req => {
	const days = req.query.days || 30;
	// const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10); // yyyy-mm-dd
	const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
	const data = await db(req).collection('snapshots').find({ date: { $gte: date } });
	return data;
});

router.post('/houston', async req => await updateClient(req, false));