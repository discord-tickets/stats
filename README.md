# stats

![](https://img.shields.io/badge/dynamic/json?color=5865F2&label=bots&query=clients.total&url=https%3A%2F%2Fstats.discordtickets.app%2Fapi%2Fv3%2Fcurrent&logo=discord&logoColor=white&style=for-the-badge)
![](https://img.shields.io/badge/dynamic/json?color=5865F2&label=tickets&query=tickets&url=https%3A%2F%2Fstats.discordtickets.app%2Fapi%2Fv3%2Fcurrent&logo=discord&logoColor=white&style=for-the-badge)

**An API to receive, store, and aggregate data from Discord Tickets bots.**

View the stats at <https://stats.discordtickets.app>.

An example of what your bot sends:

```json
{
  "activated_users": 26,
  "arch": "arm64",
  "avg_resolution_time": 238.9,
  "avg_response_time": 32.7,
  "categories": 2,
  "database": "mysql",
  "guilds": 1,
  "id": "7f4a58c0ff94c01eadef17e4b3c9f0a7",
  "members": 600,
  "messages": 347,
  "node": "v18.0.0",
  "os": "linux",
  "tags": 1,
  "tickets": 47,
  "version": "4.0.0"
}
```