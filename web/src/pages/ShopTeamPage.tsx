import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleRowClick } from '../utils/a11y';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMembers, removeMember, type TeamMember } from '../api/team.api';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

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
      setConfirmRemove(null);
      setRemoveError(t.team.errorRemove);
    } finally {
      setRemoving(false);
    }
  };

  // Shared between the table row's actions cell and the mobile card's
  // actions row. The confirm dialog is rendered once, at the bottom.
  const renderActions = (member: TeamMember) => (
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

      <div className="table-wrap">
        <div className="table-surface">
          {members.length === 0 ? (
            <div className="empty empty--sm">
              <p className="empty__text">{t.team.noMembers}</p>
            </div>
          ) : (
            <table className="data-table" role="table">
              <thead>
                <tr role="row">
                  <th scope="col" role="columnheader">{t.team.email}</th>
                  <th scope="col" role="columnheader">{t.team.role}</th>
                  <th scope="col" role="columnheader">{t.team.joined}</th>
                  {isOwner && <th scope="col" role="columnheader">{t.team.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} role="row" className="is-clickable" onClick={handleRowClick(() => navigate(member.id))}>
                    <td role="cell" data-label={t.team.email} className="data-table__title">
                      <Link to={member.id} className="data-table__link">{member.email}</Link>
                      {!member.userId && (
                        <span className="badge badge--warning">{t.team.noLoginYet}</span>
                      )}
                    </td>
                    <td role="cell" data-label={t.team.role}>
                      <span className={`badge ${member.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                        {t.team.roles[member.role]}
                      </span>
                      {!member.active && (
                        <span className="badge badge--neutral">{t.team.inactiveBadge}</span>
                      )}
                    </td>
                    <td role="cell" data-label={t.team.joined}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td
                        role="cell"
                        data-label=""
                        className="data-table__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(member)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {removeError && <Alert variant="danger">{removeError}</Alert>}

      {confirmRemove && (
        <ConfirmDialog
          tone="danger"
          title={t.team.removeTitle.replace('{name}', members.find((m) => m.id === confirmRemove)?.name ?? '')}
          message={t.team.confirmRemovePrompt}
          confirmLabel={t.team.removeConfirmButton}
          cancelLabel={t.team.cancel}
          busy={removing}
          onConfirm={() => handleRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
