import { useEffect, useState } from 'react';

// Matches the shell's drawer breakpoint (--bp-sm, 640px). Media queries can't
// read tokens, so the value is repeated here.
const QUERY = '(max-width: 640px)';

export function useIsCompact() {
  const [compact, setCompact] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return compact;
}
