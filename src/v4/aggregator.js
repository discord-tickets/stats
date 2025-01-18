import md5 from 'md5';
import { log } from '../logger';
import {
	aggregate,
	mergeTransformed,
	r2dp,
} from '../common/aggregation';
import cache from '../common/cache';

export async function updateV4Cache() {
	log.info('Updating v4 cache...');
	// eslint-disable-next-line no-underscore-dangle
	const _public = await aggregate({ '_id': { '$eq': md5(process.env.PUBLIC_BOT_ID) } });
	const self_hosted = await aggregate({ '_id': { '$ne': md5(process.env.PUBLIC_BOT_ID) } });
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
				lasting_lifespan: Math.round((_public.active.guilds.lasting_lifespan + self_hosted.active.guilds.lasting_lifespan) / 2),
				lifespan: Math.round((_public.active.guilds.lifespan + self_hosted.active.guilds.lifespan) / 2),
				locale: mergeTransformed(_public.active.guilds.locale, self_hosted.active.guilds.locale),
				members: _public.active.guilds.members + self_hosted.active.guilds.members,
				messages: null,
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
			lasting_lifespan: Math.round((_public.active.lasting_lifespan + self_hosted.active.lasting_lifespan) / 2),
			lifespan: Math.round((_public.active.lifespan + self_hosted.active.lifespan) / 2),
			node: mergeTransformed(_public.active.node, self_hosted.active.node),
			os: mergeTransformed(_public.active.os, self_hosted.active.os),
			version: mergeTransformed(_public.active.version, self_hosted.active.version),
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
	await cache.set('v4', stats);
	return stats;
};