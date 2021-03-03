require('dotenv').config();

const PATH = './data.json';
const {
	DISCORD_TOKEN,
	PORT
} = process.env;

const fs = require('fs');
const fetch = require('node-fetch');
const app = require('express')();

if (!fs.existsSync(PATH)) {
	let data = {
		clients: [],
		guilds: {}
	};
	fs.writeFileSync(PATH, JSON.stringify(data));
}

const regex = /\d{17,19}/;

app.get('/', (req, res) => {
	let { clients, guilds } = JSON.parse(fs.readFileSync(PATH));
	res.json({
		clients: clients.length,
		guilds: Object.keys(guilds).length,
		members: Object.keys(guilds).reduce((acc, g) => acc + guilds[g], 0)
	});
});

app.post('/client', async (req, res) => {
	if (!req.query || !req.query.id)
		return res.status(400).send('400 Bad Request: "Missing ID"');

	let { id } = req.query;

	if (!regex.test(id))
		return res.status(400).send('400 Bad Request: "Invalid ID"');

	let data = JSON.parse(fs.readFileSync(PATH));

	if (!data.clients.includes(id)) {
		let user = await (await fetch(`https://discord.com/api/users/${id}`, {
			headers: {
				'Authorization': `Bot ${DISCORD_TOKEN}`
			}
		})).json();

		if (!user || !user.bot)
			return res.status(400).send('400 Bad Request: "User is a human"');
		data.clients.push(req.query.id);
		fs.writeFileSync(PATH, JSON.stringify(data));
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});

app.post('/guild', async (req, res) => {
	if (!req.query || !req.query.id)
		return res.status(400).send('400 Bad Request: "Missing ID"');

	if (!req.query || !req.query.members)
		return res.status(400).send('400 Bad Request: "Missing members"');

	let { id, members } = req.query;
	members = Number(members);

	if (!regex.test(id))
		return res.status(400).send('400 Bad Request: "Invalid ID"');

	if (isNaN(members))
		return res.status(400).send('400 Bad Request: "Invalid member count"');

	let data = JSON.parse(fs.readFileSync(PATH));

	if (!data.guilds[id]) {
		data.guilds[id] = members;
		fs.writeFileSync(PATH, JSON.stringify(data));
		res.status(201).send('201 CREATED');
	} else {
		res.status(200).send('200 OK');
	}
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});