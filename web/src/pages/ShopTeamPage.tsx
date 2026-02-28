import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMembers, removeMember, type TeamMember } from '../api/team.api';
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
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
      setConfirmRemove(null);
    } catch {
      setRemoveError(t.team.errorRemove);
    } finally {
      setRemoving(false);
    }
  };

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
        <div className="team-table-card">
          <table className="team-table">
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
                  className="team-table-row"
                  onClick={() => navigate(member.userId)}
                >
                  <td>{member.user.email}</td>
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
                    >
                      {confirmRemove === member.userId ? (
                        <div className="team-confirm-remove">
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemove(member.userId)}
                            disabled={removing}
                          >
                            {removing ? t.team.removing : t.team.confirmRemove}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => setConfirmRemove(null)}
                          >
                            {t.team.cancel}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-ghost team-remove-btn"
                          onClick={() => {
                            setConfirmRemove(member.userId);
                            setRemoveError('');
                          }}
                        >
                          {t.team.remove}
                        </button>
                      )}
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
      )}
    </div>
  );
}
