# stats

A simple API which provides basic statistics for Discord Tickets.

Discord Tickets periodically sends its client ID along with the number of tickets in the bot's database. The bot also sends the ID of every guild in its cache, along with the approximate member count of each guild.

This data is stored in two database tables. The guilds are not connected to the clients in any way.

- "clients" table
	|         id         | tickets |
	|--------------------|---------|
	| 475371285531066368 |   426   |

- "guilds" table
	|         id         | members |
	|--------------------|---------|
	| 451745464480432129 |   548   |

This data is used to generate the statistics at [stats.discordtickets.app](https://stats.discordtickets.app/), which is used on the home page.

```json
{
	"clients": 1,
	"tickets": 426, // all of the ticket counts added together
	"guilds": 1,
	"members": 548 // all of the member counts added together
}
```

If you don't want to be included in these statistics, you can prevent the bot from sending the data by setting `super_secret_setting` in [config.js](https://github.com/discord-tickets/bot/blob/master/user/example.config.js) to `false`.
