// /client/web/ws-client.js
const WS_URL = `ws://${location.host}/ws`;
let ws;
let reconnectAttempts = 0;

export function initWs(store) {
  connect(store);
}

function connect(store) {
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    reconnectAttempts = 0;
    console.log("[ws] connected");
    ws.send(JSON.stringify({ type: "auth", role: "web" }));
  });

  ws.addEventListener("message", (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case "auth_ok":
        console.log("[ws] authenticated as web subscriber");
        break;
      case "snapshot":
        if (msg.bots) store.bots = msg.bots;
        if (msg.accounts) store.accounts = msg.accounts;
        break;
      case "bot_status":
      case "bot_update":
        const botIdx = store.bots.findIndex((b) => b.bot_id === msg.bot_id);
        if (botIdx >= 0) {
          store.bots[botIdx] = { ...store.bots[botIdx], ...msg.fields, status: msg.status };
        }
        break;
      case "state_update":
      case "account_update":
        if (msg.account_id == null) break;
        const accIdx = store.accounts.findIndex((a) => a.id === msg.account_id);
        if (accIdx >= 0) {
          const fields = msg.fields || msg.payload || {};
          store.accounts[accIdx] = { ...store.accounts[accIdx], ...fields };
        }
        break;
    }
  });

  ws.addEventListener("close", () => {
    console.log("[ws] disconnected");
    scheduleReconnect(store);
  });

  ws.addEventListener("error", () => {
    console.warn("[ws] error");
  });
}

function scheduleReconnect(store) {
  reconnectAttempts++;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
  console.log(`[ws] reconnecting in ${delay}ms...`);
  setTimeout(() => connect(store), delay);
}

export function sendCommand(botId, command, accountId, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({
    type: "command",
    bot_id: botId,
    command,
    account_id: accountId,
    payload,
  }));
  return true;
}
