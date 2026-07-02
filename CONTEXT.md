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
- **Tests**: `bun:test` (built-in, 82 tests)

## Architecture

```
boiauto-app/
├── src/
│   ├── server.js              # Entry point — bootstrap only
│   ├── config.js              # Central config (env, paths, constants)
│   ├── logger.js              # pino logger setup
│   ├── api/                   # REST API routes (modular)
│   │   ├── index.js           # Router dispatcher
│   │   ├── bots.js            # POST/PATCH/DELETE /api/bots + generate-token + verify-token
│   │   ├── automates.js       # POST/PATCH/DELETE /api/automates (uses access_id, skill, pay)
│   │   ├── access.js          # POST/PATCH/DELETE /api/access + verify-token
│   │   └── dashboard.js       # GET /api/dashboard (aggregated stats)
│   ├── db/
│   │   ├── index.js           # DB connection + init
│   │   ├── schema.js          # SQL schema (bots, automates, access_tokens)
│   │   ├── seed.js            # seedFromConfig() — reads bot.config.json (supports bots array)
│   │   └── queries/           # Query modules (one per entity)
│   │       ├── helpers.js     # Shared updateFields() DRY utility
│   │       ├── bots.js
│   │       ├── access.js
│   │       ├── automates.js
│   │       ├── dashboard.js
│   │       └── index.js       # Re-exports all query modules
│   ├── ws/
│   │   ├── index.js           # WebSocket handler (auth, broadcast, commands, security)
│   │   └── protocol.js        # WS message types + bot commands constants
│   ├── utils/
│   │   ├── crypto.js          # genBotId, genToken (96 hex), genAccessToken (96 hex), genAccessId, maskToken
│   │   └── response.js        # json(), error(), readJson() helpers
│   └── public/                # Static SPA (served directly)
│       ├── index.html         # Loads all module scripts + Alpine.js
│       ├── script.js          # Main entry — Alpine.js store init + chart/toast/confirm (210 lines)
│       ├── state.js           # State mapping functions (mapAutomate, mapBot, mapAccess)
│       ├── helpers.js         # Utility helpers (format, typeClass, botStatus, isAutomateRunning, etc.)
│       ├── api.js             # API helpers (loadResource, apiPost, apiPatch, apiDelete, confirmAndDelete)
│       ├── automate.js        # Automate CRUD methods (openDetail, saveAutomate, toggleFeature, etc.)
│       ├── bot.js             # Bot CRUD methods (openAddBotModal, confirmAddBot, saveBotDirect, etc.)
│       ├── access.js          # Access CRUD methods (openAddAccessModal, confirmAddAccess, etc.)
│       ├── icons.js           # SVG icon path constants (window.ICONS)
│       ├── style.css          # Custom CSS (animations, scrollbars, grid bg, scanner effect)
│       └── views/partials/    # HTML fragments (modular SPA parts)
│           ├── navbar.html                # Sidebar (mobile drawer + desktop permanent)
│           ├── stack-toggle.html          # Hamburger button (mobile only)
│           ├── header.html                # Fixed header (mobile only)
│           ├── footer.html
│           ├── upgrade-skill.html          # Main view loader (5 views + all modals)
│           ├── dashboard-view.html         # Real-time stats dashboard
│           ├── access-view.html            # Access page (loader)
│           ├── access-topbar.html
│           ├── access-list.html            # Access cards (separate per item, trash button)
│           ├── access-detail-modal.html    # Access detail (token with eye, automates list)
│           ├── add-access-modal.html       # Add access + login toggle
│           ├── topbar.html                # Automate page topbar
│           ├── empty-state.html           # Automate empty state
│           ├── automate-overview-card.html # Automate cards (running/idle status, trash button)
│           ├── automate-detail-modal.html  # Automate detail (4 stats, config, toggles, skill/pay, progress)
│           ├── add-automate-modal.html     # Add automate + login toggle
│           ├── bot-view.html              # Bot page (loader)
│           ├── bot-topbar.html
│           ├── bot-list.html              # Bot cards (separate per item, trash button, access count)
│           ├── bot-detail-modal.html      # Bot detail (direct edit, access list with trash)
│           ├── add-bot-modal.html         # Add bot + login toggle
│           ├── edit-bot-modal.html        # Edit bot (legacy, kept for compatibility)
│           ├── guide-view.html            # Guide page (colored, aligned descriptions)
│           ├── confirm-modal.html         # Reusable confirmation dialog
│           └── toast.html                 # Toast notification system
├── client/
│   └── bot/
│       └── bot-client.js      # Sample bot client (connects via WS, supports bots array config)
├── tests/                     # bun:test test suite (82 tests)
│   ├── crypto.test.js         # Token/ID generation (format, uniqueness, length)
│   ├── db.test.js             # DB queries (CRUD, JOINs, FK cascade, CHECK constraints)
│   ├── api.test.js            # API endpoints end-to-end + security validation
│   ├── ws.test.js             # WS protocol constants + security validation
│   └── response.test.js       # HTTP response helpers
├── start-dev.sh               # Startup script (server + bot client together)
├── bot.config.json            # Seed bot definition (1 Shared bot for demo)
├── package.json               # Scripts: dev, dev:all, start, test, bot:dev, bot:start
├── .gitignore
└── CONTEXT.md                 # This file
```

