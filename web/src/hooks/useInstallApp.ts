import { useState, useSyncExternalStore } from 'react';
import {
  canPromptInstall,
  installGuideFor,
  isInstalledApp,
  promptInstall,
  subscribeInstallPrompt,
} from '../utils/installPrompt';

/**
 * "Install app", wherever it is offered. Chrome and Edge get their own
 * install window; Safari (iPhone, iPad, Mac) gets a short guide, since a page
 * can't start the install there. `available` is false inside the installed
 * app, and in browsers that can't install (Firefox).
 */
export function useInstallApp() {
  const [guideOpen, setGuideOpen] = useState(false);
  // Server render (tests): no install offer, no button.
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false);
  const inBrowser = typeof window !== 'undefined';
  const guide = inBrowser ? installGuideFor(navigator.userAgent, navigator.maxTouchPoints) : null;

  return {
    available: inBrowser && !isInstalledApp() && (canPrompt || guide !== null),
    install: () => (canPrompt ? promptInstall() : setGuideOpen(true)),
    guide,
    guideOpen,
    closeGuide: () => setGuideOpen(false),
  };
}
