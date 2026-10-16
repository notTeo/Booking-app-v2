import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreenButton } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Modal from './Modal';
import {
  canPromptInstall,
  installGuideFor,
  isInstalledApp,
  promptInstall,
  subscribeInstallPrompt,
} from '../utils/installPrompt';

/**
 * "Install app" on the auth pages. Chrome and Edge get their own install
 * window; Safari (iPhone, iPad, Mac) gets a short guide, since a page can't
 * start the install there. Hidden inside the installed app, and in browsers
 * that can't install (Firefox).
 */
export default function InstallAppButton() {
  const { t } = useLang();
  const id = useId();
  const doneRef = useRef<HTMLButtonElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall);

  if (isInstalledApp()) return null;
  const guide = installGuideFor(navigator.userAgent, navigator.maxTouchPoints);
  if (!canPrompt && !guide) return null;

  const steps = guide === 'mac-safari' ? t.install.macSteps : t.install.iosSteps;

  return (
    <span>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => (canPrompt ? promptInstall() : setGuideOpen(true))}
      >
        <FontAwesomeIcon icon={faMobileScreenButton} aria-hidden="true" />
        {t.install.button}
      </button>
      {guideOpen && (
        <Modal onClose={() => setGuideOpen(false)} labelledBy={`${id}-title`} initialFocus={doneRef}>
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
            <button type="button" className="btn" ref={doneRef} onClick={() => setGuideOpen(false)}>
              {t.install.done}
            </button>
          </div>
        </Modal>
      )}
    </span>
  );
}
