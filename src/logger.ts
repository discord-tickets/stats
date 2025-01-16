import {
	Logger,
	ConsoleTransport,
	FileTransport,
} from 'leekslazylogger';
import { short } from 'leeks.js';
import { getClientIp } from 'request-ip';

type DecoratedRequest = Request & {
	$logger: {
		id: string;
		start: number;
	},
	params: Record<string, string>,
}

const colours = {
	critical: ['&0&!4', '&5', '&0&!c'],
	debug: ['&0&!1', '&5', '&9'],
	error: ['&0&!4', '&5', '&c'],
	info: ['&0&!3', '&5', '&b'],
	notice: ['&0&!6', '&5', '&0&!e'],
	success: ['&0&!2', '&5', '&a'],
	verbose: ['&0&!f', '&5', '&r'],
	warn: ['&0&!6', '&5', '&e'],
};

function getStatusColour(status: number) {
	switch ((status / 100) | 0) {
	case 5: // red = error
		return '&4';
	case 4: // yellow = warning
		return '&6';
	case 3: // cyan = redirect
		return '&3';
	case 2: // green = success
		return '&2';
	}
}

function getDurationColour(duration: number) {
	if (duration <  100) return '&a';
	if (duration <  500) return '&e';
	if (duration < 1000) return '&c';
	return '&4';
}

export let counter = 0;

export const log = new Logger({
	namespaces: ['http'],
	transports: [
		new ConsoleTransport({
			format(log) {
				const colour = colours[log.level.name];
				return short(`&!7&f ${new Date().toISOString()} &r ${colour[0]} ${log.level.name} &r ${log.namespace ? `${colour[1]}(${log.namespace})&r ` : ''}${colour[2] + log.content}`);
			},
			level: process.env.LOG_LEVEL || 'info',
		}),
		new FileTransport(),
	],
});


export function logErrors(err: Error, req: DecoratedRequest) {
	log.error.http({
		id: req.$logger?.id,
		error: err,
		params: req.params,
		headers: Object.fromEntries(req.headers),
	});
}

export function logRequests(req: DecoratedRequest) {
	req.$logger = {
		id: `req-${(counter++).toString(36)}`,
		start: Date.now(),
	};
	log.info.http(`${req.$logger.id} &7${req.headers.get('x-forwarded-for') ?? '?'}&b &m-->&r&b ${req.method} ${new URL(req.url).pathname}`);
	log.verbose.http(req.$logger.id, Object.fromEntries(req.headers));
};

export function logResponses(res: Response, req: DecoratedRequest) {
	const duration = Date.now() - req.$logger.start;
	log.info.http(`${req.$logger.id} ${getStatusColour(res.status)}${res.status}&b &m<--&r ${getDurationColour(duration)}${duration}ms`);
};