# BOIAuto environment configuration

## Server (src/server.js)
- `NODE_ENV` — `development` (default) or `production`
  - In **development**: SQLite uses `:memory:` (no file persistence), logs are pretty-printed
  - In **production**: SQLite uses `data.db` file, logs are JSON to stdout
- `PORT` — HTTP/WS port (default: 3000)
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error` (default: `debug` in dev, `info` in prod)

## Bot Client (client/bot/bot-client.js)
- `WS_URL` — WebSocket server URL (default: `ws://localhost:3000/ws`)
- `UPDATE_INTERVAL` — State update interval in ms (default: 5000)
- `BOT_TOKEN` — Optional override. If not set, token is read from `bot.config.json`.

## bot.config.json

The primary way to configure the bot client. Place at project root:

```json
{
  "bot_id": "bot_root_primary",
  "name": "PrimaryBot",
  "token": "bot_xxxxxxxxxxxxxxxx",
  "type": "Dual",
  "rate_per_day": 0
}
```

On server startup, this config is read and the bot is seeded into the database (only if no bot with that token exists yet). This is how you register a "root" bot without going through the UI.

## Creating Additional Bots

After the server is running, you can add more bots via the UI (Bot page → + Add) or via the API:

```bash
# Generate a fresh token
curl -X POST http://localhost:3000/api/bots/generate-token

# Create a bot with that token
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "bot_xxxxxxxxxxxxxxxx",
    "name": "MyBot",
    "type": "Dual"
  }'
```

For Business type (requires rate_per_day):

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "bot_xxxxxxxxxxxxxxxx",
    "name": "BusinessBot",
    "type": "Business",
    "rate_per_day": 5.00
  }'
```

## Generating Access Tokens

Access tokens allow other users to use one bot for one automate. Generate them on the **Access** page (or via API):

```bash
curl -X POST http://localhost:3000/api/access \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "bot_xxxxxxxxxxxxxxxx",
    "label": "John"
  }'
```

Returns the access token. Share it with the recipient — they can use it to run 1 automate linked to that bot.

Dual & Business bots allow max 2 access tokens each. Shared & Custom have no limit.

## Usage Summary

```bash
# Server (dev) — :memory: DB, pino-pretty logs
bun run dev

# Server (prod) — file DB, JSON logs
NODE_ENV=production bun run start

# Bot client (reads bot.config.json automatically)
bun run bot:start
```
