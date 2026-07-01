# CONTEXT.md

> **For AI assistants**: This file is the source of truth for understanding the BOIAuto project. Read it first when joining the project, and update it whenever the architecture changes.

## Project Overview

**BOIAuto** is a real-time automation dashboard for a BOI-style game. It manages bots (WebSocket clients that perform game automation), access tokens (granting per-bot usage rights), and automates (game accounts that consume bot services). The system has a SPA frontend, a Bun-based HTTP + WebSocket backend, and a SQLite database.

## Tech Stack

- **Runtime**: Bun 1.4+ (canary)
- **Database**: `bun:sqlite` (in-memory in dev, file in prod)
- **HTTP + WebSocket**: `Bun.serve` with `websocket` handler
- **Logging**: `pino` + `pino-pretty` (dev) / JSON stdout (prod)
- **Frontend**: Vanilla HTML/JS with Alpine.js + Tailwind CSS v4 (browser CDN)
- **Tests**: `bun:test` (built-in)

## Architecture

```
boiauto-app/
├── src/
│   ├── server.js              # Entry point — bootstrap only (~40 lines)
│   ├── config.js              # Central config (env, paths, constants)
│   ├── logger.js              # pino logger setup
│   ├── api/                   # REST API routes (modular)
│   │   ├── index.js           # Router dispatcher
│   │   ├── bots.js            # POST/PATCH/DELETE /api/bots + generate-token
│   │   ├── automates.js       # POST/PATCH/DELETE /api/automates (uses access_id)
│   │   ├── access.js          # POST/DELETE /api/access (token generation)
│   │   └── dashboard.js       # GET /api/dashboard (aggregated stats)
│   ├── db/
│   │   ├── index.js           # DB connection + init
│   │   ├── schema.js          # SQL schema (bots, automates, access_tokens)
│   │   ├── seed.js            # seedFromConfig() — reads bot.config.json
│   │   └── queries/           # Query modules (one per entity)
│   │       ├── helpers.js     # Shared updateFields() DRY utility
│   │       ├── bots.js
│   │       ├── access.js
│   │       ├── automates.js
│   │       ├── dashboard.js
│   │       └── index.js       # Re-exports all query modules
│   ├── ws/
│   │   ├── index.js           # WebSocket handler (auth, broadcast, commands)
│   │   └── protocol.js        # WS message types + bot commands constants
│   ├── utils/
│   │   ├── crypto.js          # genBotId, genToken, genAccessId, maskToken, randomHex
│   │   └── response.js        # json(), error(), readJson() helpers
│   └── public/                # Static SPA (served directly)
│       ├── index.html         # Loads parts via fetch + Alpine.initTree
│       ├── script.js          # Alpine.js store (state + methods) with apiPatch/apiDelete helpers
│       ├── icons.js           # SVG icon path constants (window.ICONS)
│       ├── style.css          # Custom CSS (animations, scrollbars, grid bg)
│       └── parts/             # HTML fragments (modular SPA parts)
│           ├── navbar.html                # Sidebar drawer
│           ├── stack-toggle.html          # Hamburger button
│           ├── header.html                # Fixed header
│           ├── footer.html
│           ├── upgrade-skill.html          # Main view loader (5 views)
│           ├── dashboard-view.html         # Real-time stats dashboard
│           ├── access-view.html            # Access page (loader)
│           ├── access-topbar.html
│           ├── access-list.html
│           ├── add-access-modal.html
│           ├── topbar.html                # Automate page topbar
│           ├── empty-state.html           # Automate empty state
│           ├── automate-overview-card.html
│           ├── feature-toggle.html        # Reusable Skill/Training/Work toggles
│           ├── automate-detail-modal.html
│           ├── add-automate-modal.html
│           ├── bot-view.html              # Bot page (loader)
│           ├── bot-topbar.html
│           ├── bot-list.html
│           ├── add-bot-modal.html
│           ├── edit-bot-modal.html
│           ├── guide-view.html            # Guide page
│           ├── confirm-modal.html         # Reusable confirmation dialog
│           └── toast.html                 # Toast notification system
├── client/
│   ├── bot/
│   │   ├── bot-client.js      # Sample bot client (connects via WS)
│   │   ├── package.json
│   │   └── README.md
│   └── web/
│       ├── ws-client.js       # Reference WS client for Alpine.js (optional wiring)
│       └── README.md
├── tests/                     # bun:test test suite
│   ├── crypto.test.js         # Token/ID generation
│   ├── db.test.js             # DB queries (bots/access/automates)
│   ├── api.test.js            # API endpoints end-to-end
│   ├── ws.test.js             # WS protocol constants
│   └── response.test.js       # HTTP response helpers
├── bot.config.json            # Seed bot definition (1 bot for bot client)
├── package.json
├── .gitignore
└── CONTEXT.md                 # This file
```

