import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMembers, removeMember, type TeamMember } from '../api/team.api';
import { handleActivateKeyDown } from '../utils/a11y';
import '../styles/pages/team.css';

export default function ShopTeamPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const isOwner = shop?.role === 'owner';

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    getMembers(shop.id)
      .then(setMembers)
      .catch(() => setError(t.team.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id]);

  const handleRemove = async (memberId: string) => {
    if (!shop) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await removeMember(shop.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setConfirmRemove(null);
    } catch {
      setRemoveError(t.team.errorRemove);
    } finally {
      setRemoving(false);
    }
  };

  // Shared between the table row's actions cell and the mobile card's
  // actions row — same remove/confirm UI, just placed differently.
  const renderActions = (member: TeamMember) =>
    confirmRemove === member.id ? (
      <div className="team-confirm-remove">
        <button
          className="btn btn-danger"
          onClick={() => handleRemove(member.id)}
          disabled={removing}
        >
          {removing ? t.team.removing : t.team.confirmRemove}
        </button>
        <button className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>
          {t.team.cancel}
        </button>
      </div>
    ) : (
      <button
        className="btn btn-ghost team-remove-btn"
        onClick={() => {
          setConfirmRemove(member.id);
          setRemoveError('');
        }}
      >
        {t.team.remove}
      </button>
    );

  if (shopLoading || loading) {
    return (
      <div className="team-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="team-header">
        <h1>{t.team.title}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {members.length === 0 ? (
        <p className="team-empty">{t.team.noMembers}</p>
      ) : (
        <>
          {/* Desktop / tablet: table (hidden below 640px) */}
          <div className="data-table-card table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.team.email}</th>
                  <th>{t.team.role}</th>
                  <th>{t.team.joined}</th>
                  {isOwner && <th>{t.team.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="data-table-row data-table-row--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(member.id)}
                    onKeyDown={handleActivateKeyDown(() => navigate(member.id))}
                  >
                    <td>
                      {member.email}
                      {!member.userId && (
                        <span className="team-no-login-badge">{t.team.noLoginYet}</span>
                      )}
                    </td>
                    <td>
                      <span className={`team-role-badge team-role-${member.role}`}>
                        {t.team.roles[member.role]}
                      </span>
                    </td>
                    <td className="team-date">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {renderActions(member)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {removeError && (
              <div style={{ padding: '0.75rem 1.25rem' }}>
                <div className="alert alert-error">{removeError}</div>
              </div>
            )}
          </div>

          {/* Mobile: stacked cards (hidden at 640px and above) */}
          <div className="row-cards card-view">
            {members.map((member) => (
              <div
                key={member.id}
                className="row-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(member.id)}
                onKeyDown={handleActivateKeyDown(() => navigate(member.id))}
              >
                <div className="row-card__field">
                  <span className="row-card__label">{t.team.email}</span>
                  <span className="row-card__value">
                    {member.email}
                    {!member.userId && (
                      <span className="team-no-login-badge">{t.team.noLoginYet}</span>
                    )}
                  </span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.team.role}</span>
                  <span className={`team-role-badge team-role-${member.role}`}>
                    {t.team.roles[member.role]}
                  </span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.team.joined}</span>
                  <span className="row-card__value">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {isOwner && (
                  <div
                    className="row-card__actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {renderActions(member)}
                  </div>
                )}
              </div>
            ))}
            {removeError && <div className="alert alert-error">{removeError}</div>}
          </div>
        </>
      )}
    </div>
  );
}
