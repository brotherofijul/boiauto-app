# Web Client (WS integration)

Optional helper untuk integrate WebSocket real-time updates ke Alpine.js store yang sudah ada.

## Status

**Reference implementation** — belum di-wire ke `src/public/script.js` otomatis. Saat ini UI masih pakai localStorage + fetch. Untuk upgrade ke real-time WS:

## Cara pakai

### 1. Copy `ws-client.js` ke public

```bash
cp client/web/ws-client.js src/public/
```

### 2. Load di `index.html`

```html
<script defer src="ws-client.js"></script>
```

### 3. Init di `script.js` setelah load accounts/bots

```js
import { initWs, sendCommand } from "./ws-client.js";

init() {
  this.loadAccounts();
  this.loadBots();
  spawnParticles();
  initWs(this); // ← tambah ini
}
```

### 4. Replace localStorage calls dengan REST API

Ganti `loadAccounts()` / `saveAccounts()` / `loadBots()` / `saveBots()` jadi fetch ke `/api/bots` & `/api/accounts`. Snapshot awal akan otomatis dikirim lewat WS saat auth.

### 5. Kirim command ke bot lewat WS

```js
toggleFeature(idx, feature) {
  const a = this.accounts[idx];
  const bot = this.bots.find((b) => b.bot_id === a.bot_id);
  if (!bot) return;
  sendCommand(bot.bot_id, `start_${feature}`, a.id);
}
```

## WS Protocol (Web → Server)

```js
{ type: "auth", role: "web" }
{ type: "command", bot_id: "bot_8f3a2b", command: "start_skill_up", account_id: 1, payload: {} }
{ type: "ping" }
```

## WS Protocol (Server → Web)

```js
{ type: "hello", message: "..." }
{ type: "auth_ok", role: "web" }
{ type: "snapshot", bots: [...], accounts: [...] }
{ type: "bot_status", bot_id: "bot_8f3a2b", status: "online" }
{ type: "bot_update", bot_id: "bot_8f3a2b", fields: {...} }
{ type: "account_update", account_id: 1, fields: {...} }
{ type: "state_update", bot_id: "...", account_id: 1, payload: {...} }
```
