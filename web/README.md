# BeBooked web

React single-page app: the shop owner dashboard and the public booking page. Deployed to Vercel (`vercel.json` rewrites every path to `index.html` and marks private pages `noindex`).

## Stack

| Tool | Purpose |
|---|---|
| React 19 + TypeScript | UI |
| Vite | Dev server and bundler |
| React Router 7 | Client-side routing |
| TanStack Query | Server state |
| Axios | HTTP client with a refresh-token interceptor |
| Luxon | Shop-timezone date handling |
| Vitest | Unit and component tests |

## Local setup

Requires Node 20+ and the API running (see [../api/README.md](../api/README.md)).

```bash
cd web
cp .env.example .env    # VITE_API_URL, default http://localhost:3000
npm install
npm run dev             # http://localhost:5173
```

`VITE_API_URL` is the only variable. It is validated at startup in `src/config/env.ts` and is baked into the bundle at build time.

## Scripts

```bash
npm run dev       # Vite dev server
npm run build     # type-check + production build
npm run preview   # serve the production build
npm run lint
npm test          # Vitest (single run)
npm run test:tz   # tests under UTC, Europe/Athens, America/New_York
```

## Layout

```
src/
├── api/         API client modules (one per resource) and the Axios instance
├── components/  layout, sidebars, route guards, booking wizard, dashboard overview
├── config/      validated environment
├── context/     auth, shop, theme and language state
├── hooks/       booking wizard, page meta, sidebar width
├── locales/     Greek and English strings (Greek is the default)
├── pages/       one file per route
├── store/       in-memory access token
├── styles/      design tokens, shared component classes, page CSS
├── utils/       date, error and link helpers
└── App.tsx      route table
```

Routes are defined in `src/App.tsx`. The public booking page is `/:slug`, registered after every static route; `/p/:slug` redirects to it.

## Styling

Styles follow the design system in [../docs/design-system/](../docs/design-system/README.md): tokens in `src/styles/tokens.css` (light and `[data-theme="dark"]`) and shared classes in `src/styles/components.css`. The migration of older page CSS is still in progress, see [migration.md](../docs/design-system/migration.md).

## Auth flow

- **Access token**: kept in memory only (`src/store/authStore.ts`), never in `localStorage` or `sessionStorage`.
- **Refresh token**: an `httpOnly` cookie set by the API. The frontend never reads it.
- **Session rehydration**: on load, `AuthContext` calls `POST /auth/refresh` through a cookie-only Axios instance, then fetches the user.
- **Auto-refresh**: the Axios interceptor catches a 401, refreshes, and retries the original request.
