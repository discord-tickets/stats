require('dotenv').config();

const PATH = './data.json';
const { PORT } = process.env;

const fs = require('fs');
const fetch = require('node-fetch');
const app = require('express')();

if (!fs.existsSync(PATH)) {
	let data = {
		clients: {},
		guilds: {}
	};
	fs.writeFileSync(PATH, JSON.stringify(data));
}

const regex = /\d{17,19}/;

app.get('/', (req, res) => {
	let { clients, guilds } = JSON.parse(fs.readFileSync(PATH));
	res.json({
		clients: Object.keys(clients).length,
		tickets: Object.keys(clients).reduce((acc, c) => acc + clients[c].tickets, 0),
		guilds: Object.keys(guilds).length,
		members: Object.keys(guilds).reduce((acc, g) => acc + guilds[g].members, 0)
	});
});

app.post('/client', async (req, res) => {
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

	let data = JSON.parse(fs.readFileSync(PATH));

	if (!data.clients[id]) {
		data.clients[id] = {
			tickets: 0
		};
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}

	data.clients[id].tickets = tickets;
	fs.writeFileSync(PATH, JSON.stringify(data));
});

app.post('/guild', async (req, res) => {
	if (!req.query || !req.query.id)
		return res.status(400).send('400 Bad Request: "Missing ID"');

	if (!req.query.members)
		return res.status(400).send('400 Bad Request: "Missing members"');

	let { id, members } = req.query;
	members = Number(members);

	if (!regex.test(id))
		return res.status(400).send('400 Bad Request: "Invalid ID"');

	if (isNaN(members))
		return res.status(400).send('400 Bad Request: "Invalid member count"');

	let data = JSON.parse(fs.readFileSync(PATH));

	if (!data.guilds[id]) {
		data.guilds[id] = {
			members: 0
		};
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}

	data.guilds[id].members = members;
	fs.writeFileSync(PATH, JSON.stringify(data));
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
