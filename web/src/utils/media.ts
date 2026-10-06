import { env } from '../config/env';

/** Photos are stored as API paths (`/media/...`); this makes one loadable. */
export const mediaUrl = (path: string | null | undefined): string | undefined =>
  path ? (path.startsWith('/') ? `${env.apiUrl}${path}` : path) : undefined;
