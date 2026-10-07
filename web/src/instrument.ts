import { useEffect } from 'react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import * as Sentry from '@sentry/react';

// Error monitoring and tracing. Imported first in main.tsx, before anything
// else runs. Without VITE_SENTRY_DSN (local development, tests, e2e) Sentry
// stays off and nothing is sent.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (dsn) {
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
