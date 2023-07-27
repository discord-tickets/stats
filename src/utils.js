import * as Realm from 'realm-web';

export const getRealmUser = async env => {
	const RealmApp = new Realm.App(env.REALM_APP_ID);
	return await RealmApp.logIn(Realm.Credentials.apiKey(env.REALM_API_KEY));
};

/**
 * @param {object} req
 * @param {Realm.User} req.$RealmUser
 */
export const db = req => req.$RealmUser.mongoClient('mongodb-atlas').db('discord-tickets');

export const isActive = lastSeen => (Date.now() - Date.parse(lastSeen)) / 1000 / 60 / 60 / 24 < 7;

export const sum = (data, prop) => data.reduce((acc, row) => acc + (row[prop] || 0), 0);

export const transform = (data, prop) => {
	const counts = data.reduce(($, row) => (($[row[prop] || 'null'] += 1) || ($[row[prop] || 'null'] = 1), $), {});
	return Object.keys(counts)
		.map(i => ({
			count: counts[i],
			name: i,
		}))
		.sort((a, b) => b.count - a.count);
};

export const aggregate = async ($db, match) => {
	const aWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));

	const count = prop =>  $db.collection('clients').aggregate([
		{
			'$match': {
				...match,
				'houston': { '$gte': 4 },
				'last_seen': { '$gte': aWeekAgo },
			},
		},
		{
			'$group': {
				'_id': prop,
				'count': { '$count': {} },
			},
		},
		{
			'$project': {
				'_id': 0,
				'count': 1,
				'name': '$_id',
			},
		},
		{ '$sort': { 'count': -1 } },
	]);

	// FIXME: must be fewer than 15 queries
	return {
		active: {
			arch: await count('$arch'),
			database: await count('$database'),
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
			locale: [], // TODO: this is on guilds
			node: await count('$node'),
			os: await count('$os'),
			version: await count('$version'),
		},
		total: {
			activated_users: 0,
			clients: 0,
			guilds: 0, // all, including <10 members and removed
			members: 0,
			messages: 0,
			tickets: 0,
		},
	};
};