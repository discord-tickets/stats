import * as Realm from 'realm-web';

const DAY = 1000 * 60 * 60 * 24;


export const getRealmUser = async env => {
	const RealmApp = new Realm.App(env.REALM_APP_ID);
	return await RealmApp.logIn(Realm.Credentials.apiKey(env.REALM_API_KEY));
};

/**
 * @param {object} req
 * @param {Realm.User} req.$RealmUser
*/
export const db = req => req.$RealmUser.mongoClient('mongodb-atlas').db('discord-tickets');

export const r2dp = n => Number(n.toFixed(2));

export const isActive = lastSeen => (Date.now() - Date.parse(lastSeen)) / 1000 / 60 / 60 / 24 < 7;

export const sum = (data, prop) => data.reduce((acc, row) =>
	acc + (
		prop
			.split(/\./g)
			.reduce((acc, part) => acc && acc[part], row) ||
	0),
0);

export const sumish = (data, prop) => data.reduce((acc, row) => acc + Math.min(
	1,
	prop
		.split(/\./g)
		.reduce((acc, part) => acc && acc[part], row),
), 0);

export const transform = (data, prop) => {
	const counts = data.reduce(($, row) => (($[row[prop] || 'null'] += 1) || ($[row[prop] || 'null'] = 1), $), {});
	return Object.keys(counts)
		.map(i => ({
			count: counts[i],
			name: i,
		}))
		.sort((a, b) => b.count - a.count);
};

export const mergeTransformed = (a, b) => Object.entries(
	[
		...a,
		...b,
	].reduce((acc, row) => ((acc[row.name] = (acc[row.name] || 0) + row.count), acc), {}),
)
	.map(([name, count]) => ({
		count,
		name,
	}))
	.sort((a, b) => b.count - a.count);