## Domain Model

### Bots
- **bot_id**: `bot_<7 bytes hex>` (e.g. `bot_8f3a2b9c1d4e`)
- **token**: `bot_<Bun.hash(cryptoRandomUint8Array + Date.now())>` (used by bot client to authenticate via WS)
- **type**: `Dual` (max 2 access tokens) | `Shared` (unlimited access tokens)
- **status**: `connecting` (just created, no client yet) → `connected` (WS authenticated) → `disconnected` (WS closed)
- Created via UI (Generate Token flow) or seeded from `bot.config.json` on server startup

### Access Tokens
- **access_id**: `acc_<7 bytes hex>`
- **token**: `bot_<hash>` (shared with recipient)
- **type**: `Private` (max 1 automate) | `Shared` (unlimited automates) | `Business` (max 1 automate + price/day in game currency)
- **price_per_day**: required for Business type, 0 otherwise
- Linked to a bot via `bot_id` (FK with CASCADE delete)

### Automates (automates table)
- **bearer**: game bearer token (provided by user)
- **access_id**: links to an access token (FK) — inherits type, bot, etc.
- **bot_id**: derived from the access token's bot
- **type**: inherited from access token (Private/Shared/Business)
- **balance, diamond, status**: updated in real-time by bot client via WS `state_update`
- **skill_up_running, auto_war_running, auto_work_running**: feature toggles (0/1)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/bots` | List all bots |
| POST   | `/api/bots` | Create bot (requires token) |
| POST   | `/api/bots/generate-token` | Generate a fresh bot token |
| PATCH  | `/api/bots/:id` | Update bot (name/token/type) |
| DELETE | `/api/bots/:id` | Delete bot (cascades to access tokens) |
| GET    | `/api/access` | List all access tokens (with bot_name + usage_count) |
| POST   | `/api/access` | Create access token (requires bot_id, type, optional price_per_day) |
| DELETE | `/api/access/:id` | Revoke access token |
| GET    | `/api/automates` | List all automates (with bot + access info via JOIN) |
| POST   | `/api/automates` | Create automate (requires bearer + access_id) |
| PATCH  | `/api/automates/:id` | Update automate (bearer, access_id, feature toggles, balance, etc.) |
| DELETE | `/api/automates/:id` | Delete automate |
| GET    | `/api/dashboard` | Aggregated stats (totals, running features, sum balance/diamond) |

## WebSocket Protocol

Connect to `ws://localhost:3000/ws`.

### Bot client → Server
- `{type:"auth", role:"bot", token:"bot_xxx"}` → auth with bot token
- `{type:"state_update", account_id:N, payload:{balance, diamond, status, ...}}` → broadcast to web subscribers + persist to DB
- `{type:"heartbeat"}` → keep-alive (server replies `heartbeat_ack`)
- `{type:"pong"}` → reply to server ping

### Web client → Server
- `{type:"auth", role:"web"}` → subscribe to updates
- `{type:"command", bot_id:"bot_xxx", command:"start_skill_up", account_id:N}` → forward command to bot client
- `{type:"ping"}` → reply `pong`

### Server → Web subscribers
- `{type:"snapshot", bots:[...], accounts:[...]}` — sent on auth
- `{type:"bot_status", bot_id, status}` — when a bot connects/disconnects
- `{type:"bot_update", bot_id, fields}` — when a bot is created/edited
- `{type:"account_update", account_id, fields}` — when an automate is created/edited
- `{type:"state_update", bot_id, account_id, payload}` — broadcast from bot client

### Server → Bot client
- `{type:"hello", message}` — on connect
- `{type:"auth_ok", role, bot_id, name}` — on successful auth
- `{type:"auth_failed", message}` — on bad token
- `{type:"command", command, account_id, payload}` — forwarded from web
- `{type:"heartbeat_ack", t}` — reply to heartbeat

## Frontend Architecture

The SPA uses **Alpine.js** for reactivity with a single `boiauto()` store in `script.js`. HTML is split into modular fragments in `parts/` — each part is fetched at runtime via `fetch('parts/xxx.html').then(...).then(Alpine.initTree)`.

### View routing
5 views switched via `currentView` state (instant, no loading delay):
- `dashboard` — real-time stats overview (default)
- `access` — manage access tokens
- `automate` — manage automates (game accounts)
- `bot` — manage bots
- `guide` — user guide

### Shared frontend helpers (DRY)
- `apiPatch(endpoint, body)` — generic PATCH with error parsing
- `apiDelete(endpoint)` — generic DELETE with error throwing
- `FEATURE_FIELD_MAP` — maps camelCase feature names to snake_case DB columns
- `loadResource()` — generic GET loader used by all data fetching

