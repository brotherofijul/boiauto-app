# Web Client (WS integration)

Optional helper for integrate WebSocket real-time updates ke Alpine.js store.

## Usage

1. Copy `ws-client.js` to `src/public/`
2. Load in `index.html`: `<script defer src="ws-client.js"></script>`
3. Init in `script.js`:
```js
import { initWs, sendCommand } from "./ws-client.js";
init() {
  this.loadBots().then(() => this.loadAccounts());
  initWs(this);
}
```

## Protocol

Web → Server:
- `{type:"auth", role:"web"}`
- `{type:"command", bot_id, command, account_id, payload}`

Server → Web:
- `{type:"hello", message}`
- `{type:"auth_ok", role:"web"}`
- `{type:"snapshot", bots, accounts}`
- `{type:"bot_status", bot_id, status}`
- `{type:"bot_update", bot_id, fields}`
- `{type:"account_update", account_id, fields}`
- `{type:"state_update", bot_id, account_id, payload}`
