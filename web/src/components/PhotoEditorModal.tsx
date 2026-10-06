import { useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { PhotoCrop } from '../api/photo.api';
import { useLang } from '../context/LanguageContext';
import Alert from './Alert';
import Modal from './Modal';

export type PhotoShape = 'cover' | 'square' | 'round';

const ASPECT: Record<PhotoShape, number> = { cover: 16 / 9, square: 1, round: 1 };
const MAX_ZOOM = 4;

/**
 * The photo editor: drag to move, zoom with the slider (or wheel / pinch), and
 * the frame is what gets kept. It only picks the crop; the server cuts and
 * resizes the image, so `onSave` receives the crop as fractions of the photo.
 */
export default function PhotoEditorModal({
  src,
  shape,
  initialCrop,
  saving,
  error,
  onSave,
  onClose,
}: {
  /** The photo being edited: a just-chosen file's object URL, or the stored original. */
  src: string;
  shape: PhotoShape;
  /** The crop saved last time, when re-editing. */
  initialCrop?: PhotoCrop | null;
  saving: boolean;
  error: string;
  onSave: (crop: PhotoCrop) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const tp = t.photos;
  const id = useId();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleSave = () => {
    if (!area || saving) return;
    onSave({
      x: area.x / 100,
      y: area.y / 100,
      width: area.width / 100,
      height: area.height / 100,
    });
  };

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`} className="modal--wide">
      <div className="modal__header">
        <h2 className="modal__title" id={`${id}-title`}>{tp.editorTitle}</h2>
      </div>
      <div className="modal__body">
        {error && <Alert variant="danger">{error}</Alert>}
        {loadFailed && <Alert variant="danger">{tp.errorLoad}</Alert>}
        <div className="photo-editor__stage" data-testid="photo-editor-stage">
          <Cropper
            image={src}
            crop={position}
            zoom={zoom}
            maxZoom={MAX_ZOOM}
            aspect={ASPECT[shape]}
            cropShape={shape === 'round' ? 'round' : 'rect'}
            showGrid={false}
            initialCroppedAreaPercentages={
              initialCrop
                ? {
                    x: initialCrop.x * 100,
                    y: initialCrop.y * 100,
                    width: initialCrop.width * 100,
                    height: initialCrop.height * 100,
                  }
                : undefined
            }
            classes={{ cropAreaClassName: 'photo-editor__area' }}
            onCropChange={setPosition}
            onZoomChange={setZoom}
            onCropComplete={setArea}
            onMediaLoaded={() => setLoadFailed(false)}
            mediaProps={{ onError: () => setLoadFailed(true) }}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-zoom`}>{tp.zoom}</label>
          <input
            id={`${id}-zoom`}
            className="range"
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <small className="field__hint">{tp.editorHint}</small>
        </div>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--secondary" onClick={onClose}>{tp.cancel}</button>
        <button
          type="button"
          className={`btn${saving ? ' is-loading' : ''}`}
          aria-busy={saving}
          disabled={!area || loadFailed}
          onClick={handleSave}
        >
          {tp.save}
        </button>
      </div>
    </Modal>
  );
}
