# QuizSphere

QuizSphere is a full-stack community platform for creating and participating in quizzes and polls. The repository contains a React/Vite client and an Express/Mongoose API. The implementation uses live API/database responses and renders explicit empty, loading, and error states rather than seeding production-style sample content.

## Current implementation

- Responsive React workspace with a collapsible desktop sidebar, mobile drawer, top bar, protected routes, and role-gated admin areas.
- Landing, sign-in, registration, unified Explore, quiz/poll details, Creator Studio, quiz/poll editors, attempts, leaderboard, wallet, notifications, profile, settings, and admin screens.
- Express REST API under `/api/v1`, Zod validation, centralized errors, rate limits, Helmet, CORS allowlist, CSRF double-submit checks, bcrypt password hashes, short-lived access cookies, rotating refresh sessions, and session revocation.
- Mongoose schemas for users, refresh sessions, categories, platform rules, quiz versions/questions, polls/options, attempts, votes, ledger entries, prize-pool projections, reviews, notifications, ratings, reports, and audit records.
- Server-calculated quiz scoring, timer enforcement, private answer payloads, vote uniqueness, result-visibility checks, QCoin ledger entries, and admin-configurable creation and participation limits.
- Creators can publish quizzes without admin approval; polls continue through admin review. Admins can suspend published quizzes with a required reason, which stays visible to the creator and allows editing and republishing.
- General quizzes are open-ended and may pay one fixed reward per passing participant from a creator-funded pool. Special Event quizzes have scheduled start/close times, immediate private results, post-close public rankings, and automatically settled rank prizes after close.
- Admins set the free question limit, whether Special Events require a Creator Pass, pass purchase prices, and fixed platform buyback prices. Required participation passes transfer to the quiz creator. Users can sell owned passes directly back to QuizSphere at the configured buyback price.
- Signup bonus is credited by an idempotent ledger transaction (100 QCoins by default). MongoDB transactions are required for multi-document economy and moderation operations.
- Optional password-reset email delivery via SMTP. In development without SMTP, a reset URL is returned only for an existing active account so the local reset flow can be exercised.
- Unit tests cover scoring and content validation.

### Not yet complete

This is an incremental implementation, not a claim that every item in the supplied product brief is finished. Poll reward funding/settlement, full refund/reconciliation workflows, upload/Cloudinary support, email verification, community-rating/report moderation screens, and some extended admin audit/user-inspection workflows still need implementation and end-to-end verification. The quiz prize and pass flows have unit coverage but still need MongoDB-backed integration and production-like concurrency testing.

## Requirements

- Node.js 20+ and npm 10+
- MongoDB Atlas or a MongoDB replica set (transactions must be enabled)
- Optional SMTP credentials for password-reset email delivery

## Local setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set `MONGODB_URI` in `server/.env` to an Atlas connection string or a local replica-set connection string. A standalone local MongoDB server does not support the transactions used for registration bonuses, wallet operations, quiz attempts, voting, and moderation.

Start both apps from the repository root:

```bash
npm run dev
```

- Vite client: <http://localhost:5173>
- API: <http://localhost:4000/api/v1/health>

Vite proxies `/api` to `http://127.0.0.1:4000` by default. Set `VITE_API_PROXY_TARGET` if your local API runs elsewhere. In deployment, the browser uses relative `/api/v1` paths unless `VITE_API_BASE_URL` is set to a full API base URL such as `https://api.example.com/api/v1`.

### First administrator

1. Register a normal account through the application.
2. With trusted operator access to the configured database, run:

   ```bash
   npm run admin:promote -- your-account@example.com
   ```

3. Sign out and sign in again so the role in the new session reflects the administrator role.

Registration never accepts a client-provided role. The promotion script writes an audit event and must only be run by an operator with database access.

## Environment variables

