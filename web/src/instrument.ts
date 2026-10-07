import { useEffect } from 'react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import * as Sentry from '@sentry/react';

// Error monitoring and tracing. Imported first in main.tsx, before anything
// else runs. Production builds only, and only with VITE_SENTRY_DSN set: local
// development, tests and e2e never send anything, even with a DSN in .env.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (dsn && import.meta.env.PROD) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      // Names each page load and navigation after its route (/shops/:slug/team),
      // not the address with the shop's or the booking's own values in it.
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1.0,
    // Follow a request into the API, and nowhere else.
    tracePropagationTargets: apiUrl ? [apiUrl] : [],
    // Customers' names, phones and emails travel in request bodies and some
    // links carry an email or a token, so none of that is collected: errors
    // and timings only.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
}
