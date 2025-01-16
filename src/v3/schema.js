import joi from 'joi';
import { semver } from '../v4/schema';

export default joi
	.object({
		activated_users: joi.number().integer(),
		arch: joi.any().valid('arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64'),
		avg_resolution_time: joi.number(), // in minutes
		avg_response_time: joi.number(), // in minutes
		categories: joi.number().integer(),
		database: joi.any().valid('mysql', 'postgresql', 'sqlite'),
		guilds: joi.number().integer(),
		id: joi.string().required(),
		members: joi.number().integer(),
		messages: joi.number().integer(),
		node: joi.string().pattern(/^v\d+\.\d+\.\d+$/),
		os: joi.any().valid('aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32'),
		tags: joi.number().integer(),
		tickets: joi.number().integer().required(),
		version: joi.string().pattern(semver),
	})
	.rename('client', 'id');