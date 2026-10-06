# Deployment and rollback

Frontend on **Vercel**, API + PostgreSQL on **Railway**, email via **Resend**.
Section 6 is the first deploy, section 8 is every deploy after it. Steps that depend on a dashboard's current UI say **(verify)**:
those screens move, so check the label rather than trusting this file.

Contents: 1 Launch blockers · 2 Architecture and domains · 3 Environment
variables · 4 Railway · 5 Vercel, Resend, DNS · 6 First deploy · 7 Smoke test ·
8 Routine deploys · 9 Rollback · 10 Operating it · 11 Known limits

---

## 1. Launch blockers (do not go live until each is closed)

| # | Item | Why it blocks | Where |
|---|---|---|---|
| 1 | Replace the **pilot tenant's placeholder data** and set `HAIROLOGY_DATA_CONFIRMED = true` | The pilot seed refuses to run on placeholders; they would appear on the public page | `api/src/admin/hairologyData.ts` |
| 2 | Real **Terms, Privacy and DPA text** | The DPA page is placeholder and says so. `/terms` and `/privacy` are drafts | `web/src/locales/translations.ts` |
| 3 | Decide the **owner's reserved-slug list** | Only routes plus a guessed list (admin, www, support…) are reserved | `api/src/validators/slug.ts` |
| 4 | **Same-site domains** for web and API (section 2) | Cross-site cookies are blocked by Safari and some browsers, which breaks staying logged in | DNS |
| 5 | **Resend sending domain verified** | Unverified domain = verification / reset / invite emails don't arrive, so nobody can register | Resend + DNS |
| 6 | **Database backup** confirmed working | Migrations are forward-only; a backup is the only way back from a bad data change | Railway (verify) |
| 7 | **`btree_gist` allowed on Railway's Postgres** | The overlap-guard migrations (bookings and working-hours schedules) run `CREATE EXTENSION btree_gist`. If the host refuses it, the first deploy fails at migration time. Check in 1 minute: create a throwaway Postgres on Railway and run `CREATE EXTENSION IF NOT EXISTS btree_gist;` in its query tab or `psql`. It should succeed (it is a trusted extension on PG13+). Delete the throwaway after. | Railway |

Double booking is prevented twice: the application checks and retries inside
READ COMMITTED transactions, and the database itself refuses overlapping
bookings for one provider (`Booking_no_overlap`, section 4). CI (GitHub Actions,
`.github/workflows/ci.yml`) runs on every push (feature branches get a fast run; pull requests and pushes to `dev`/`main` get the full run including e2e); section 8 says what to check
before deploying.

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

- Public booking page: `https://example.gr/<slug>` (e.g. `/marias-salon`). Old `/p/<slug>` links redirect.
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
| `EMAIL_FROM` | `BeBooked <noreply@example.gr>` | Must be on the **verified** Resend domain. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | references to the bucket (section 4) | Photo storage. **Required in production**: the API exits at start without all five. |
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

**Photo bucket.** Photos (shop, team members, products) are stored in a Railway bucket in the same project, never in Postgres or on the API's disk. The database holds only each file's URL (`/media/...`); the bucket is private and the API serves the files at that path.

1. Project canvas → **Create** → **Bucket**, region closest to the API (EU), name `bebooked-media`.
2. Open the bucket → **Credentials**: it lists the endpoint, region, bucket name, access key id and secret access key.
3. API service → **Variables**: add `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, each as a reference to the bucket's matching credential (verify the reference names in the picker), then deploy.
4. Check: upload a shop photo in production and open its `/media/...` URL on the API domain.

Deleting a photo, a team member, a product or a shop deletes its files. A failed delete is logged (`Could not delete stored files`) and leaves an orphan in the bucket, nothing else.

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

Pre-flight: **CI must be green on the commit you are deploying** (API tests under three timezones, schema-vs-migrations check, web typecheck/lint/tests/build). To run the same checks yourself, from a clean checkout:

```bash
cd api && npm ci && npx tsc --noEmit && npm run lint && npm test   # TEST_DATABASE_URL must point at a *test* DB
cd ../web && npm ci && npx tsc -b && VITE_API_URL=http://x npm test && VITE_API_URL=http://x npm run build
```

Then:

1. **Postgres** exists and is backed up (section 4).
2. **Deploy the API** with all variables set. Watch the logs: migrations apply from scratch (a fresh database runs the whole history), then `Server running`. `GET https://<railway-url>/health` → `{"status":"ok","db":"up"}`.
3. **Attach `api.example.gr`**, wait for DNS + TLS, re-check `/health` on it.
4. **Create the first tenant**, either a generic one or the pilot tenant (section 10). Do this **before** the site is public.
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

