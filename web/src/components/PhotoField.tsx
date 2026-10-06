import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCropSimple, faImage, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  type PhotoCrop,
  type PhotoFields,
} from '../api/photo.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorMessage } from '../utils/apiError';
import { mediaUrl } from '../utils/media';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import PhotoEditorModal, { type PhotoShape } from './PhotoEditorModal';

/**
 * A photo with its controls: add one, adjust it (zoom, move, crop), replace it
 * or remove it. `preview` is how the current photo (or its fallback) looks
 * where it is used; `children` sit beside it, above the buttons.
 */
export default function PhotoField({
  photo,
  shape,
  preview,
  children,
  canEdit,
  stacked,
  onUpload,
  onRemove,
}: {
  photo: PhotoFields;
  shape: PhotoShape;
  preview: ReactNode;
  children?: ReactNode;
  canEdit: boolean;
  /** Preview above the buttons (a wide photo), instead of beside them. */
  stacked?: boolean;
  /** A new file with its crop, or (file null) a new crop of the stored photo. */
  onUpload: (file: File | null, crop: PhotoCrop) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const { t } = useLang();
  const tp = t.photos;
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ file: File | null; src: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // A chosen file is shown through an object URL, released once it is done with.
  const objectUrl = editing?.file ? editing.src : null;
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!PHOTO_TYPES.includes(file.type)) return setError(tp.errorType);
    if (file.size > MAX_PHOTO_BYTES) return setError(tp.errorSize);
    setEditorError('');
    setEditing({ file, src: URL.createObjectURL(file) });
  };

  const adjust = () => {
    const src = mediaUrl(photo.photoOriginalUrl);
    if (!src) return;
    setError('');
    setEditorError('');
    setEditing({ file: null, src });
  };

  const save = async (crop: PhotoCrop) => {
    if (!editing) return;
    setSaving(true);
    setEditorError('');
    try {
      await onUpload(editing.file, crop);
      setEditing(null);
    } catch (err: unknown) {
      setEditorError(apiErrorMessage(err, tp.errorSave));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    setError('');
    try {
      await onRemove();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, tp.errorRemove));
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const hasPhoto = !!photo.photoUrl;

  return (
    <div className={`photo-field${stacked ? ' photo-field--stacked' : ''}`}>
      {preview}
      <div className="photo-field__main">
        {children}
        {canEdit && (
          <div className="cluster cluster--tight">
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept={PHOTO_TYPES.join(',')}
              aria-label={hasPhoto ? tp.replace : tp.add}
              tabIndex={-1}
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => inputRef.current?.click()}>
              <FontAwesomeIcon icon={faImage} aria-hidden="true" />
              {hasPhoto ? tp.replace : tp.add}
            </button>
            {hasPhoto && photo.photoOriginalUrl && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={adjust}>
                <FontAwesomeIcon icon={faCropSimple} aria-hidden="true" />
                {tp.adjust}
              </button>
            )}
            {hasPhoto && (
              <button type="button" className="btn btn--danger-outline btn--sm" onClick={() => setConfirmRemove(true)}>
                <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                {tp.remove}
              </button>
            )}
          </div>
        )}
        {canEdit && !hasPhoto && <small className="field__hint">{tp.hint}</small>}
        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      {editing && (
        <PhotoEditorModal
          src={editing.src}
          shape={shape}
          initialCrop={editing.file ? null : photo.photoCrop}
          saving={saving}
          error={editorError}
          onSave={save}
          onClose={() => !saving && setEditing(null)}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          title={tp.removeTitle}
          message={tp.removeMessage}
          confirmLabel={tp.remove}
          cancelLabel={tp.cancel}
          tone="danger"
          busy={removing}
          onConfirm={remove}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
}
