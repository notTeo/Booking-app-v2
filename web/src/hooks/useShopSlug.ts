import { useMatch } from 'react-router-dom';

// The slug of the shop whose pages are on screen, or null on account-level
// routes. Decides which sidebar level shows. `/shops/new` is the create form,
// not a shop called "new".
export function useShopSlug(): string | null {
  const match = useMatch('/shops/:slug/*');
  const slug = match?.params.slug;
  return slug && slug !== 'new' ? slug : null;
}
