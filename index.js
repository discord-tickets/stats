require('dotenv').config();
const { PORT } = process.env;
const regex = /\d{17,19}/;

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
	id: {
		allowNull: false,
		primaryKey: true,
		type: DataTypes.CHAR(19)
	},
	tickets: DataTypes.NUMBER
}, { sequelize, modelName: 'client' });

class Guild extends Model { }
Guild.init({
	id: {
		allowNull: false,
		primaryKey: true,
		type: DataTypes.CHAR(19)
	},
	members: DataTypes.NUMBER
}, { sequelize, modelName: 'guild' });

sequelize.sync();

const server = require('fastify')();
const cors = require('fastify-cors');
server.register(cors);
const Logger = require('leekslazylogger-fastify');
const log = new Logger({
	name: 'Discord Tickets Stats',
});
server.register(log.fastify());

server.get('/', async (req, res) => {
	const { count: client_count, rows: clients } = await Client.findAndCountAll();
	const { count: guild_count, rows: guilds } = await Guild.findAndCountAll();
	res.send({
		clients: client_count,
		tickets: clients.reduce((acc, c) => acc + c.get('tickets'), 0),
		guilds: guild_count,
		members: guilds.reduce((acc, g) => acc + g.get('members'), 0)
	});
});

server.post('/client', async (req, res) => {
	if (!req.query || !req.query.id)
		return res.status(400).send('400 Bad Request: "Missing ID"');
	
	if (!req.query.tickets)
		return res.status(400).send('400 Bad Request: "Missing tickets"');

	let { id, tickets } = req.query;
	tickets = Number(tickets);

	if (!regex.test(id))
		return res.status(400).send('400 Bad Request: "Invalid ID"');

	if (isNaN(tickets))
		return res.status(400).send('400 Bad Request: "Invalid tickets count"');

	const [client, created] = await Client.findOrCreate({
		where: { id },
		defaults: { id, tickets }
	});

	client.set('tickets', tickets);
	await client.save();

	if (created) {
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});

server.post('/guild', async (req, res) => {
	if (!req.query || !req.query.id)
		return res.status(400).send('400 Bad Request: "Missing ID"');

	if (!req.query.members)
		return res.status(400).send('400 Bad Request: "Missing members"');

	let { id, members } = req.query;
	members = Number(members);

	if (!regex.test(id))
		return res.status(400).send('400 Bad Request: "Invalid ID"');

	if (isNaN(members))
		return res.status(400).send('400 Bad Request: "Invalid members count"');

	const [guild, created] = await Guild.findOrCreate({
		where: { id },
		defaults: { id, members }
	});

	guild.set('members', members);
	await guild.save();

	if (created) {
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});

server.listen(PORT, () => {
	log.success(`Listening on port ${PORT}`);
});