export const aggregate = async ($db, $match) => {
	const aWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
	const $matchActive = {
		...$match,
		'last_seen': { '$gte': aWeekAgo },
	};
	const $matchActiveWithHouston4 = {
		...$matchActive,
		'houston': { '$gte': 4 },
	};
	// native/mongo equivalent of `transform()`
	const count = (prop, $match) => $db.collection('clients').aggregate([
		{ '$match': { ...$match } },
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
	const allClients = await $db.collection('clients').find($match); // all clients, including houston < 4
	const activeClients = await $db.collection('clients').find($matchActive); //
	// (`Object.values(number) == []` so it only includes houston >= 4 without explicitly checking)
	const allH4ClientsGuilds = allClients.reduce((acc, row) => acc.concat(Object.values(row.guilds)), []); // all guilds where client's houston >= 4
	const activeH4ClientsGuilds = activeClients.reduce((acc, row) => acc.concat(Object.values(row.guilds)), []); // all guilds where client's houston >= 4 and client is active
	const activeGuilds = activeH4ClientsGuilds.filter(row => isActive(row.last_seen)); // all active guilds of active clients
	const realGuilds = activeGuilds.filter(row => row.members >= 10); // all active guilds of active clients with >= 10 members
	const timeableGuilds = realGuilds.filter(row => row.avg_resolution_time > 0 && row.avg_response_time > 0); // all active guilds of active clients with >= 10 members and avg resolution/response time > 0
	return {
		active: {
			arch: await count('$arch', $matchActiveWithHouston4),
			count: activeClients.length,
			database: await count('$database', $matchActiveWithHouston4),
			guilds: {
				activated_users: sum(activeClients, 'activated_users'),
				auto_close: Math.round(sum(realGuilds, 'features.auto_close') / realGuilds.length / 60), // average in HOURS
				avg_resolution_time: r2dp(sum(timeableGuilds, 'avg_resolution_time') / timeableGuilds.length / 60), // average in HOURS
				avg_response_time: r2dp(sum(timeableGuilds, 'avg_response_time') / timeableGuilds.length / 60), // average in HOURS
				categories: {
					count: sum(realGuilds, 'categories'),
					with_claiming: sum(realGuilds, 'features.claiming'),
					with_feedback: sum(realGuilds, 'features.feedback'),
					with_questions: sum(realGuilds, 'features.questions'),
					with_topic: sum(realGuilds, 'features.topic'),
				},
				count: realGuilds.length, // ignore <10 members (presumed test guilds)
				excluded: {
					// insufficient_data: activeClients.filter(row => typeof row.guilds === 'number').length, // guilds where client's houston < 4
					insufficient_data: activeClients.reduce((acc, row) => acc + (typeof row.guilds === 'number' ? row.guilds : 0), 0), // guilds where client's houston < 4
					presumed_test: activeGuilds.length - realGuilds.length, // guilds with <10 members
				},
				lifespan: Math.round( // ALL guilds in days
					allH4ClientsGuilds
						.filter(row => row.members >= 10) // real but include inactive clients and guilds
						.reduce((acc, row) => acc + (row.last_seen - row.first_seen), 0) /
					DAY / allH4ClientsGuilds.length,
				),
				locale: transform(realGuilds, 'locale'), // ? idk how to do this one in mongo
				members: realGuilds.reduce((acc, row) => acc + row.members, 0),
				// `messages` should have been on the client not guilds...
				messages: activeClients.reduce((acc, row) => acc + (
					typeof row.guilds === 'number'
						? row.messages || 0
						: Object.values(row.guilds).find(g => isActive(g.last_seen))?.messages || 0)
				, 0),
				tags: sum(realGuilds, 'features.tags'),
				tags_regex: sum(realGuilds, 'features.tags_regex'),
				tickets: sum(realGuilds, 'tickets'),
				// with_claiming: realGuilds.filter(row => row.features.claiming).length,
				with_claiming: sumish(realGuilds, 'features.claiming'), // guilds where enabled in at least one category
				with_feedback: sumish(realGuilds, 'features.feedback'),
				with_logs: sum(realGuilds, 'features.logs'), // `logs` is a boolean, both `sum()` and `sumish()` would work
				with_questions: sumish(realGuilds, 'features.questions'),
				with_tags: sumish(realGuilds, 'features.tags'),
				with_tags_regex: sumish(realGuilds, 'features.tags_regex'),
				with_topic: sumish(realGuilds, 'features.topic'),
			},
			lifespan: Math.round(allClients.reduce((acc, row) => acc + (row.last_seen - row.first_seen), 0) / DAY / allClients.length), // ALL clients, in days
			node: await count('$node', $matchActiveWithHouston4),
			os: await count('$os', $matchActiveWithHouston4),
			version: await count('$version', $matchActive), // all houston versions
		},
		total: {
			activated_users: sum(allClients, 'activated_users'),
			categories: // check guilds isn't an object because bots that existed before Houston 4 may have part new and old data at the same time
				allClients.reduce((acc, row) => acc + (typeof row.categories === 'number' && typeof row.guilds !== 'object' ? row.categories : 0), 0) + // <H4
				allH4ClientsGuilds.reduce((acc, row) => acc + row.categories, 0), // >=H4,
			clients: allClients.length,
			// all guilds, including <10 members and removed
			guilds: allClients.reduce((acc, row) => acc + (typeof row.guilds === 'number' ? row.guilds : Object.keys(row.guilds).length), 0),
			members:
				allClients.reduce((acc, row) => acc + (typeof row.members === 'number' && typeof row.guilds !== 'object' ? row.members : 0), 0) + // <H4
				allH4ClientsGuilds.reduce((acc, row) => acc + row.members, 0), // >=H4
			messages: activeClients.reduce((acc, row) => acc + (
				typeof row.guilds === 'number'
					? row.messages || 0
					: Object.values(row.guilds).find(g => isActive(g.last_seen))?.messages || 0)
			, 0),
			tags:
				allClients.reduce((acc, row) => acc + (typeof row.tags === 'number' && typeof row.guilds !== 'object' ? row.tags : 0), 0) + // <H4
				allH4ClientsGuilds.reduce((acc, row) => acc + row.features.tags, 0), // >=H4,
			tickets:
				allClients.reduce((acc, row) => acc + (typeof row.tickets === 'number' && typeof row.guilds !== 'object' ? row.tickets : 0), 0) + // <H4
				allH4ClientsGuilds.reduce((acc, row) => acc + row.tickets, 0), // >=H4
		},
	};
};