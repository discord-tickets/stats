require('dotenv').config();
const {
	PORT,
	RATELIMIT_MAX,
	RATELIMIT_TIME
} = process.env;
const regex = /\d{17,19}/;

if (!PORT || !RATELIMIT_MAX || !RATELIMIT_TIME) {
	throw new Error('Environment is not defined');
}

const {
	DataTypes,
	Model,
	Sequelize
} = require('sequelize');

const sequelize = new Sequelize({
	dialect: 'sqlite',
	logging: text => log.debug(text),
	storage: 'database.sqlite'
});

class Client extends Model { }
Client.init({
	guilds: {
		allowNull: false,
		defaultValue: 0,
		type: DataTypes.NUMBER
	},
	id: {
		allowNull: false,
		primaryKey: true,
		type: DataTypes.CHAR(19)
	},
	members: {
		allowNull: false,
		defaultValue: 0,
		type: DataTypes.NUMBER
	},
	tickets: {
		allowNull: false,
		defaultValue: 0,
		type: DataTypes.NUMBER
	},
	version: DataTypes.STRING
}, {
	modelName: 'client',
	sequelize
});

sequelize.sync();

const server = require('fastify')();
const cors = require('fastify-cors');
server.register(cors);

const Logger = require('leekslazylogger-fastify');
const log = new Logger({ name: 'Discord Tickets Stats' });
server.register(log.fastify());

server.register(require('fastify-rate-limit'), {
	max: RATELIMIT_MAX,
	timeWindow: RATELIMIT_TIME
});

server.get('/', async (_req, res) => {
	const {
		count: client_count, rows: clients
	} = await Client.findAndCountAll();

	res.send({
		clients: client_count,
		guilds: clients.reduce((acc, c) => acc + c.get('guilds'), 0),
		members: clients.reduce((acc, c) => acc + c.get('members'), 0),
		tickets: clients.reduce((acc, c) => acc + c.get('tickets'), 0)
	});
});

server.post('/v2', async (req, res) => {
	const {
		client: id,
		guilds,
		members,
		tickets,
		version
	} = req.body;

	if (
		typeof id !== 'string' ||
		typeof guilds !== 'number' ||
		typeof members !== 'number' ||
		typeof tickets !== 'number' ||
		typeof version !== 'string'
	) {
		return res.status(400).send('400 BAD REQUEST: "Missing fields"');
	}

	if (!regex.test(id)) {
		return res.status(400).send('400 BAD REQUEST: "Invalid client ID"');
	}

	const [row, created] = await Client.findOrCreate({
		defaults: {
			guilds,
			id,
			members,
			tickets,
			version
		},
		where: { id }
	});

	row.set('guilds', guilds);
	row.set('members', members);
	row.set('tickets', tickets);
	row.set('version', version);
	await row.save();

	if (created) {
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});


/**
 * @deprecated
 */
server.post('/client', async (req, res) => {
	if (!req.query || !req.query.id) {
		return res.status(400).send('400 BAD REQUEST: "Missing ID"');
	}

	if (!req.query.tickets) {
		return res.status(400).send('400 BAD REQUEST: "Missing tickets"');
	}

	let {
		id, tickets
	} = req.query;
	tickets = Number(tickets);

	if (!regex.test(id)) {
		return res.status(400).send('400 BAD REQUEST: "Invalid ID"');
	}

	if (isNaN(tickets)) {
		return res.status(400).send('400 BAD REQUEST: "Invalid tickets count"');
	}

	const [client, created] = await Client.findOrCreate({
		defaults: {
			id,
			tickets
		},
		where: { id }
	});

	client.set('tickets', tickets);
	await client.save();

	if (created) {
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});

/**
 * @deprecated
 */
server.post('/guild', async (_req, res) => {
	res.status(410).send('410 GONE: "Please update to Discord Tickets v3.1.0"');
});

server.listen(PORT, () => {
	log.success(`Listening on port ${PORT}`);
});
