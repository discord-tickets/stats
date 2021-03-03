# stats

A simple API for counting the number guilds DiscordTickets is used in across how many clients.

The client IDs are stored separately from the guild IDs and member counts:

```json
{
	"clients": [
		"451745464480432129"
	],
	"guilds": {
		"451745464480432129": 350
	}
}
```

Your client's ID and guilds' IDs are **not** publicly available.

This data is used to create a statistics overview:

```json
{
	"clients": 1,
	"guilds": 1,
	"members": 350
}
```

which can be fetched from [telemetry.discordtickets.app](https://telemetry.discordtickets.app/).

If you don't want to be included in these statistics, you can prevent the bot from sending the data by setting `super_secret_setting` in [config.js](https://github.com/discord-tickets/bot/blob/master/user/example.config.js) to `false`.

Hosted with [replit always on](https://docs.repl.it/repls/always-on).
