import { flatten } from 'flat';
import schema from './schema';
import { db } from '../common/db';
import { log } from '../logger';

export const updateV4Client = async req => {
	const body = await req.json();
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) throw new Error(validationError);
	const clientId = value.id;
	delete value.id;
	log.info('Updating stats for client %s', clientId);
	const existing = await db.collection('clients').findOne({ _id: clientId });
	if (existing && existing?.houston !== 4) value.guilds = [];
	const guilds = value.guilds;
	value.guilds = {};
	let largestMessageCount = 0;
	for (const guild of guilds) {
		const guildId = guild.id;
		delete guild.id;
		guild.last_seen = new Date();
		if (!existing?.guilds?.[guildId]) guild.first_seen = new Date();
		// `guild.messages` *should* be the same for every guild as it's actually the client's total message count
		if (guild.messages > largestMessageCount) largestMessageCount = guild.messages;
		delete guild.messages;
		value.guilds[guildId] = guild;
	}
	value.messages = largestMessageCount;
	return await db.collection('clients').updateOne(
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
};