import { AutoRouter } from 'itty-router';
import cache from '../common/cache';
import { updateV3Cache } from './aggregator';
import { updateV3Client } from './houston';
import { db } from '../common/db';

export const router = AutoRouter({ base: '/api/v3' });

router.get('/current', async () => await cache.get('v3') || await updateV3Cache());

router.get('/history', async req => {
	const days = req.query.days || 30;
	const date = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
	const data = await db.collection('snapshots').find({ date: { $gte: date } }).toArray();
	return data;
});

router.post('/houston', async req => await updateV3Client(req, false));