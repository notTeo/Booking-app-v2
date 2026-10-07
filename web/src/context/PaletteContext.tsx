import { createContext, useContext, useState } from 'react';
import { getCookie, setCookie } from '../utils/cookies';
import { PALETTE_COOKIE, parsePalette, type Palette } from '../utils/palette';

interface PaletteContextType {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = createContext<PaletteContextType | null>(null);

// The chosen colour set, remembered on this device like the theme. It only
// takes effect where AppPalette puts it on <html> (the app and the marketing
// pages). The cookie is written only when a set is picked, never just for
// visiting.
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(() => parsePalette(getCookie(PALETTE_COOKIE)));

  const setPalette = (next: Palette) => {
    setCookie(PALETTE_COOKIE, next, 365);
    setPaletteState(next);
  };

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
