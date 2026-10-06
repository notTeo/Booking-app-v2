import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { mediaUrl } from '../utils/media';

/** A product's photo as a small square, or a box icon when it has none (or it fails to load). */
export default function ProductThumb({
  photoUrl,
  large,
}: {
  photoUrl?: string | null;
  large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = photoUrl && photoUrl !== failedUrl ? mediaUrl(photoUrl) : undefined;
  return (
    <span className={`thumb${large ? ' thumb--lg' : ''}`} aria-hidden="true">
      {src ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailedUrl(photoUrl ?? null)} />
      ) : (
        <FontAwesomeIcon icon={faBoxOpen} />
      )}
    </span>
  );
}
