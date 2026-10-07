import { useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faArrowUpRightFromSquare, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Modal from './Modal';
import QrCode from './QrCode';

interface CopyLinkButtonProps {
  link: string;
  compact?: boolean;
  /** Adds a QR button: the link as a QR code in a dialog, to scan, download or print. */
  qr?: { title: string; alt: string; fileName: string };
}

// Shared by ShopSettingsPage and ShopOverviewPage — both show the shop's
// public booking link with the same copy-to-clipboard + "Copied!" behavior.
export default function CopyLinkButton({ link, compact, qr }: CopyLinkButtonProps) {
  const uid = useId();
  const [qrOpen, setQrOpen] = useState(false);
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — nothing to fall back to
    }
  };

  return (
    <div className={`copy-link${compact ? ' copy-link--compact' : ''}`}>
      <span className="copy-link__value">{link}</span>
      <button type="button" className="btn btn--secondary btn--sm copy-link__btn" onClick={handleCopy}>
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
        {copied ? t.sharing.copiedLabel : t.sharing.copyButton}
      </button>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--secondary btn--sm btn--icon copy-link__btn"
        title={t.sharing.viewButton}
        aria-label={t.sharing.viewButton}
      >
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
      </a>
      {qr && (
        <button
          type="button"
          className="btn btn--secondary btn--sm btn--icon copy-link__btn"
          onClick={() => setQrOpen(true)}
          title={t.customerProfile.showQr}
          aria-label={t.customerProfile.showQr}
        >
          <FontAwesomeIcon icon={faQrcode} />
        </button>
      )}
      {qr && qrOpen && (
        <Modal onClose={() => setQrOpen(false)} labelledBy={`${uid}-qr-title`}>
          <div className="modal__header">
            <h2 id={`${uid}-qr-title`} className="modal__title">{t.customerProfile.qrTitle}</h2>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => setQrOpen(false)}
              aria-label={t.customerProfile.close}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </div>
          <div className="modal__body">
            <QrCode link={link} title={qr.title} alt={qr.alt} fileName={qr.fileName} />
          </div>
        </Modal>
      )}
    </div>
  );
}
