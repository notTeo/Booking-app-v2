import { createContext, useContext, useEffect, useState } from 'react';
import { getCookie, setCookie } from '../utils/cookies';
import { PALETTE_COOKIE, parsePalette, type Palette } from '../utils/palette';

interface PaletteContextType {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = createContext<PaletteContextType | null>(null);

// The chosen colour set, remembered on this device like the theme. It only
// takes effect inside the app, where AppPalette puts it on <html>.
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<Palette>(() => parsePalette(getCookie(PALETTE_COOKIE)));

  useEffect(() => {
    setCookie(PALETTE_COOKIE, palette, 365);
  }, [palette]);

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
