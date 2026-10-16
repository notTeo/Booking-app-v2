import { describe, expect, it } from 'vitest';
import { installGuideFor } from './installPrompt';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MAC_FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

describe('installGuideFor', () => {
  it('guides any iPhone browser through the Share menu', () => {
    expect(installGuideFor(IPHONE_SAFARI, 5)).toBe('ios');
    expect(installGuideFor(IPHONE_CHROME, 5)).toBe('ios');
  });

  it('treats an iPad (which reports a Mac) as iOS', () => {
    expect(installGuideFor(MAC_SAFARI, 5)).toBe('ios');
  });

  it('guides Safari on a Mac to Add to Dock', () => {
    expect(installGuideFor(MAC_SAFARI, 0)).toBe('mac-safari');
  });

  it('has no guide where the browser offers install itself, or cannot install', () => {
    expect(installGuideFor(MAC_CHROME, 0)).toBeNull();
    expect(installGuideFor(ANDROID_CHROME, 5)).toBeNull();
    expect(installGuideFor(MAC_FIREFOX, 0)).toBeNull();
  });
});
