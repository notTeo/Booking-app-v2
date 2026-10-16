import { useId, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreenButton } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { useInstallApp } from '../hooks/useInstallApp';
import type { InstallGuide } from '../utils/installPrompt';
import Modal from './Modal';

/** The how-to for Safari, which can't be asked to install from the page. */
export function InstallGuideModal({ guide, onClose }: { guide: InstallGuide; onClose: () => void }) {
  const { t } = useLang();
  const id = useId();
  const doneRef = useRef<HTMLButtonElement>(null);
  const steps = guide === 'mac-safari' ? t.install.macSteps : t.install.iosSteps;

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`} initialFocus={doneRef}>
      <div className="modal__header">
        <h2 id={`${id}-title`} className="modal__title">{t.install.guideTitle}</h2>
      </div>
      <div className="modal__body">
        <ol className="numbered-list">
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p>{t.install.guideNote}</p>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn" ref={doneRef} onClick={onClose}>
          {t.install.done}
        </button>
      </div>
    </Modal>
  );
}

/** "Install app" under the login and register forms. */
export default function InstallAppButton() {
  const { t } = useLang();
  const { available, install, guide, guideOpen, closeGuide } = useInstallApp();
  if (!available) return null;

  return (
    <span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={install}>
        <FontAwesomeIcon icon={faMobileScreenButton} aria-hidden="true" />
        {t.install.button}
      </button>
      {guideOpen && <InstallGuideModal guide={guide} onClose={closeGuide} />}
    </span>
  );
}

/** Account → Preferences: install for someone already signed in. */
export function InstallAppRow() {
  const { t } = useLang();
  const { available, install, guide, guideOpen, closeGuide } = useInstallApp();
  if (!available) return null;

  return (
    <div className="setting-row">
      <div className="setting-row__label">
        <span className="setting-row__title">{t.install.rowTitle}</span>
        <span className="setting-row__text">{t.install.rowDesc}</span>
      </div>
      <button type="button" className="btn btn--secondary btn--sm" onClick={install}>
        <FontAwesomeIcon icon={faMobileScreenButton} aria-hidden="true" />
        {t.install.navLabel}
      </button>
      {guideOpen && <InstallGuideModal guide={guide} onClose={closeGuide} />}
    </div>
  );
}