### Server (`server/.env`)

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API listen port (default `4000`) |
| `MONGODB_URI` | MongoDB connection string |
| `CLIENT_ORIGIN` | Comma-separated allowed browser origins |
| `ACCESS_TOKEN_SECRET` | Random secret, at least 32 characters |
| `REFRESH_TOKEN_SECRET` | Different random secret, at least 32 characters |
| `ACCESS_TOKEN_TTL` | Access JWT lifetime (default `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh session lifetime (default `30`) |
| `COOKIE_SAME_SITE` | `lax` by default in development and `none` in production; override with `lax`, `strict`, or `none` (`none` requires HTTPS and automatically enables Secure cookies) |
| `COOKIE_DOMAIN` | Optional shared cookie domain when client and API use sibling subdomains |
| `SIGNUP_BONUS_QCOINS` | Initial signup bonus (default `100`; can later be changed by admins) |
| `COOKIE_SECURE` | Set `true` in HTTPS production |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional password-reset mail transport |

Generate independent strong token secrets for each deployment. Never put secrets in `client/.env` or a `VITE_*` variable. `VITE_API_BASE_URL` is a public API URL, not a secret.

## API overview

All endpoints return `{ "success": true, "data": ... }` on success and `{ "success": false, "error": { "code", "message" } }` on failure.

- `POST /api/v1/auth/register|login|logout|refresh|forgot-password|reset-password`, `GET /api/v1/auth/me`
- `GET /api/v1/platform/rules`
- `GET /api/v1/explore` with `type`, `search`, `categoryId`, `difficulty`, `sort`, `page`, `limit`; `GET /categories`, `/quizzes/:id`, `/quizzes/:id/results`, `/polls/:id`
- `GET /api/v1/users/me/overview|attempts|notifications|wallet|wallet/transactions`; profile and notification read endpoints use `PATCH`
- `/api/v1/creator` for drafts, creator-published quizzes, poll submissions, creator analytics, and publishing approved polls
- `/api/v1/participation` for quiz attempt creation, answer saves, submission, and result retrieval
- `/api/v1/passes` for pass inventory, QCoin purchases, and platform buyback (`POST /sell`)
- `/api/v1/polls/:id/vote` and `/api/v1/polls/me/poll-votes`
- `GET /api/v1/leaderboards?type=performance|consistency|creators&period=week|month|all`
- `/api/v1/admin` for overview, reviews, published-quiz suspension, users, configuration, categories, ledger, adjustments, settlements, and audit logs

Wallet-moving purchases, quiz creation, and pass sales require an `Idempotency-Key`. Prices and eligibility are checked on the server.

## Business and security notes

- The server is authoritative for roles, balances, prices, quiz answers, scores, vote eligibility, and review decisions.
- Public quiz details do not include questions or answer keys. Questions are returned only after a valid attempt starts; scores are calculated on the server.
- Anonymous poll responses contain no voter identity. Public result payloads follow each poll's visibility setting.
- QCoins are virtual, non-cash credits and cannot be withdrawn. Pass buybacks credit users at the administrator-configured amount. Every balance change is recorded as a ledger entry; historical ledger rows are not edited.
- The initial free quiz question limit is 10. Pricing and limits are stored in `PlatformConfig` and can be changed in the admin workspace. A change affects new creation/participation actions; already committed ledger entries remain unchanged, and published content keeps its disclosed terms.
- MongoDB multi-document transactions require Atlas or a replica set. Do not bypass transaction errors in production.
- Production should use HTTPS, `COOKIE_SECURE=true`, a narrow `CLIENT_ORIGIN` allowlist, rotated secrets, restricted Atlas network access, and SMTP credentials stored in the hosting provider's secret manager.

## Tests and builds

```bash
npm run typecheck
npm run test --workspace server
npm run build
```

Tests cover deterministic score calculation and rank payouts, General/Special Event validation, Creator Pass eligibility, exact multiple-choice matching, unanswered questions, quiz answer-key validation, and poll option/date validation. A MongoDB-backed integration test suite and complete settlement concurrency tests remain to be added.

## Deployment outline

### Render (API)

- Create a Node web service with repository root as the working directory.
- Build command: `npm install && npm run build --workspace server`
- Start command: `npm run start --workspace server`
- Configure the server environment variables above. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `MONGODB_URI`, both token secrets, `CLIENT_ORIGIN`, and SMTP values if email is enabled.
- Use a MongoDB Atlas replica set. Confirm `/api/v1/health` reports `database: connected`.

### Vercel (client)

- Build command from the repository root: `npm install && npm run build --workspace client`
- Output directory: `client/dist`
- Set Vercel Root Directory to `client` and enable including files outside the root directory if using the npm workspace install/build commands. `client/vercel.json` proxies `/api/*` to Render and sends client-side routes to `index.html`; it is kept inside `client` so Vercel loads it when that folder is the project root. The root `vercel.json` provides the equivalent routing when the Vercel Root Directory is the repository root.
- Do not set `VITE_API_BASE_URL` in Vercel when using this proxy; the client should use its default relative `/api/v1` URL.
- On the API, set `CLIENT_ORIGIN` to the exact website origin. Leave `COOKIE_DOMAIN` unset so the proxied API cookies are scoped to the website host. Production defaults to `COOKIE_SAME_SITE=none` and automatically enables Secure cookies.

### MongoDB Atlas

Create a database user with least-privilege access, restrict network access to the deployment environment where possible, and use a replica-set/Atlas connection string so transactional operations work.
