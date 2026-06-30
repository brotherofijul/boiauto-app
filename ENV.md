# BOIAuto environment configuration

## Server (src/server.js)
- `NODE_ENV` — `development` (default) or `production`
  - In **development**: SQLite uses `:memory:` (no file persistence), logs are pretty-printed
  - In **production**: SQLite uses `data.db` file, logs are JSON to stdout
- `PORT` — HTTP/WS port (default: 3000)
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error` (default: `debug` in dev, `info` in prod)

## Bot Client (client/bot/bot-client.js)
- `BOT_TOKEN` — **required**. Token of the bot to authenticate as.
- `WS_URL` — WebSocket server URL (default: `ws://localhost:3000/ws`)
- `UPDATE_INTERVAL` — State update interval in ms (default: 5000)

## Creating a Bot (no seed data)

The database starts empty. You must create a bot first before the bot client can connect.

### 1. Start the server

```bash
bun run dev
```

### 2. Create a bot via API

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "my-secret-bot-token",
    "name": "MyBot",
    "type": "Dual"
  }'
```

For Business type (requires rate_per_day):

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "my-business-token",
    "name": "BusinessBot",
    "type": "Business",
    "rate_per_day": 5.00
  }'
```

### 3. Set BOT_TOKEN in .env

```bash
echo 'BOT_TOKEN=my-secret-bot-token' >> .env
```

### 4. Run the bot client

```bash
bun run bot:start
# or
bun run client/bot/bot-client.js
```

The bot client will:
1. Connect to `ws://localhost:3000/ws`
2. Authenticate with `BOT_TOKEN`
3. Bot status in DB updates to `online`
4. Send mock state updates every 5s
5. Listen for commands from web clients

## Listing existing bots

```bash
curl -s http://localhost:3000/api/bots | jq '.[] | {name, bot_id, type, status}'
```

## Usage Summary

```bash
# Server (dev)
bun run dev

# Server (prod)
NODE_ENV=production bun run start

# Bot client (reads .env automatically)
bun run bot:start

# Or with explicit env
BOT_TOKEN=my-secret-token bun run client/bot/bot-client.js
```