1. **CI green** on the commit (or run the pre-flight commands from section 6). The API suite has one known intermittent failure (`concurrency.test.ts`): if it is the only failure, re-run that job once; a second failure is real. The e2e browser suite (Playwright) runs in CI on the full pipeline (pull requests and pushes to `dev`/`main`); run `npm run e2e` locally for fast feedback on booking-flow, routing or auth changes.
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

**The schedule overlap guard** (`ShopWorkingSchedule_no_overlap`) is an exclusion constraint on `ShopWorkingSchedule`: for each team member (working hours are per member; there are no shop-wide schedules), two **active** working-hours schedules cannot share a date (touching ranges are fine; a missing end date means open-ended; inactive schedules are ignored). The API checks first and answers a descriptive `409`; the constraint only fires in a race and gets the same `409`. **Before deploying its migration**, take a backup and run `npm run audit:schedule-overlaps` (read-only, from `api/`, e.g. `railway run npm run audit:schedule-overlaps`) against the target database: the migration fails while overlapping active schedules exist, and they must be fixed by hand in the app (turn one off or change its dates). Like the booking guard, it is not in `prisma/schema.prisma` and `migrate diff` does not report it.

**The overlap guard** (`Booking_no_overlap`) is an exclusion constraint on the `Booking` table: one provider cannot have two bookings whose time ranges overlap unless one is `CANCELED` or `NO_SHOW`. Back-to-back bookings (one ends exactly when the next starts) are fine. If it ever fires, the API answers `409 SLOT_TAKEN` (the same answer as the normal overlap check) and logs nothing unusual: that is expected under a race. It does not appear in `prisma/schema.prisma` because Prisma cannot model exclusion constraints; `prisma migrate diff` reports no difference and does not try to drop it. Booking writes also take a short per-provider lock in the database so simultaneous bookings for one provider queue up instead of colliding (transactions are READ COMMITTED, not SERIALIZABLE, on purpose: see the plan's "Exclusion constraint" section). Anything that inserts bookings directly (a data import, a script) must respect the constraint, and a migration to a database that already holds overlapping rows will fail until they are resolved.

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
# Pilot tenant seed (only after blocker 1 is closed):
HAIROLOGY_OWNER_NAME='…' HAIROLOGY_OWNER_EMAIL='…' npm run seed:hairology
```

`tenant:create` takes `--plan solo|team|business` (default team) and creates the shop already active, with no trial.

Both refuse to overwrite an existing email or slug. Without a password variable, one is generated and printed **once**: share it securely and tell the owner to use "Forgot password" to choose their own. **Never run `seed:dev-visual-check`** against production (it refuses when `NODE_ENV` is `production` or unset, but don't rely on that).

### Plans (admin CLI)

There is no checkout yet: plans are set by hand. A shop someone creates for themselves starts a 30-day Team trial (only their first shop; later ones start inactive). When the trial ends, or while a shop is inactive, it is read-only and its public page takes no new bookings. Limits live in `api/src/services/plan.service.ts`.

```bash
cd api
# they paid: activate a plan (ends any trial)
npm run shop:plan -- --slug marias-salon --plan team
# stopped paying: read-only, data kept
npm run shop:plan -- --slug marias-salon --status inactive
# extend or restart a trial
npm run shop:plan -- --slug marias-salon --status trialing --trial-days 14
```

Without `--status` the shop becomes active; without `--plan` it keeps its plan. The script refuses a plan with fewer staff places than the shop has bookable staff (Solo 1, Team 5, Business 15): have the owner deactivate staff first. Shops that existed before plans were added are active on Business until you change them.

### Logs

JSON, one object per line. Every request logs `method`, `path` (no query string, since tokens live there), `status`, `ms`, and a `requestId` that is also returned to the client as `X-Request-Id`. To trace a user's report: get the `X-Request-Id` from their failing request (browser network tab) and search for it. Log lines identify users by id, never by email.

### Uptime monitoring

`.github/workflows/uptime.yml` checks the API's `/health` (which includes the database) and, optionally, the web app every 15 minutes. If either is down, the run fails and GitHub emails the repository's watchers. **Turn it on** after the first deploy: repository *Settings → Secrets and variables → Actions → Variables* → add `HEALTH_URL` (`https://api.example.gr/health`) and optionally `WEB_URL` (`https://example.gr/`). Until `HEALTH_URL` is set it does nothing. Run it once by hand from the *Actions* tab to confirm it goes green.

It is a floor, not a ceiling: GitHub's scheduler is best-effort (runs can be minutes late or skipped) and switches scheduled workflows **off after 60 days without repository activity**. For alerts you can rely on (SMS/phone, 1-minute checks) also point a dedicated external pinger at the same `/health` URL.

### Common incidents

- **Everyone gets errors / `/health` is 503** → database. Check Railway Postgres status and connection count; the API reconnects by itself when it's back.
- **Users blocked from one place** → limits are per IP address (shared wifi, a carrier's NAT and an office all look like one IP), and they count successful requests too: login, register and reset-password share 10 per 15 min; token refresh 60 per 15 min; password-reset requests 5 per hour; public booking and cancel 20 per 15 min; public page reads 100 per 15 min. A busy shop taking many bookings from its own wifi can hit the booking limit. Wait it out, or raise the number in `api/src/middleware/rateLimiter.ts` and deploy. They cannot be switched off in production.
- **Booking page says "busy, try again"** → the server hit its retry budget under simultaneous bookings (503 `BOOKING_BUSY` with `Retry-After`). It resolves itself within seconds; it is *not* an outage.
- **Emails missing** → Resend dashboard first (bounces, domain status), then the API logs for `Failed to send … email`. Registration fails visibly when the verification email can't be sent.
- **Deploy crash-loops on start** → read the first log line. `[env] Invalid environment configuration` lists what to fix; otherwise a migration error names the migration.
- **CORS errors in the browser** → the web origin isn't in `CLIENT_URLS`, or has a trailing slash or a different scheme/host (`www` vs apex).
- **Secrets rotation** → change the Railway variable and redeploy; see "Sessions" above for the effect. In production each JWT secret must be at least 32 characters and the two must differ, or the API refuses to start (`[env] Invalid environment configuration`).
- **One person can't log in, "Too many requests"** → besides the per-IP limits, login allows 10 failed attempts per email address per 15 minutes, from any address. Someone guessing at an account locks its owner out of logging in for that window; password reset still works. Wait it out.

### Legal changes

When the Terms or Privacy text changes materially, bump `TERMS_VERSION` in `api/src/config/terms.ts` and the "last updated" date on `/terms` and `/privacy` **in the same deploy**. New registrations then record the new version. Existing users keep the version they accepted.

---

## 11. Known limits (accurate today, all deliberate or deferred)

- **Access tokens are not revoked.** A password reset, a password change and "log out everywhere" end every session's refresh token at once, but an access token already issued keeps working until it expires (15 minutes, `JWT_ACCESS_EXPIRES_IN`). Revoking it would cost a database read on every request. Changing a password or email needs the current password, so a stolen access token cannot be turned into a lasting takeover. (Audit AU-06, accepted 2026-10-06.)
- **No cap on bookings per phone number.** A customer may hold any number of bookings; the per-IP limit on public writes (20 per 15 minutes) is the only brake on bulk booking. A shop that gets flooded cancels the bookings from its calendar. (Audit PB-02, accepted 2026-10-06.)
- **Personal durations show on the public slot grid.** A customer who identifies themselves in the first step of the booking wizard is offered times sized to their own durations, so the grid for a known phone with a personal duration differs from an unknown one. (Audit TI-05, accepted 2026-10-06.)

- **The e2e suite only runs on the full CI pipeline** (pull requests and pushes to `dev`/`main`, not feature-branch pushes): run `npm run e2e` locally for booking-flow, routing or auth changes.
- **Rate limiters are in-memory**: one API instance only.
- **The overlap guard is per provider**: it stops one provider being double booked; it does not stop two different providers taking the same customer at the same time (that is allowed on purpose).
- **Greek text uses a fallback font** for Greek glyphs: Poppins and League Spartan ship no Greek. Unchanged from before self-hosting.
- **Hard delete only** for customers: erasing a customer removes their bookings and reopens those slots.
- **Monitoring is a GitHub-Actions canary** (section 10), which can lag or be disabled after 60 days of inactivity; add an external pinger for anything you depend on.