### Key UI patterns
- **Bot status**: `connecting` (warn spinner) → `connected` (green pulse dot) → `disconnected` (red dot)
- **Access usage**: `X/1` for Private/Business, single number for Shared
- **Automate overview card**: 3 feature toggles (Skill/Training/Work) via `feature-toggle.html`; border glows when any is ON
- **Add Bot flow**: Generate Token → secret appears with copy button + connect instructions → "Add Bot" → "Waiting Later" (spinner) → "Finished" (when bot connects)
- **Body scroll lock**: when any modal is open

## Development Workflow

```bash
# Install deps
bun install

# Run server (dev — :memory: DB, pino-pretty, --watch)
bun run dev

# Run server (prod — file DB, JSON logs)
NODE_ENV=production bun run start

# Run bot client (reads bot.config.json)
bun run bot:start

# Run tests
bun test

# Run tests in watch mode
bun test --watch
```

### Environment variables
- `NODE_ENV` — `development` (default) or `production`
- `PORT` — HTTP/WS port (default: 3000)
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`
- `WS_URL` — bot client WS server URL (default: `ws://localhost:3000/ws`)
- `UPDATE_INTERVAL` — bot client state update interval in ms (default: 5000)
- `BOT_TOKEN` — override bot client token (otherwise reads from `bot.config.json`)

### bot.config.json
Seed bot definition at project root. On server startup, if no bot exists with that token, it's inserted into the DB. Used by `bun run bot:start` to authenticate.

```json
{
  "bot_id": "bot_root_primary",
  "name": "PrimaryBot",
  "token": "bot_xxxxxxxxxxxxxxxx",
  "type": "Dual",
  "rate_per_day": 0
}
```

## Testing Strategy

Tests use `bun:test` and run against the real `:memory:` SQLite DB (tests reset tables in `beforeEach`).

- **`tests/crypto.test.js`** — ID/token generation uniqueness, format, masking
- **`tests/db.test.js`** — DB queries (CRUD, JOINs, FK cascade, CHECK constraints)
- **`tests/api.test.js`** — End-to-end API tests via `handleApi()` (no HTTP server needed)
- **`tests/ws.test.js`** — WS protocol constants
- **`tests/response.test.js`** — HTTP response helpers

Run with `bun test` — all tests should pass before any commit.

## Common Tasks for AI Maintainers

### Adding a new API endpoint
1. Create `src/api/<resource>.js` exporting an async `<resource>Router(req, url, idStr, log)` function
2. Add queries in `src/db/queries/<resource>.js` if needed
3. Register the router in `src/api/index.js` `routes` map
4. Add tests in `tests/api.test.js`

### Adding a new frontend view
1. Create `parts/<view>-view.html` (or split into topbar/list/modal parts)
2. Add a `<template x-if="currentView === '<view>'">` block in `parts/upgrade-skill.html`
3. Add a nav button in `parts/navbar.html`
4. Add a `load<View>()` method in `script.js` if data fetching is needed
5. Add `switchView('<view>')` to default `currentView` if changing the default

### Changing the DB schema
1. Edit `src/db/schema.js`
2. Drop the `data.db*` files in prod (or restart in dev with `:memory:`)
3. Update affected query modules
4. Update tests in `tests/db.test.js`

### Updating bot.config.json
Just edit the file — server will re-seed on next restart if the token doesn't already exist. To force re-seed, delete the bot row first or restart in dev mode.

## Coding Conventions

- **Module type**: ESM (`"type": "module"` in package.json)
- **File header**: every file starts with `// <path>` or `<!-- <path> -->` for navigability (paths relative to project root, e.g. `src/public/script.js`)
- **No inline comments** in HTML parts (only the path header at line 1)
- **Logger**: always use child logger with `module` field: `logger.child({ module: "api" })`
- **Error responses**: use `error(msg, status)` helper, not raw `json({error})`
- **Query modules**: one file per entity, exports `<entity>Queries` object
- **API modules**: one file per resource, exports async `<entity>Router(req, url, idStr, log)`
- **Shared DB helpers**: use `updateFields()` from `src/db/queries/helpers.js` for dynamic UPDATE queries
- **Frontend API calls**: use `apiPatch()` and `apiDelete()` helpers in `script.js` for consistent error handling
- **Tests**: co-located in `tests/`, naming `<module>.test.js`, use `describe`/`test` from `bun:test`

## Recent Changes

- **v1.1.0**: Major refactor — removed dead code (`src/db.js`, `src/ws.js`), extracted `updateFields()` query helper, added `apiPatch()`/`apiDelete()` frontend helpers, fixed API endpoint URLs (`/accounts` → `/automates`), fixed path comments, removed `startAutomate`/`stopAutomate` in favor of `toggleFeature()`/`stopAllFeatures()`, fixed orphaned CSS, standardized `error()` helper usage in all routers.
- **v1.0.0**: Initial release with full bot/access/automate/dashboard/guide flow, real-time WS, modular architecture, test suite.