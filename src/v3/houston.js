import md5 from 'md5';
import schema from './schema';
import { db } from '../common/db';
import { log } from '../logger';

export const updateV3Client = async (req, compatMode = false) => {
	const body = await req.json();
	const {
		error: validationError,
		value,
	} = schema.validate(body);
	if (validationError) {
		log.error('%s Validation error:', req.$logger.id, validationError);
		throw new Error(validationError);
	}
	if (compatMode) value.id = md5(value.id);
	const id = value.id;
	delete value.id;
	log.info('Updating stats for client %s', id);
	value.last_seen = new Date();
	return await db.collection('clients').updateOne(
		{ _id: id },
		{ $set: value },
		{ $setOnInsert: { first_seen: new Date() } },
		{ upsert: true },
	);
};