# Bot Client

Sample bot client yang connect ke BOIAuto WS server. Mengirim state update periodik dan menerima command dari web client.

## Setup

### 1. Pastikan server jalan

```bash
cd /home/z/my-project/boiauto-app
bun run dev
```

### 2. Create a bot via API (no seed data)

Database dimulai kosong. Buat bot baru dengan token kamu sendiri:

```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "token": "my-secret-bot-token",
    "name": "MyBot",
    "type": "Dual"
  }'
```

Untuk tipe Business (wajib `rate_per_day`):

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

Verifikasi bot sudah dibuat:

```bash
curl -s http://localhost:3000/api/bots | jq '.[] | {name, bot_id, type, status}'
```

### 3. Set BOT_TOKEN di .env

Edit file `.env` di root project:

```bash
BOT_TOKEN=my-secret-bot-token
```

Atau via terminal:

```bash
echo "BOT_TOKEN=my-secret-bot-token" > .env
echo "NODE_ENV=development" >> .env
```

### 4. Jalankan bot client

```bash
cd /home/z/my-project/boiauto-app
bun run bot:start
```

Dengan options (override via flag atau env):

```
--server   WS_URL=ws://localhost:3000/ws    (default)
--token    BOT_TOKEN=<your-token>           (wajib, dari .env)
--interval UPDATE_INTERVAL=5000             (ms, default 5000)
```

Contoh explicit:

```bash
BOT_TOKEN=my-secret-token bun run client/bot/bot-client.js --interval 3000
```

## Yang dilakukan bot client

1. Connect ke `ws://localhost:3000/ws`
2. Auth: `{type:'auth', role:'bot', token: BOT_TOKEN}`
3. Setelah auth OK → status bot di DB jadi `online` (broadcast ke web clients)
4. Tiap `UPDATE_INTERVAL` ms → kirim mock `state_update` (balance, diamond, level, dst.)
5. Dengarkan `command` dari web (start/stop skill_up, auto_war, auto_work)
6. Heartbeat tiap 15s
7. Auto-reconnect dengan exponential backoff (max 30s)

## WS Protocol

### Bot → Server
```js
{ type: "auth", role: "bot", token: "..." }
{ type: "state_update", account_id: 1, payload: { balance, diamond, status, ... } }
{ type: "heartbeat" }
{ type: "pong" }
```

### Server → Bot
```js
{ type: "hello", message: "..." }
{ type: "auth_ok", role: "bot", bot_id: "bot_8f3a2b", name: "MyBot" }
{ type: "auth_failed", message: "..." }
{ type: "command", command: "start_skill_up", account_id: 1, payload: {...} }
{ type: "heartbeat_ack", t: 1700000000000 }
{ type: "ping" }
```

## Multiple bots

Buat beberapa bot via API dengan token berbeda, lalu jalankan bot client di terminal berbeda:

```bash
# Buat bot 1
curl -X POST http://localhost:3000/api/bots -H "Content-Type: application/json" \
  -d '{"token":"tok-bot-1","name":"Bot1","type":"Dual"}'

# Buat bot 2
curl -X POST http://localhost:3000/api/bots -H "Content-Type: application/json" \
  -d '{"token":"tok-bot-2","name":"Bot2","type":"Shared"}'

# Terminal 1
BOT_TOKEN=tok-bot-1 bun run client/bot/bot-client.js

# Terminal 2
BOT_TOKEN=tok-bot-2 bun run client/bot/bot-client.js --interval 7000
```

Semua bot akan terlihat online di UI web, dan web client akan terima real-time updates dari semua bot.

## Troubleshooting

### "Bot token required"
`BOT_TOKEN` env tidak di-set. Edit `.env` atau pass `--token` flag.

### "Invalid bot token"
Token tidak ditemukan di database. Pastikan bot sudah dibuat via `POST /api/bots` dengan token yang sama.

### "ECONNREFUSED"
Server belum jalan. Jalankan `bun run dev` dulu di terminal lain.
