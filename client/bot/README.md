# Bot Client

Sample bot client yang connect ke BOIAuto WS server.

## Setup

1. Start server: `bun run dev` (root project)
2. Bot akan otomatis di-seed dari `bot.config.json`
3. Run bot client: `bun run bot:start` (root project)

## Token priority

1. `--token` flag
2. `BOT_TOKEN` env var
3. `bot.config.json` (default)

## Options

```
--server   WS_URL=ws://localhost:3000/ws    (default)
--token    BOT_TOKEN=<your-token>           (override config)
--config   path/to/bot.config.json          (default: ../../bot.config.json)
--interval UPDATE_INTERVAL=5000             (ms, default 5000)
```

## WS Protocol

Bot → Server:
- `{type:"auth", role:"bot", token}`
- `{type:"state_update", account_id, payload:{balance, diamond, status, ...}}`
- `{type:"heartbeat"}`

Server → Bot:
- `{type:"hello", message}`
- `{type:"auth_ok", role, bot_id, name}`
- `{type:"auth_failed", message}`
- `{type:"command", command, account_id, payload}`
- `{type:"heartbeat_ack", t}`
- `{type:"ping"}`
