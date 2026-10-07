import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qrcode } from 'vite-plugin-qrcode'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Source maps go to Sentry (so its stack traces show our own code) only in a
// build that has SENTRY_AUTH_TOKEN, which is the production build on Vercel.
// Any other build makes no source maps at all and uploads nothing.
const sentryToken = process.env.SENTRY_AUTH_TOKEN

// https://vite.dev/config/
export default defineConfig({
  build: {
    // 'hidden': written for the upload, but not referenced from the bundle.
    sourcemap: sentryToken ? 'hidden' : false,
  },
  plugins: [
    react(),
    qrcode(),
    // After every other plugin, as Sentry's docs ask.
    sentryVitePlugin({
      disable: !sentryToken,
      telemetry: false,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT ?? 'bebooked-web',
      authToken: sentryToken,
      // Never served: the maps are deleted from the output once uploaded.
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  server: {
    host: true, // expose on the LAN so the printed QR code actually resolves from your phone
  },
})
