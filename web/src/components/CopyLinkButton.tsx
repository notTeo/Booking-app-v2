import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';

interface CopyLinkButtonProps {
  link: string;
  compact?: boolean;
}

// Shared by ShopSettingsPage and ShopOverviewPage — both show the shop's
// public booking link with the same copy-to-clipboard + "Copied!" behavior.
export default function CopyLinkButton({ link, compact }: CopyLinkButtonProps) {
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
    </div>
  );
}
