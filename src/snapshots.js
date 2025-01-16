import cache from './common/cache';
import { db } from './common/db';

export const createSnapshot = async () => {
	// TODO: $merge or $out aggregation
	console.log('Creating snapshot...');
	const stats = await cache.get('v4');
	const res1 = await fetch(`https://top.gg/api/bots/${process.env.PUBLIC_BOT_ID}/stats`, {
		body: JSON.stringify({
			server_count:
				stats.combined.active.guilds.count +
				stats.combined.active.guilds.excluded.insufficient_data +
				stats.combined.active.guilds.excluded.presumed_test,
		}),
		headers: {
			'Authorization': process.env.TOPGG_TOKEN,
			'Content-Type': 'application/json',
		},
		method: 'POST',
	});
	console.log('Top.gg:', res1.status, res1.statusText);
	const res2 = await db.collection('snapshots').insertOne({
		date: new Date(),
		...stats.combined.total,
	});
	console.log('DB:', res2);
	return res2;
};