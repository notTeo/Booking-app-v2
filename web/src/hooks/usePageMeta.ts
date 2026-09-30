import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { PAGE_META, PRIVATE_PAGE_META, SITE_URL } from '../config/seo';

export interface MetaValues {
  title: string;
  description: string;
  index: boolean;
  /** Path used for the canonical and og:url, e.g. `/hairology`. */
  path: string;
}

function setNamed(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Writes the head tags for one page. Client-rendered, which Google executes. */
export function applyMeta({ title, description, index, path }: MetaValues) {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  document.title = title;
  setNamed('name', 'description', description);
  setNamed('name', 'robots', index ? 'index, follow' : 'noindex, follow');
  setCanonical(url);
  setNamed('property', 'og:title', title);
  setNamed('property', 'og:description', description);
  setNamed('property', 'og:url', url);
  setNamed('name', 'twitter:title', title);
  setNamed('name', 'twitter:description', description);
}

/** Route-driven defaults: known public pages are indexed, everything else is not. */
export function useRouteMeta() {
  const { pathname } = useLocation();
  const { language } = useLang();

  useEffect(() => {
    const meta = PAGE_META[pathname] ?? PRIVATE_PAGE_META;
    applyMeta({
      title: meta.title[language],
      description: meta.description[language],
      index: meta.index,
      path: pathname,
    });
  }, [pathname, language]);
}

/** Per-page override, used by pages whose title depends on loaded data. */
export function usePageMeta(values: MetaValues | null) {
  // Re-applied on language change so it lands after useRouteMeta's reset,
  // which runs first (RouteMeta is rendered before the routes).
  const { language } = useLang();
  const title = values?.title;
  const description = values?.description;
  const index = values?.index;
  const path = values?.path;

  useEffect(() => {
    if (title === undefined || description === undefined || index === undefined || path === undefined) return;
    applyMeta({ title, description, index, path });
  }, [title, description, index, path, language]);
}