## Domain Model

### Bots
- **bot_id**: `bot_<7 bytes hex>` (e.g. `bot_8f3a2b9c1d4e`)
- **token**: `bot_<96 hex chars>` (384-bit, used by bot client to authenticate via WS)
- **type**: `Dual` (max 2 access tokens) | `Shared` (unlimited access tokens)
- **status**: `connecting` (just created, no client yet) → `connected` (WS authenticated) → `disconnected` (WS closed)
- Created via UI (Generate Token flow) or seeded from `bot.config.json` on server startup

### Access Tokens
- **access_id**: `acc_<7 bytes hex>`
- **token**: `acc_<96 hex chars>` (384-bit, shared with recipient)
- **type**: `Private` (max 1 automate) | `Shared` (unlimited automates) | `Business` (max 1 automate + price/day in game currency)
- **price_per_day**: required for Business type, 0 otherwise
- Linked to a bot via `bot_id` (FK with CASCADE delete)

### Automates (automates table)
- **bearer**: game bearer token (provided by user, max 4096 chars)
- **access_id**: links to an access token (FK) — inherits type, bot, etc.
- **bot_id**: derived from the access token's bot
- **type**: inherited from access token (Private/Shared/Business)
- **balance, diamond, status**: updated in real-time by bot client via WS `state_update`
- **skill_up_running, auto_war_running, auto_work_running**: feature toggles (0/1)
- **skill**: skill type (1=Barrack, 2=War Tech, 3=Scientist, default 3)
- **pay**: payment type (1=Money, 2=Diamond, default 1)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/bots` | List all bots |
| POST   | `/api/bots` | Create bot (requires token) |
| POST   | `/api/bots/generate-token` | Generate a fresh bot token (96 hex chars) |
| POST   | `/api/bots/verify-token` | Verify existing bot token (login) |
| PATCH  | `/api/bots/:id` | Update bot (name/token/type) |
| DELETE | `/api/bots/:id` | Delete bot (cascades to access tokens) |
| GET    | `/api/access` | List all access tokens (with bot_name + usage_count) |
| POST   | `/api/access` | Create access token (requires bot_id, type, optional price_per_day) |
| POST   | `/api/access/verify-token` | Verify existing access token (login) |
| PATCH  | `/api/access/:id` | Update access (name) |
| DELETE | `/api/access/:id` | Revoke access token |
| GET    | `/api/automates` | List all automates (with bot + access info via JOIN) |
| POST   | `/api/automates` | Create automate (requires bearer + access_id) |
| PATCH  | `/api/automates/:id` | Update automate (bearer, access_id, feature toggles, skill, pay, balance, etc.) |
| DELETE | `/api/automates/:id` | Delete automate |
| GET    | `/api/dashboard` | Aggregated stats (totals, running features, sum balance/diamond) |

## Security Measures

- **Token generation**: 96 hex chars (384-bit entropy) using Bun.hash with multiple seeds
- **Input validation**: All API routes validate input types (string/number/boolean)
- **Input length limits**: Tokens max 256 chars (WS auth), bearer max 4096 chars, names max 256 chars
- **SQL injection prevention**: All queries use parameterized `?` placeholders (bun:sqlite)
- **WebSocket auth**: Token validated on auth message, length/type checked
- **WebSocket message validation**: All incoming WS messages type-checked (typeof string/number/object)
- **XSS prevention**: Alpine.js `x-text` used for all user input (no `x-html` with user data)
- **Error handling**: All try/catch blocks log errors and return safe error messages
- **Memory leak prevention**: WS sockets Map and subscribers Set properly cleaned on close

## Frontend Architecture

The SPA uses **Alpine.js** for reactivity with a single `boiauto()` store. The store is composed from multiple module files using the `window.BOIAuto` namespace pattern:

- `script.js` — Main entry: store initialization, chart data, toast, confirm
- `state.js` — State mapping functions (API response → frontend model)
- `helpers.js` — Utility functions (format, typeClass, botStatus, isAutomateRunning)
- `api.js` — API helpers (loadResource, apiPost, apiPatch, apiDelete, confirmAndDelete)
- `automate.js` — Automate CRUD methods
- `bot.js` — Bot CRUD methods
- `access.js` — Access CRUD methods

Each module attaches methods/getters to `window.BOIAuto.<module>`, and `script.js` merges them into the Alpine store via `Object.defineProperties`.

### View routing
5 views switched via `currentView` state:
- `dashboard` — real-time stats overview (default)
- `access` — manage access tokens
- `automate` — manage automates (game accounts)
- `bot` — manage bots
- `guide` — user guide

### Key UI patterns
- **Bot status**: `connecting` (warn spinner) → `connected` (green pulse dot) → `disconnected` (red dot)
- **Access usage**: `X/1` for Private/Business, single number for Shared
- **Automate overview**: Separate cards per item, running/idle status badge, auto status badges (Skill/Training/Work)
- **Automate detail**: 4 stat boxes (Bot ID, Bot Status, Cash green, Diamond blue), config with bearer+access, 3 switch toggles (Skill/Training/Work), Skill Type + Pay selects, progress
- **Bot overview**: Separate cards per item, status badge, trash button, access count
- **Bot detail**: Direct edit (name, token with eye, type), access tokens list with trash
- **Access overview**: Separate cards per item, usage count, trash button
- **Access detail**: Token with eye toggle, automates list with trash
- **Add Bot/Access modal**: Toggle between Register mode and Login mode (verify existing token)
- **Body scroll lock**: when any modal is open
- **When any automation is ON**: bearer token, access, skill type, and pay are all disabled

## Development Workflow

```bash
# Install deps
bun install

