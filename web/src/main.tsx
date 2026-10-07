// Sentry is set up before anything else is imported.
import './instrument';
// Self-hosted fonts (no request to Google): latin subset only, and only the
// weights the CSS uses. Greek text falls back to the sans-serif stack, exactly
// as before, since neither family ships Greek glyphs.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource/league-spartan/latin-700.css';
import '@fontsource/league-spartan/latin-800.css';
import '@fontsource/league-spartan/latin-900.css';
import '@fontsource/gasoek-one/latin-400.css';
import './styles/tokens.css';
import './styles/components.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!, {
  // Errors React catches on its own never reach window.onerror: report them here.
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
