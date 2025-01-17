import joi from 'joi';

export const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export default joi.object({
	activated_users: joi.number().integer().required(),
	arch: joi.any().valid('arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64').required(),
	database: joi.any().valid('mysql', 'postgresql', 'sqlite').required(),
	guilds: joi.array().items(joi.object({
		avg_resolution_time: joi.number().required(), // in minutes
		avg_response_time: joi.number().required(), // in minutes
		categories: joi.number().integer().required(),
		features: joi.object({
			auto_close: joi.number().required(), // value in minutes
			claiming: joi.number().integer().required(), // number of categories
			feedback: joi.number().integer().required(),
			logs: joi.boolean().required(),
			questions: joi.number().integer().required(),
			tags: joi.number().integer().required(),
			tags_regex: joi.number().integer().required(),
			topic: joi.number().integer().required(),
		}).required(),
		id: joi.string().required(),
		locale: joi.string().required(),
		members: joi.number().integer().required(),
		messages: joi.number().integer().required(),
		tickets: joi.number().integer().required(),
	})).required(),
	id: joi.string().required(),
	node: joi.string().pattern(/^v\d+\.\d+\.\d+$/).required(),
	os: joi.any().valid('aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32').required(),
	version: joi.string().pattern(semver).required(),
});