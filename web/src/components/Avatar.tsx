import { useState } from 'react';
import { mediaUrl } from '../utils/media';

/**
 * A person's photo, or the first letter of their name when there is none (or
 * it fails to load). Decorative: the name is always shown next to it.
 */
export default function Avatar({
  name,
  photoUrl,
  size,
}: {
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: 'sm' | 'lg' | 'xl';
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = photoUrl && photoUrl !== failedUrl ? mediaUrl(photoUrl) : undefined;

  return (
    <span className={`avatar${size ? ` avatar--${size}` : ''}`} aria-hidden="true">
      {src ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailedUrl(photoUrl ?? null)} />
      ) : (
        (name?.charAt(0)?.toUpperCase() ?? '?')
      )}
    </span>
  );
}
