import { log } from '../logger';
import { db } from '../common/db';
import {
	isActive,
	transform,
	sum,
} from '../common/aggregation';
import cache from '../common/cache';

export async function updateV3Cache() {
	log.info('Updating v3 cache...');
	const data = await db.collection('clients').find().toArray();
	const activeClients = data.filter(row => isActive(row.last_seen));
	const stats = {
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

	await cache.set('v3', stats);
	return stats;
};