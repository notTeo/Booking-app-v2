import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMembers, removeMember, type TeamMember } from '../api/team.api';
import { handleActivateKeyDown } from '../utils/a11y';
import '../styles/pages/team.css';
import Alert from '../components/Alert';

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
          className="btn btn--danger btn--sm"
          onClick={() => handleRemove(member.id)}
          disabled={removing}
        >
          {removing ? t.team.removing : t.team.confirmRemove}
        </button>
        <button className="btn btn--secondary btn--sm" onClick={() => setConfirmRemove(null)}>
          {t.team.cancel}
        </button>
      </div>
    ) : (
      <button
        className="btn btn--secondary btn--sm team-remove-btn"
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

      {error && <Alert variant="danger">{error}</Alert>}

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
                        <span className="badge badge--warning">{t.team.noLoginYet}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${member.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                        {t.team.roles[member.role]}
                      </span>
                      {!member.active && (
                        <span className="badge badge--neutral">{t.team.inactiveBadge}</span>
                      )}
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
                <Alert variant="danger">{removeError}</Alert>
              </div>
            )}
          </div>

          {/* Mobile: stacked cards (hidden at 640px and above) */}
          <div className="row-cards card-view">
            {members.map((member) => (
              <div
                key={member.id}
                className="card card--interactive row-card"
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
                      <span className="badge badge--warning">{t.team.noLoginYet}</span>
                    )}
                  </span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.team.role}</span>
                  <span className={`badge ${member.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                    {t.team.roles[member.role]}
                  </span>
                  {!member.active && (
                    <span className="badge badge--neutral">{t.team.inactiveBadge}</span>
                  )}
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
            {removeError && <Alert variant="danger">{removeError}</Alert>}
          </div>
        </>
      )}
    </div>
  );
}
