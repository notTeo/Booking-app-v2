import { useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { createTeamMember, type TeamMember, type ShopRole } from '../api/team.api';
import { apiErrorMessage } from '../utils/apiError';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import Switch from './Switch';

interface Props {
  shopId: string;
  /** Called with the new member and whether the invite email was sent. */
  onCreated: (member: TeamMember, emailSent: boolean) => void;
  onClose: () => void;
}

// Add a team member (the form that used to live on the shop Invites page).
// Giving someone the owner role goes through an extra confirmation.
export default function AddMemberModal({ shopId, onCreated, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShopRole>('staff');
  const [canViewCustomerDetails, setCanViewCustomerDetails] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [confirmOwner, setConfirmOwner] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submitCreate = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const member = await createTeamMember(shopId, {
        name,
        email: email || undefined,
        role,
        canViewCustomerDetails,
        sendEmail,
      });
      onCreated(member, sendEmail);
    } catch (err: unknown) {
      setConfirmOwner(false);
      setError(apiErrorMessage(err, t.invites.errorSend));
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'owner' && !confirmOwner) {
      setConfirmOwner(true);
      return;
    }
    submitCreate();
  };

  return (
    <>
      <Modal
        onClose={() => { if (!sending) onClose(); }}
        labelledBy={`${uid}-title`}
        paused={confirmOwner}
      >
        <div className="modal__header">
          <h2 id={`${uid}-title`} className="modal__title">{t.invites.addMember}</h2>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            onClick={onClose}
            disabled={sending}
            aria-label={t.team.cancel}
          >
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">
          {error && <Alert variant="danger">{error}</Alert>}
          <form id={`${uid}-form`} onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-name`}>{t.invites.nameLabel}</label>
              <input
                id={`${uid}-name`}
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.invites.namePlaceholder}
                required
                disabled={sending}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-email`}>
                {t.invites.emailLabel}{!sendEmail && ` (${t.invites.optional})`}
              </label>
              <input
                id={`${uid}-email`}
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required={sendEmail}
                disabled={sending}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-role`}>{t.invites.roleLabel}</label>
              <div className="select-wrap">
                <select
                  id={`${uid}-role`}
                  className="select"
                  value={role}
                  onChange={(e) => { setRole(e.target.value as ShopRole); setConfirmOwner(false); }}
                  disabled={sending}
                >
                  <option value="staff">{t.invites.roles.staff}</option>
                  <option value="owner">{t.invites.roles.owner}</option>
                </select>
              </div>
            </div>

            {role === 'staff' && (
              <div className="team-switch-row">
                <div className="team-switch-label">
                  <span>{t.invites.canViewCustomerDetails}</span>
                  <span className="team-switch-desc">{t.invites.canViewCustomerDetailsDesc}</span>
                </div>
                <Switch
                  checked={canViewCustomerDetails}
                  onChange={setCanViewCustomerDetails}
                  label={t.invites.canViewCustomerDetails}
                  disabled={sending}
                />
              </div>
            )}

            <div className="team-switch-row">
              <div className="team-switch-label">
                <span>{t.invites.sendEmailNow}</span>
                <span className="team-switch-desc">{t.invites.sendEmailNowDesc}</span>
              </div>
              <Switch checked={sendEmail} onChange={setSendEmail} label={t.invites.sendEmailNow} disabled={sending} />
            </div>
          </form>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={sending}>
            {t.team.cancel}
          </button>
          <button
            type="submit"
            form={`${uid}-form`}
            className={`btn${sending ? ' is-loading' : ''}`}
            aria-busy={sending}
          >
            {t.invites.addMember}
          </button>
        </div>
      </Modal>

      {confirmOwner && (
        <ConfirmDialog
          tone="warning"
          title={t.invites.ownerInviteTitle.replace('{name}', name)}
          message={t.invites.confirmOwnerInvite}
          confirmLabel={t.invites.ownerInviteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={sending}
          onConfirm={submitCreate}
          onCancel={() => setConfirmOwner(false)}
        />
      )}
    </>
  );
}