# Run server + bot client together (dev)
bun run dev:all    # or: bash start-dev.sh

# Run server only (dev — :memory: DB, pino-pretty, --watch)
bun run dev

# Run server (prod — file DB, JSON logs)
NODE_ENV=production bun run start

# Run bot client (reads bot.config.json)
bun run bot:start

# Run tests
bun test
```

### Environment variables
- `NODE_ENV` — `development` (default) or `production`
- `PORT` — HTTP/WS port (default: 3000)
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`
- `WS_URL` — bot client WS server URL (default: `ws://localhost:3000/ws`)
- `UPDATE_INTERVAL` — bot client state update interval in ms (default: 5000)
- `BOT_TOKEN` — override bot client token (otherwise reads from `bot.config.json`)

### bot.config.json
Seed bot definition at project root. Supports `bots` array format. On server startup, each bot in the array is inserted if the token doesn't already exist.

```json
{
  "bots": [
    {
      "bot_id": "bot_dab25801282759",
      "name": "BOI Shared Bot",
      "token": "bot_<96 hex chars>",
      "type": "Shared",
      "rate_per_day": 0
    }
  ]
}
```

## Testing Strategy

Tests use `bun:test` and run against the real `:memory:` SQLite DB (82 tests, all pass).

- **`tests/crypto.test.js`** — ID/token generation uniqueness, format, length, masking
- **`tests/db.test.js`** — DB queries (CRUD, JOINs, FK cascade, CHECK constraints)
- **`tests/api.test.js`** — End-to-end API tests + input validation/security tests
- **`tests/ws.test.js`** — WS protocol constants + security validation
- **`tests/response.test.js`** — HTTP response helpers

## Coding Conventions

- **Module type**: ESM (`"type": "module"` in package.json)
- **File header**: every file starts with `// <path>` or `<!-- <path> -->` for navigability
- **No inline comments** except path headers (no JSDoc)
- **Max 500 lines per JS file** — split into modules if exceeding
- **DRY**: shared patterns extracted to reusable functions (confirmAndDelete, loadResource, etc.)
- **Logger**: always use child logger with `module` field
- **Error responses**: use `error(msg, status)` helper
- **Query modules**: one file per entity, exports `<entity>Queries` object
- **API modules**: one file per resource, exports async `<entity>Router(req, url, idStr, log)`
- **Frontend modules**: one file per concern, attaches to `window.BOIAuto.<module>`
- **Tests**: co-located in `tests/`, naming `<module>.test.js`

## Recent Changes

- **v2.0.0**: Major audit — modular frontend (script.js split into 7 modules), security hardening (input validation, token length limits, WS message validation), 96-hex-char tokens, memory leak fixes, automate detail redesign (switch toggles, skill/pay persistence), overview cards with trash buttons, card click behavior fixed, CONTEXT.md updated.
- **v1.1.0**: Refactor — removed dead code, extracted updateFields() helper, added apiPatch/apiDelete helpers.
- **v1.0.0**: Initial release with full bot/access/automate/dashboard/guide flow, real-time WS, modular architecture, test suite.
