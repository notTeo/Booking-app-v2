# Deploy runbook and rollback plan

Frontend on **Vercel**, API + PostgreSQL on **Railway**, email via **Resend**.
Nothing has been deployed yet: section 6 is the first deploy, section 8 is every
deploy after it. Steps that depend on a dashboard's current UI say **(verify)**:
those screens move, so check the label rather than trusting this file.

Contents: 1 Launch blockers · 2 Architecture and domains · 3 Environment
variables · 4 Railway · 5 Vercel, Resend, DNS · 6 First deploy · 7 Smoke test ·
8 Routine deploys · 9 Rollback · 10 Operating it · 11 Known limits

---

## 1. Launch blockers (do not go live until each is closed)

| # | Item | Why it blocks | Where |
|---|---|---|---|
| 1 | Replace the **Hairology placeholder data** and set `HAIROLOGY_DATA_CONFIRMED = true` | The seed refuses to run on placeholders; they would appear on the public page | `api/src/admin/hairologyData.ts` |
| 2 | Real **Terms, Privacy and DPA text** | The DPA page is placeholder and says so. `/terms` and `/privacy` are drafts | `web/src/locales/translations.ts` |
| 3 | Decide the **owner's reserved-slug list** | Only routes plus a guessed list (admin, www, support…) are reserved | `api/src/validators/slug.ts` |
| 4 | **Same-site domains** for web and API (section 2) | Cross-site cookies are blocked by Safari and some browsers, which breaks staying logged in | DNS |
| 5 | **Resend sending domain verified** | Unverified domain = verification / reset / invite emails don't arrive, so nobody can register | Resend + DNS |
| 6 | **Database backup** confirmed working | Migrations are forward-only; a backup is the only way back from a bad data change | Railway (verify) |

Deferred by decision, not forgotten: the Postgres exclusion constraint against
double booking (Phase B). Double booking is currently prevented by serializable
transactions with retry, which the concurrency tests cover. There is no CI yet
(Phase B), so **run the checks in section 8 yourself before each deploy**.

---

## 2. Architecture and domains

```
browser ──HTTPS──> https://example.gr        Vercel  (static React app)
   │
   └─HTTPS + cookies─> https://api.example.gr  Railway (Express, Docker) ──> Railway Postgres
                                                     └──> Resend (email)
```

**Use a subdomain of the same registrable domain for the API** (`api.example.gr`
for `example.gr`). The refresh-token cookie is `HttpOnly; Secure;
SameSite=None` in production, and it is set by the API host. If the API lived on
`something.up.railway.app` while the site is on `example.gr`, the browser would
treat the cookie as third-party, and Safari and privacy-focused browsers drop
those. Symptom: login works, then the user is logged out on reload or after 15
minutes when the access token expires. Same-site domains avoid it.

- Public booking page: `https://example.gr/<slug>` (e.g. `/hairology`). Old `/p/<slug>` links redirect.
- `https://` is mandatory on both: the cookie is `Secure`.
- `www`: pick one canonical host and redirect the other to it in Vercel. Put **both** in `CLIENT_URLS` if both can serve the app.

---

## 3. Environment variables

The API validates its environment at startup and exits, listing **every** problem, if anything is missing or malformed. A crash-looping deploy with an `[env] Invalid environment configuration` log line is a config problem, not a code problem.

### API (Railway service variables)

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required, no default. Also baked into the Docker image. Enables HSTS and `Secure`/`SameSite=None` cookies, and **forces rate limiting on**. |
| `DATABASE_URL` | Railway's Postgres URL | Use a reference to the Postgres service's variable (verify syntax), not a pasted copy. |
| `CLIENT_URLS` | `https://example.gr` | Comma-separated. Allowed by CORS. **The first entry is used in email links.** Exact origins, no path. |
| `JWT_ACCESS_SECRET` | 64 random bytes, hex | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a **different** 64 random bytes | |
| `JWT_ACCESS_EXPIRES_IN` | `15m` (default) | Format: number + `s`/`m`/`h`/`d`/`w`. A bare number is rejected. |
| `JWT_REFRESH_EXPIRES_IN` | `30d` (default) | Also the cookie lifetime. |
| `RESEND_API_KEY` | from Resend | |
| `EMAIL_FROM` | `Bookly <noreply@example.gr>` | Must be on the **verified** Resend domain. |
| `PORT` | leave unset | Railway injects it. |
| `INVITE_EMAIL_OVERRIDE` | **must be unset** | Dev-only: it redirects every team-invite email to one address. |
| `RATE_LIMIT_DISABLED` | **must be unset** | Ignored in production anyway. |

