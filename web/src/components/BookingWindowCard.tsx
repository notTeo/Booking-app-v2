import { useEffect, useState } from 'react';
import { getShop, updateShop, type Shop } from '../api/shop.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorMessage } from '../utils/apiError';

/** Shop-wide "Booking window (days)" — same value as on the Shop Settings page. */
export default function BookingWindowCard({ shop, isOwner }: { shop: Shop; isOwner: boolean }) {
  const { t } = useLang();
  const [days, setDays] = useState(String(shop.maxAdvanceDays));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ShopContext's copy can be stale after editing in Settings — fetch the current value.
  useEffect(() => {
    getShop(shop.id).then((s) => setDays(String(s.maxAdvanceDays))).catch(() => {});
  }, [shop.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateShop(shop.id, { maxAdvanceDays: Number(days) });
      setSuccess(t.workingHours.bookingWindowSaved);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.workingHours.bookingWindowError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="wh-window-card" onSubmit={handleSave}>
      <div className="wh-window-head">
        <div>
          <h3>{t.workingHours.bookingWindowTitle}</h3>
          <span className="shop-field-hint">{t.workingHours.bookingWindowNote}</span>
        </div>
        {isOwner && (
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t.shopSettings.saving : t.shopSettings.saveChanges}
          </button>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="wh-max-advance">{t.shopSettings.maxAdvanceLabel}</label>
        <input
          id="wh-max-advance"
          type="number"
          inputMode="numeric"
          min={1}
          max={730}
          step={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          disabled={!isOwner}
          required
        />
        <small className="form-hint">{t.shopSettings.maxAdvanceHint}</small>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
    </form>
  );
}
