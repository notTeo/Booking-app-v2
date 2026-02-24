const REQUIRED_VARS = ['VITE_API_URL'] as const;

const missing = REQUIRED_VARS.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
  throw new Error(`[env] Missing required environment variables:\n  ${missing.join('\n  ')}`);
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL as string,
};