`api/.env.example` is the template. Never commit `.env`.

### Web (Vercel project variables)

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://api.example.gr` | No trailing slash. **Baked into the bundle at build time**: changing it needs a redeploy (rebuild), not a restart. |

---

## 4. Railway

Create the project with two services: **PostgreSQL** and the **API**.

1. **API service** → deploy from the GitHub repo, **root directory `api`** (verify). Railway builds `api/Dockerfile`.
2. Set the variables from section 3.
3. **Health check path `/health`** (verify where it's set). `/health` runs `SELECT 1`: 200 when the DB answers, 503 when it doesn't. With a health check configured, a deploy that never becomes healthy should not replace the running one (verify this in your project's behaviour on the first bad deploy).
4. **Custom domain** `api.example.gr` on the API service; Railway shows the DNS record to create (section 5).
5. **Postgres backups**: turn them on and note the retention (verify the feature and plan). Do one manual restore test into a scratch database before launch.
6. Give the API one instance. The rate limiters are in-memory per process, so multiple instances multiply the limits.

**What the container does on start** (`api/Dockerfile`): `npx prisma migrate deploy && node dist/app.js`. Migrations run automatically on every deploy, **before** the new code serves traffic. If a migration fails the container exits and the deploy fails.

**Proxy hops:** the app uses `trust proxy = 1`, correct for Railway's single edge. If you later put Cloudflare or another proxy in front, client IPs, and therefore rate limiting, will be wrong until that number is raised to 2.

---

## 5. Vercel, Resend, DNS

### Vercel

1. Import the repo, **root directory `web`**, framework Vite (verify auto-detection). Build `npm run build`, output `dist`.
2. Set `VITE_API_URL` (section 3) for **Production**.
3. `web/vercel.json` already rewrites every path to `index.html`, which is what makes `/<slug>` and deep links work. Don't remove it.
4. Add the domain(s); Vercel shows the DNS records.

### Resend

1. Add the sending domain in Resend and create the DNS records it lists (SPF, DKIM, optionally DMARC).
2. Wait until Resend shows the domain **verified**, then send a test.
3. Create an API key → `RESEND_API_KEY`.

### DNS

| Host | Type | Points to | For |
|---|---|---|---|
| `example.gr` (apex) | A / ALIAS per Vercel's instructions | Vercel | web |
| `www` | CNAME | Vercel | web (redirect to canonical) |
| `api` | CNAME | the target Railway shows | API |
| Resend's records | TXT / CNAME / MX as listed | Resend | email |

Lower the TTL to 300 s a day before cutover so a mistake is quick to undo.

---

## 6. First deploy, in this order

Pre-flight (on your machine, from a clean checkout of the branch you are deploying):

```bash
cd api && npm ci && npx tsc --noEmit && npm run lint && npm test   # TEST_DATABASE_URL must point at a *test* DB
cd ../web && npm ci && npx tsc -b && VITE_API_URL=http://x npm test && VITE_API_URL=http://x npm run build
```

Then:

1. **Postgres** exists and is backed up (section 4).
2. **Deploy the API** with all variables set. Watch the logs: migrations apply from scratch (a fresh database runs the whole history), then `Server running`. `GET https://<railway-url>/health` → `{"status":"ok","db":"up"}`.
3. **Attach `api.example.gr`**, wait for DNS + TLS, re-check `/health` on it.
4. **Create the first tenant**, either a generic one or Hairology (section 10). Do this **before** the site is public.
5. **Deploy the web app** on Vercel with `VITE_API_URL=https://api.example.gr`. Attach the domain.
6. **Run the smoke test** (section 7) against the real domain.
7. Only then announce the link.

---

## 7. Smoke test (after every first deploy, and after any deploy touching auth, cookies, CORS or email)

Use a real browser, on the real domain, ideally also on an iPhone (Safari is the cookie canary).

- [ ] `https://api.example.gr/health` → 200, `db: up`. Response has an `X-Request-Id` header.
- [ ] `https://example.gr/` loads; browser network tab shows **no requests to Google Fonts** and no CORS errors.
- [ ] `https://example.gr/<slug>` shows the shop; `/p/<slug>` redirects to it; `/nonsense` shows the 404 page.
- [ ] **Register** a throwaway account → verification email arrives (check spam) → link opens `https://example.gr/verify-email…` → can log in.
- [ ] **Stay logged in**: reload the page, close and reopen the tab, and wait for the access token to expire (15 min): still logged in. If not, it's the cookie (section 2).
- [ ] **Forgot password** email arrives; the reset works.
- [ ] As the tenant owner: create a service, a team member, working hours.
- [ ] As a customer (private window): book on `/<slug>`; the confirmation email arrives; the **cancel link** works.
- [ ] Owner sees the booking; export and delete that customer from the customer page.
- [ ] Invite a team member: the email goes to *that* address (proves `INVITE_EMAIL_OVERRIDE` is unset).
- [ ] Delete the throwaway data.

---

## 8. Routine deploys

Deploys are triggered by pushing to the branch each service tracks (verify which). Before pushing:

1. Run the pre-flight commands from section 6. The API suite has one known intermittent failure (`concurrency.test.ts`, logged in the plan): if it's the only failure, rerun once; a second failure is real.
2. **Does the change include a migration** (`api/prisma/migrations/`)?
   - **No** → deploy.
   - **Yes** → take a **manual database backup first**, and check the migration is **additive only** (new table, or new nullable/defaulted column). Anything that drops, renames, retypes or backfills is a one-way door: do it in two deploys (expand, then later contract) or accept that the only way back is a restore (section 9).
3. Deploy the API **before** the web app if the web needs a new API behaviour; web first only if the API change is backward-compatible with the old web.
4. Watch the API logs through the first requests. Failed `request` lines carry a `requestId`; grep that id to see everything that request logged.
5. Run the relevant smoke-test lines.

---

## 9. Rollback

**Decide by what changed:**

| What went wrong | Fix | Time |
|---|---|---|
| Web bug, no API change | Vercel → Deployments → previous good deployment → **Promote / Instant Rollback** (verify label) | seconds |
| API bug, **no migration** in that deploy | Railway → Deployments → redeploy the previous successful deployment (verify), or `git revert` and push | minutes |
| API bug, deploy **included an additive migration** | Same as above. The old code runs fine against the extra column/table. Leave the schema alone. | minutes |
| Deploy included a **destructive or data-changing migration**, and data is now wrong | **Restore the backup** taken before the deploy (below), then deploy the previous code | 30–60+ min, and loses writes since the backup |
| Bad env var | Fix the variable; Railway redeploys. Startup validation names the bad one. | minutes |
| API down, DB fine | Check Railway deployment logs, then `/health`. Redeploy previous. | minutes |
| Email not arriving | Not a rollback: section 10 | |

**Migrations are forward-only.** There is no automated "down" migration, and Prisma won't run one. Rolling the code back does not undo a schema change. That is why step 2 in section 8 exists.

**Restoring the database** (verify the exact mechanism in Railway):
1. Put the site in a safe state: pause the API service so nothing writes while you restore.
2. Restore the pre-deploy backup, ideally into a **new** database first, and inspect it.
3. Point `DATABASE_URL` at the restored database (or swap it in), deploy the **previous** code, and check `/health`.
4. Everything written after the backup is lost, including bookings made in that window. Tell each shop owner exactly which time window is affected so they can re-enter or contact those customers.

**Rolling back the first deploy** is simple: nothing depends on it. Remove the DNS records for `example.gr` and `api`. There are no users to lose, and the database can be deleted and recreated.

**Sessions:** rolling back code doesn't log anyone out. Changing `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` **does** log everybody out, since all tokens become invalid. That is the intended response to a leaked secret, and a nuisance otherwise.

---

## 10. Operating it

### Tenants (admin CLI)

The scripts run with whatever `DATABASE_URL` is in their environment. For production, run them from your machine with the **production** database's *public* connection URL (Railway shows one; verify) in `DATABASE_URL`, for example through `railway run` (verify) or by exporting the variable for a single command. Don't put it in `api/.env` where a later dev command could pick it up.

```bash
cd api
# a customer:
TENANT_PASSWORD='…' npm run tenant:create -- --owner-name "Maria K" \
  --owner-email maria@example.com --shop-name "Maria's Salon" --slug marias-salon
# Hairology (only after blocker 1 is closed):
HAIROLOGY_OWNER_NAME='…' HAIROLOGY_OWNER_EMAIL='…' npm run seed:hairology
```

Both refuse to overwrite an existing email or slug. Without a password variable, one is generated and printed **once**: share it securely and tell the owner to use "Forgot password" to choose their own. **Never run `seed:dev-visual-check`** against production (it refuses when `NODE_ENV` is `production` or unset, but don't rely on that).

### Logs

JSON, one object per line. Every request logs `method`, `path` (no query string, since tokens live there), `status`, `ms`, and a `requestId` that is also returned to the client as `X-Request-Id`. To trace a user's report: get the `X-Request-Id` from their failing request (browser network tab) and search for it. Log lines identify users by id, never by email.

### Common incidents

- **Everyone gets errors / `/health` is 503** → database. Check Railway Postgres status and connection count; the API reconnects by itself when it's back.
- **Users blocked from one place** → limits are per IP address (shared wifi, a carrier's NAT and an office all look like one IP), and they count successful requests too: login **and** register share 10 per 15 min; password-reset requests 5 per hour; public booking and cancel 20 per 15 min; public page reads 100 per 15 min. A busy shop taking many bookings from its own wifi can hit the booking limit. Wait it out, or raise the number in `api/src/middleware/rateLimiter.ts` and deploy. They cannot be switched off in production.
- **Booking page says "busy, try again"** → the server hit its retry budget under simultaneous bookings (503 `BOOKING_BUSY` with `Retry-After`). It resolves itself within seconds; it is *not* an outage.
- **Emails missing** → Resend dashboard first (bounces, domain status), then the API logs for `Failed to send … email`. Registration fails visibly when the verification email can't be sent.
- **Deploy crash-loops on start** → read the first log line. `[env] Invalid environment configuration` lists what to fix; otherwise a migration error names the migration.
- **CORS errors in the browser** → the web origin isn't in `CLIENT_URLS`, or has a trailing slash or a different scheme/host (`www` vs apex).
- **Secrets rotation** → change the Railway variable and redeploy; see "Sessions" above for the effect.

### Legal changes

When the Terms or Privacy text changes materially, bump `TERMS_VERSION` in `api/src/config/terms.ts` and the "last updated" date on `/terms` and `/privacy` **in the same deploy**. New registrations then record the new version. Existing users keep the version they accepted.

---

## 11. Known limits (accurate today, all deliberate or deferred)

- **No CI**: checks are manual (Phase B).
- **Rate limiters are in-memory**: one API instance only.
- **No database-level double-booking guard**: application-level serializable transactions only, until the exclusion constraint is done (Phase B).
- **Greek text uses a fallback font** for Greek glyphs: Poppins and League Spartan ship no Greek. Unchanged from before self-hosting.
- **Hard delete only** for customers: erasing a customer removes their bookings and reopens those slots.
- **No monitoring/alerting** is set up: add an uptime check on `/health` (any external pinger) so you find out before a customer does.
