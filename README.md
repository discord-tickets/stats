# stats

A simple API for providing basic statistics for Discord Tickets.

The client data is stored separately from the guild data counts:

```json
{
	"clients": {
		"451745464480432129": {
			"tickets": 426
		}
	},
	"guilds": {
		"451745464480432129": {
			"members": 350
		}
	}
}
```

The data with IDs is **not** publicly available, it is used to create an overview:

```json
{
	"clients": 1,
	"tickets": 426,
	"guilds": 1,
	"members": 350
}
```

which can be fetched from [stats.discordtickets.app](https://stats.discordtickets.app/).

If you don't want to be included in these statistics, you can prevent the bot from sending the data by setting `super_secret_setting` in [config.js](https://github.com/discord-tickets/bot/blob/master/user/example.config.js) to `false`.

Hosted with [replit always-on](https://docs.repl.it/repls/always-on).
