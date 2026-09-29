// Shop slugs become top-level public URLs (`/<slug>`, group 11), so they share
// a namespace with every static web route and API mount point.

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

// a-z0-9 and hyphens; must start and end with a letter or digit. Consecutive
// hyphens are allowed (not worth rejecting).
const SLUG_SHAPE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

// Every route registered in web/src/App.tsx, every API mount point in
// api/src/app.ts, plus names an owner might plausibly squat on or that
// browsers/crawlers request from the site root. Keep in sync when adding a
// route (slug.test.ts checks the web routes against App.tsx).
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // web routes
  'login',
  'register',
  'forgot-password',
  'verify-email',
  'verify-email-change',
  'reset-password',
  'invite',
  'invites',
  'cancel',
  'privacy',
  'terms',
  'about',
  'contact',
  'dpa',
  'p',
  'dashboard',
  'shops',
  'shop',
  'settings',
  // api mount points
  'api',
  'auth',
  'user',
  'users',
  'public',
  'docs',
  'health',
  // platform / brand
  'admin',
  'administrator',
  'root',
  'app',
  'www',
  'mail',
  'email',
  'support',
  'help',
  'blog',
  'status',
  'billing',
  'pricing',
  'account',
  'logout',
  'signin',
  'signup',
  'book',
  'booking',
  'bookings',
  'static',
  'assets',
  'cdn',
  // files requested from the site root
  'favicon',
  'robots',
  'sitemap',
  'manifest',
  'index',
]);

export type SlugProblem = 'length' | 'format' | 'reserved';

export const checkSlug = (value: unknown): SlugProblem | null => {
  if (typeof value !== 'string') return 'format';
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) {
    return 'length';
  }
  if (!SLUG_SHAPE.test(value)) return 'format';
  if (RESERVED_SLUGS.has(value)) return 'reserved';
  return null;
};

export const SLUG_MESSAGES: Record<SlugProblem, string> = {
  length: `Slug must be ${SLUG_MIN_LENGTH}-${SLUG_MAX_LENGTH} characters`,
  format:
    'Slug may only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
  reserved: 'This slug is reserved, please choose another',
};
