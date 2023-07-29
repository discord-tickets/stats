import {
	Router,
	error,
} from 'itty-router';
import joi from 'joi';
import md5 from 'md5';
import {
	aggregate,
	db,
	getRealmUser,
	mergeTransformed,
	r2dp,
} from './utils';
import { flatten } from 'flat';

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

export const updateCache = async env => {
	console.log('Updating v4 cache...');
	// TODO: use more mongo aggregation to save CPU time
	// ? this looks nicer but it is much less efficient
	// const stats = {
	// 	_cached_at: new Date(),
	// 	combined: await aggregate(db(req), {}),
	// 	public: await aggregate(db(req), { '_id': { '$eq': md5(env.PUBLIC_BOT_ID) } }),
	// 	self_hosted: await aggregate(db(req), { '_id': { '$ne': md5(env.PUBLIC_BOT_ID) } }),
	// };
	const $db = db({ $RealmUser: await getRealmUser(env) });
	// eslint-disable-next-line no-underscore-dangle
	const _public = await aggregate($db, { '_id': { '$eq': md5(env.PUBLIC_BOT_ID) } });
	const self_hosted = await aggregate($db, { '_id': { '$ne': md5(env.PUBLIC_BOT_ID) } });
	const combined = {
		active: {
			arch: mergeTransformed(_public.active.arch, self_hosted.active.arch),
			count: _public.active.count + self_hosted.active.count,
			database: mergeTransformed(_public.active.database, self_hosted.active.database),
			guilds: {
				activated_users: _public.active.guilds.activated_users + self_hosted.active.guilds.activated_users,
				auto_close: Math.round((_public.active.guilds.auto_close + self_hosted.active.guilds.auto_close) / 2),
				avg_resolution_time: r2dp((_public.active.guilds.avg_resolution_time + self_hosted.active.guilds.avg_resolution_time) / 2),
				avg_response_time: r2dp((_public.active.guilds.avg_response_time + self_hosted.active.guilds.avg_response_time) / 2),
				categories: {
					count: _public.active.guilds.categories.count + self_hosted.active.guilds.categories.count,
					with_claiming: _public.active.guilds.categories.with_claiming + self_hosted.active.guilds.categories.with_claiming,
					with_feedback: _public.active.guilds.categories.with_feedback + self_hosted.active.guilds.categories.with_feedback,
					with_questions: _public.active.guilds.categories.with_questions + self_hosted.active.guilds.categories.with_questions,
					with_topic: _public.active.guilds.categories.with_topic + self_hosted.active.guilds.categories.with_topic,
				},
				count: _public.active.guilds.count + self_hosted.active.guilds.count,
				excluded: {
					insufficient_data: _public.active.guilds.excluded.insufficient_data + self_hosted.active.guilds.excluded.insufficient_data,
					presumed_test: _public.active.guilds.excluded.presumed_test + self_hosted.active.guilds.excluded.presumed_test,
				},
				lifespan: Math.round((_public.active.guilds.lifespan + self_hosted.active.guilds.lifespan) / 2),
				locale: mergeTransformed(_public.active.guilds.locale, self_hosted.active.guilds.locale),
				members: _public.active.guilds.members + self_hosted.active.guilds.members,
				messages: _public.active.guilds.messages + self_hosted.active.guilds.messages,
				tags: _public.active.guilds.tags + self_hosted.active.guilds.tags,
				tags_regex: _public.active.guilds.tags_regex + self_hosted.active.guilds.tags_regex,
				tickets: _public.active.guilds.tickets + self_hosted.active.guilds.tickets,
				with_claiming: _public.active.guilds.with_claiming + self_hosted.active.guilds.with_claiming,
				with_feedback: _public.active.guilds.with_feedback + self_hosted.active.guilds.with_feedback,
				with_logs: _public.active.guilds.with_logs + self_hosted.active.guilds.with_logs,
				with_questions: _public.active.guilds.with_questions + self_hosted.active.guilds.with_questions,
				with_tags: _public.active.guilds.with_tags + self_hosted.active.guilds.with_tags,
				with_tags_regex: _public.active.guilds.with_tags_regex + self_hosted.active.guilds.with_tags_regex,
				with_topic: _public.active.guilds.with_topic + self_hosted.active.guilds.with_topic,
			},
			lifespan: 0, // ALL clients, in days
			node: mergeTransformed(_public.active.node, self_hosted.active.node),
			os: mergeTransformed(_public.active.os, self_hosted.active.os),
			version: mergeTransformed(_public.active.version, self_hosted.active.version), // all houston versions
		},
		total: {
			activated_users: _public.total.activated_users + self_hosted.total.activated_users,
			categories: _public.total.categories + self_hosted.total.categories,
			clients: _public.total.clients + self_hosted.total.clients,
			guilds: _public.total.guilds + self_hosted.total.guilds,
			members: _public.total.members + self_hosted.total.members,
			messages: _public.total.messages + self_hosted.total.messages,
			tags: _public.total.tags + self_hosted.total.tags,
			tickets: _public.total.tickets + self_hosted.total.tickets,
		},
	};
	const stats = {
		_cached_at: new Date(),
		combined,
		public: _public,
		self_hosted,
	};
	return await env.CACHE.put('dt:stats/v4', JSON.stringify(stats));
};

export const router = Router({ base: '/api/v4' });

router.get('/current', async (req, env) => JSON.parse(await env.CACHE.get('dt:stats/v4')));

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