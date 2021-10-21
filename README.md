# stats

> A simple API which provides basic statistics for Discord Tickets.

Unless you disable it, Discord Tickets periodically sends statistical data to `stats.discordtickets.app`:

```json
{
	"client": "475371285531066368",
	"guilds": 1,
	"members": 548,
	"tickets": 426,
	"version": "3.0.0"
}
```

This data is used to generate the statistics at [stats.discordtickets.app](https://stats.discordtickets.app/), which is used on the [home page](https://discordtickets.app).

```json
{
	"clients": 1,
	"tickets": 426,
	"guilds": 1,
	"members": 548
}
```

If you don't want to be included in these statistics, you can prevent the bot from sending the data by setting `super_secret_setting` in [config.js](https://github.com/discord-tickets/bot/blob/main/user/example.config.js) to `false`.
