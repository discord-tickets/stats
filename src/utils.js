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