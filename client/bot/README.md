# Bot Client

Sample bot client yang connect ke BOIAuto WS server. Mengirim state update periodik dan menerima command dari web client.

## Setup

### 1. Pastikan server jalan

```bash
cd /home/z/my-project/boiauto-app
bun run dev
```

### 2. Buat bot via UI (recommended)

- Buka `http://localhost:3000/` di browser
- Klik sidebar → **Bot** → **+ Add**
- Isi Name (optional) + pilih Type (Dual/Shared/Business/Custom)
- Klik **Generate Token** → secret token muncul dengan instruksi connect
- Klik copy icon → simpan token
- Klik **Add Bot** (tombol berubah jadi "Waiting Later" dengan spinner)
- Status bot di list: **Connecting** (spinner kuning)

### 3. Set token di bot.config.json

Edit file `bot.config.json` di root project:

```json
{
  "name": "MyBot",
  "token": "bot_xxxxxxxxxxxxxxxx",
  "type": "Dual",
  "rate_per_day": 0
}
```

### 4. Jalankan bot client

```bash
cd /home/z/my-project/boiauto-app
bun run bot:start
```

Atau dari folder client/bot langsung:

```bash
cd client/bot
bun run bot-client.js
```

Token prioritas (urutan):
1. Flag `--token` (paling tinggi)
2. Env `BOT_TOKEN`
3. `bot.config.json` (default)

Setelah bot client connect:
- Status di UI berubah dari **Connecting** → **Connected** (hijau berkedip)
- Tombol "Waiting Later" di modal berubah jadi **Finished**
- Bot client kirim state_update periodik

## Options

```
--server   WS_URL=ws://localhost:3000/ws    (default)
--token    BOT_TOKEN=<your-token>           (override config)
--config   path/to/bot.config.json          (default: ../../bot.config.json)
--interval UPDATE_INTERVAL=5000             (ms, default 5000)
```

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
{ type: "auth_ok", role: "bot", bot_id: "bot_xxx", name: "MyBot" }
{ type: "auth_failed", message: "..." }
{ type: "command", command: "start_skill_up", account_id: 1, payload: {...} }
{ type: "heartbeat_ack", t: 1700000000000 }
{ type: "ping" }
```

## Multiple bots

Buat beberapa bot via UI/API dengan token berbeda, lalu jalankan bot client di terminal berbeda:

```bash
# Buat bot 1 via UI, copy token1 ke bot.config.json
bun run bot:start

# Buat bot 2 via UI, copy token2
BOT_TOKEN=token2 bun run client/bot/bot-client.js --interval 7000
```

## Troubleshooting

### "Bot token required"
Tidak ada token di flag/env/config. Buat bot via UI atau POST `/api/bots`.

### "Invalid bot token"
Token tidak ditemukan di database. Buat bot baru via UI atau cek token di `bot.config.json`.

### "ECONNREFUSED"
Server belum jalan. Jalankan `bun run dev` dulu.

### Bot status tetap "Connecting"
Bot client belum connect. Pastikan:
1. `bot.config.json` ada di root project
2. Token di config sama dengan token di UI
3. Bot client sudah dijalankan (`bun run bot:start`)
