import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { translations } from '../locales/translations';
import PasswordInput from './PasswordInput';

vi.mock('../context/LanguageContext', () => ({ useLang: () => ({ t: translations.en }) }));

const t = translations.en.settings;

describe('PasswordInput', () => {
  it('starts hidden, with a toggle that offers to show the password', () => {
    const html = renderToString(<PasswordInput id="pw" value="secret" onChange={() => {}} />);
    expect(html).toContain('type="password"');
    expect(html).toContain('id="pw"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain(`aria-label="${t.showPassword}"`);
  });

  it('keeps the toggle out of form submission', () => {
    const html = renderToString(<PasswordInput value="" onChange={() => {}} />);
    expect(html).toMatch(/<button type="button"/);
  });
});
