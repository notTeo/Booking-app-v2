import { useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { createTeamMember, type TeamMember, type AssignableRole } from '../api/team.api';
import { apiErrorMessage } from '../utils/apiError';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import Switch from './Switch';

interface Props {
  shopId: string;
  /** Whether the manager role is on offer (the owner, or a manager allowed to manage managers). */
  canAddManager: boolean;
  /** Called with the new member and whether the invite email was sent. */
  onCreated: (member: TeamMember, emailSent: boolean) => void;
  onClose: () => void;
}

// Add a team member (the form that used to live on the shop Invites page).
// Giving someone the manager role goes through an extra confirmation.
export default function AddMemberModal({ shopId, canAddManager, onCreated, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('staff');
  const [canViewCustomerDetails, setCanViewCustomerDetails] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [confirmManager, setConfirmManager] = useState(false);
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
      setConfirmManager(false);
      setError(apiErrorMessage(err, t.invites.errorSend));
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'manager' && !confirmManager) {
      setConfirmManager(true);
      return;
    }
    submitCreate();
  };

  return (
    <>
      <Modal
        onClose={() => { if (!sending) onClose(); }}
        labelledBy={`${uid}-title`}
        paused={confirmManager}
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
                  onChange={(e) => { setRole(e.target.value as AssignableRole); setConfirmManager(false); }}
                  disabled={sending}
                >
                  <option value="staff">{t.invites.roles.staff}</option>
                  {canAddManager && <option value="manager">{t.invites.roles.manager}</option>}
                </select>
              </div>
            </div>

            {role === 'staff' && (
              <div className="setting-row">
                <div className="setting-row__label">
                  <span className="setting-row__title">{t.invites.canViewCustomerDetails}</span>
                  <span className="setting-row__text">{t.invites.canViewCustomerDetailsDesc}</span>
                </div>
                <Switch
                  checked={canViewCustomerDetails}
                  onChange={setCanViewCustomerDetails}
                  label={t.invites.canViewCustomerDetails}
                  disabled={sending}
                />
              </div>
            )}

            <div className="setting-row">
              <div className="setting-row__label">
                <span className="setting-row__title">{t.invites.sendEmailNow}</span>
                <span className="setting-row__text">{t.invites.sendEmailNowDesc}</span>
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

      {confirmManager && (
        <ConfirmDialog
          tone="warning"
          title={t.invites.managerInviteTitle.replace('{name}', name)}
          message={t.invites.confirmManagerInvite}
          confirmLabel={t.invites.managerInviteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={sending}
          onConfirm={submitCreate}
          onCancel={() => setConfirmManager(false)}
        />
      )}
    </>
  );
}
