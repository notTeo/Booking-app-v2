// A shop's public booking page lives at the site root: /<slug>. (It used to be
// /p/<slug>; that path still redirects.) Slug rules mirror the API's
// validators/slug.ts: 3-40 chars, a-z0-9 and hyphens, no leading/trailing hyphen.

const SLUG_SHAPE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const isPlausibleSlug = (value: string): boolean =>
  value.length >= 3 && value.length <= 40 && SLUG_SHAPE.test(value);

export const publicShopPath = (slug: string): string => `/${slug}`;

export const publicShopUrl = (slug: string): string =>
  `${window.location.origin}${publicShopPath(slug)}`;
