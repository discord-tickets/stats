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
import {
	flatten,
	unflatten,
} from 'flat';

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const schema = joi.object({
	activated_users: joi.number().integer().required(),
	arch: joi.any().valid('arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64').required(),
	database: joi.any().valid('mysql', 'postgresql', 'sqlite').required(),
	guilds: joi.array().items(joi.object({
		avg_resolution_time: joi.number().required(), // in minutes
		avg_response_time: joi.number().required(), // in minutes
		categories: joi.number().integer().required(),
		features: joi.object({
			auto_close: joi.number().integer().required(), // value in minutes
			claiming: joi.number().integer().required(), // number of categories
			feedback: joi.number().integer().required(),
			logs: joi.boolean().required(),
			questions: joi.number().integer().required(),
			tags: joi.number().integer().required(),
			tags_regex: joi.number().integer().required(),
			topic: joi.number().integer().required(),
		}).required(),
		id: joi.string().required(),
		locale: joi.string().required(),
		members: joi.number().integer().required(),
		messages: joi.number().integer().required(),
		tickets: joi.number().integer().required(),
	})).required(),
	id: joi.string().required(),
	node: joi.string().pattern(/^v\d+\.\d+\.\d+$/).required(),
	os: joi.any().valid('aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32').required(),
	version: joi.string().pattern(semver).required(),
});

export const router = Router({ base: '/api/v4' });

router.get('/current', async (req, env, ctx) => {
	// await db(req).collection('snapshots').aggregate([
	// 	{
	// 		$
	// 	}
	// ])
	console.log('Updating cache...');
	// const data = await db(req).collection('clients').find();
	// ctx.waitUntil(env.CACHE.put('dt:stats/v4', JSON.stringify(stats), { expirationTtl: 3660 })); // 61 min
	// TODO: use mongo aggregation to save CPU time
	const stats = {
		combined: {},
		public: {},
		self_hosted: {
			active: {
				arch: [],
				database: [],
				guilds: {
					activated_users: 0,
					auto_close: 0, // value in minutes
					avg_resolution_time: 0,
					avg_response_time: 0,
					categories: {
						count: 0,
						with_claiming: 0, // number of categories
						with_feedback: 0,
						with_questions: 0,
						with_topic: 0,
					},
					count: 0, // TODO: ignore <10 members (presumed test guilds)
					excluded: 0,
					lifespan: 0, // TODO: ALL, even inactive guilds, in days
					members: 0,
					messages: 0,
					tags: 0,
					tags_regex: 0,
					tickets: 0,
					with_claiming: 0, // guilds where enabled in at least one category
					with_feedback: 0,
					with_logs: 0,
					with_questions: 0,
					with_tags: 0,
					with_tags_regex: 0,
					with_topic: 0,
				},
				lifespan: 0, // TODO: ALL, even inactive clients, in days
				locale: [], // TODO
				node: [],
				os: [],
				version: [],
			},
			total: {
				activated_users: 0,
				clients: 0,
				guilds: 0, // all, including <10 members and removed
				members: 0,
				messages: 0,
				tickets: 0,
			},
		},
	};
	return stats;
});

router.get('/history', async req => {
	const days = req.query.days || 30;
	const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
	const data = await db(req).collection('snapshots').find({ date: { $gte: date } });
	// TODO: lifespan
	return data;
});

router.post('/houston', async req => {
	const body = await req.json();
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) return error(400, validationError);
	const clientId = value.id;
	delete value.id;
	console.log('Updating stats for client', clientId);
	const existing = await db(req).collection('clients').findOne({ _id: clientId });
	if (existing && existing?.houston !== 4) value.guilds = [];
	const guilds = value.guilds;
	value.guilds = {};
	for (const guild of guilds) {
		const guildId = guild.id;
		delete guild.id;
		guild.last_seen = new Date();
		if (!existing?.guilds?.[guildId]) guild.first_seen = new Date();
		value.guilds[guildId] = guild;
	}
	return await db(req).collection('clients').updateOne(
		{ _id: clientId },
		{
			$set: {
				...flatten(value),
				houston: 4,
				last_seen: new Date(), // https://www.mongodb.com/docs/v6.0/reference/operator/update/currentDate/
			},
			$setOnInsert: { first_seen: new Date() },
		},
		{ upsert: true },
	);
});