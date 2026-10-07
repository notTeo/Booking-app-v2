import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faImage, faTrash } from '@fortawesome/free-solid-svg-icons';
import { MAX_PHOTO_BYTES, PHOTO_TYPES, type PhotoCrop } from '../api/photo.api';
import { useLang } from '../context/LanguageContext';
import { cropPreview } from '../utils/cropPreview';
import Alert from './Alert';
import PhotoEditorModal from './PhotoEditorModal';

/** A photo the customer picked and framed, not sent anywhere yet. */
export interface PickedPhoto {
  file: File;
  crop: PhotoCrop;
  /** The framed part, for showing it back. */
  preview: string;
}

/**
 * The customer's own photo on the public pages: take one with the camera or
 * choose one, then frame it. Nothing is uploaded here; the page sends the
 * picked photo with its form.
 */
export default function CustomerPhotoPicker({
  value,
  onChange,
  disabled,
}: {
  value: PickedPhoto | null;
  onChange: (photo: PickedPhoto | null) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const c = t.customerProfile;
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ file: File; src: string } | null>(null);
  const [error, setError] = useState('');

  // The chosen file is shown in the editor through an object URL, released after.
  const objectUrl = editing?.src;
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!PHOTO_TYPES.includes(file.type)) return setError(t.photos.errorType);
    if (file.size > MAX_PHOTO_BYTES) return setError(t.photos.errorSize);
    setEditing({ file, src: URL.createObjectURL(file) });
  };

  const save = async (crop: PhotoCrop) => {
    if (!editing) return;
    try {
      onChange({ file: editing.file, crop, preview: await cropPreview(editing.src, crop) });
      setEditing(null);
    } catch {
      setEditing(null);
      setError(t.photos.errorLoad);
    }
  };

  const input = (ref: React.RefObject<HTMLInputElement | null>, label: string, camera: boolean) => (
    <input
      ref={ref}
      className="visually-hidden"
      type="file"
      // The camera always hands over a JPEG; a chosen file is checked in pickFile.
      accept={camera ? 'image/*' : PHOTO_TYPES.join(',')}
      {...(camera && { capture: 'user' as const })}
      aria-label={label}
      tabIndex={-1}
      disabled={disabled}
      onChange={(e) => {
        pickFile(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  return (
    <div className="photo-field">
      {value && (
        <span className="avatar avatar--xl" aria-hidden="true">
          <img src={value.preview} alt="" />
        </span>
      )}
      <div className="photo-field__main">
        <div className="cluster cluster--tight">
          {input(cameraRef, c.takePhoto, true)}
          {input(fileRef, c.choosePhoto, false)}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => cameraRef.current?.click()} disabled={disabled}>
            <FontAwesomeIcon icon={faCamera} aria-hidden="true" />
            {c.takePhoto}
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()} disabled={disabled}>
            <FontAwesomeIcon icon={faImage} aria-hidden="true" />
            {c.choosePhoto}
          </button>
          {value && (
            <button type="button" className="btn btn--danger-outline btn--sm" onClick={() => onChange(null)} disabled={disabled}>
              <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
              {c.removePhoto}
            </button>
          )}
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      {editing && (
        <PhotoEditorModal
          src={editing.src}
          shape="round"
          saving={false}
          error=""
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
