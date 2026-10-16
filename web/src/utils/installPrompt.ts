/**
 * "Install app" support. Chrome and Edge offer installing through a
 * `beforeinstallprompt` event that fires once, early, often before the login
 * page has mounted, so it is caught here from main.tsx and kept until used.
 * Safari never fires it: there the button opens a short guide instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the browser's own mini-bar away; our button asks instead.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function canPromptInstall() {
  return deferred !== null;
}

/** Shows the browser's install window. The event can only be used once. */
export async function promptInstall() {
  const e = deferred;
  if (!e) return;
  deferred = null;
  notify();
  await e.prompt();
}

/** Already running as the installed app (home screen or Dock). */
export function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type InstallGuide = 'ios' | 'mac-safari' | null;

/** Which manual guide fits a browser that never offers the install event. */
export function installGuideFor(ua: string, maxTouchPoints: number): InstallGuide {
  // iPadOS reports itself as a Mac; touch gives it away.
  const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (isIos) return 'ios';
  const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua);
  if (/Macintosh/.test(ua) && isSafari) return 'mac-safari';
  return null;
}
