import { useState } from 'react';
import PhotoViewer from './PhotoViewer';
import { useLang } from '../context/LanguageContext';
import { mediaUrl } from '../utils/media';

/**
 * A person's photo, or the first letter of their name when there is none (or
 * it fails to load). Decorative: the name is always shown next to it. With
 * `enlarge`, a photo is a button that opens it at full size.
 */
export default function Avatar({
  name,
  photoUrl,
  size,
  enlarge,
}: {
  name: string | null | undefined;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'lg' | 'xl';
  /** Not inside another button or link: those cannot hold a button. */
  enlarge?: boolean;
}) {
  const { t } = useLang();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const src = photoUrl && photoUrl !== failedUrl ? mediaUrl(photoUrl) : undefined;
  const classes = `avatar${size ? ` avatar--${size}` : ''}`;
  const image = src && <img src={src} alt="" loading="lazy" onError={() => setFailedUrl(photoUrl ?? null)} />;

  if (enlarge && src) {
    return (
      <>
        <button
          type="button"
          className={`${classes} avatar--button`}
          onClick={() => setOpen(true)}
          aria-label={t.customers.viewPhoto.replace('{name}', name ?? '')}
        >
          {image}
        </button>
        {open && <PhotoViewer name={name ?? ''} src={src} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      {image || (name?.charAt(0)?.toUpperCase() ?? '?')}
    </span>
  );
}
