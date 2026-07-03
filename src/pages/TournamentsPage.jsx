import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Typography } from 'antd';
import { FiEdit2, FiTrash2, FiBarChart2, FiChevronRight, FiPlus, FiX, FiUser, FiArchive, FiShare2 } from 'react-icons/fi';
import { GiShuttlecock } from 'react-icons/gi';
import { useTournaments } from '../context/TournamentsContext';
import { getTournamentStatus } from '../utils/helpers';

const { Text } = Typography;

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>{done}/{total} matches played</Text>
        <Text style={{ fontSize: 11, color: pct === 100 ? '#16a34a' : '#2563eb', fontWeight: 600 }}>{pct}%</Text>
      </div>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  const navigate = useNavigate();
  const {
    tournaments, syncStatus, syncing,
    createNewTournament, renameTournament, deleteTournament,
    archiveTournament, unarchiveTournament,
  } = useTournaments();

  const [showCreate, setShowCreate] = useState(false);
  const [nameForm, setNameForm] = useState('');
  const [formatForm, setFormatForm] = useState('league');
  const [numGroupsForm, setNumGroupsForm] = useState(2);
  const [groupFormatForm, setGroupFormatForm] = useState('league');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  function copyShareLink(e, id) {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#/view/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleCreate(e) {
    e.preventDefault();
    const name = nameForm.trim();
    if (!name) return;
    const newId = createNewTournament(name, formatForm, numGroupsForm, groupFormatForm);
    setNameForm('');
    setFormatForm('league');
    setNumGroupsForm(2);
    setGroupFormatForm('league');
    setShowCreate(false);
    navigate(`/t/${newId}/teams`);
  }

  function saveEdit(id) {
    if (editingName.trim()) renameTournament(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  }

  const doneCounts = (t) => t.matches.filter((m) => m.winnerId !== null).length;

  const liveTournaments = tournaments.filter(t => !t.archived);
  const archivedTournaments = tournaments.filter(t => t.archived);
  const visibleTournaments = showArchived ? archivedTournaments : liveTournaments;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #eff6ff 0%, #f8faff 50%, #f0fdf4 100%)',
      fontFamily: "'SF Pro Display', 'Avenir Next', 'Segoe UI', sans-serif",
      paddingBottom: 24,
    }}>
      {/* ── App Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(37,99,235,0.1)',
        padding: '0 16px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GiShuttlecock size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', letterSpacing: '-0.3px' }}>BadTour</span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* User avatar — placeholder for future */}
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FiUser size={15} color="#fff" />
          </div>
        </div>
      </div>

      {/* Sync status pill */}
      {syncStatus && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px 0' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: syncStatus.startsWith('✅') ? '#dcfce7' : syncStatus.startsWith('⏳') ? '#eff6ff' : '#fee2e2', color: syncStatus.startsWith('✅') ? '#15803d' : syncStatus.startsWith('⏳') ? '#1d4ed8' : '#b91c1c' }}>
            {syncStatus}
          </span>
        </div>
      )}

      <div style={{ padding: '16px 14px 0' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px' }}>
              {showArchived ? 'Archived' : 'Tournaments'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
              {showArchived ? `${archivedTournaments.length} archived` : `${liveTournaments.length} event${liveTournaments.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12, border: 'none',
              background: showCreate ? '#e0e7ff' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color: showCreate ? '#3730a3' : '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: showCreate ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {showCreate ? <FiX size={14} /> : <FiPlus size={14} />}
            {showCreate ? 'Cancel' : 'New'}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 14, border: '1px solid #e0e7ff', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input
              value={nameForm}
              placeholder="Tournament name e.g. Summer Smash Cup"
              onChange={(e) => setNameForm(e.target.value)}
              autoFocus
              size="large"
              style={{ borderRadius: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'league', label: '🔄 League', desc: 'Round robin + playoffs' }, { v: 'knockout', label: '🥊 Knockout', desc: 'Single elimination' }, { v: 'groups', label: '👥 Groups', desc: 'Group stage + playoffs' }].map(({ v, label, desc }) => (
                <div
                  key={v}
                  onClick={() => setFormatForm(v)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                    background: formatForm === v ? '#eff6ff' : '#f8fafc',
                    border: formatForm === v ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: formatForm === v ? '#1d4ed8' : '#374151' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
            {formatForm === 'groups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', whiteSpace: 'nowrap' }}>Groups:</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[2, 3, 4].map((n) => (
                      <button key={n} onClick={() => setNumGroupsForm(n)} style={{ width: 32, height: 32, borderRadius: 8, border: numGroupsForm === n ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: numGroupsForm === n ? '#2563eb' : '#fff', color: numGroupsForm === n ? '#fff' : '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', whiteSpace: 'nowrap' }}>Within group:</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ v: 'league', label: '🔄 League' }, { v: 'knockout', label: '🥊 Knockout' }].map(({ v, label }) => (
                      <button key={v} onClick={() => setGroupFormatForm(v)} style={{ padding: '4px 12px', borderRadius: 8, border: groupFormatForm === v ? '2px solid #2563eb' : '1.5px solid #e2e8f0', background: groupFormatForm === v ? '#2563eb' : '#fff', color: groupFormatForm === v ? '#fff' : '#374151', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <Button type="primary" htmlType="submit" block size="large" style={{ borderRadius: 12, fontWeight: 700, height: 46 }}>
              Create Tournament
            </Button>
          </form>
        )}

        {/* Tournament list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleTournaments.length === 0 && !showCreate && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <GiShuttlecock size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                {showArchived ? 'No archived tournaments' : 'No tournaments yet'}
              </div>
              {!showArchived && (
                <>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 16 }}>Tap <strong>New</strong> to create your first one</div>
                  <button onClick={() => setShowCreate(true)} style={{ padding: '10px 24px', borderRadius: 12, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Create Tournament</button>
                </>
              )}
            </div>
          )}

          {visibleTournaments.map((t) => {
            const done = doneCounts(t);
            const total = t.matches.length;
            const fmt = t.format || 'league';
            const fmtIcon = fmt === 'knockout' ? '🥊' : fmt === 'groups' ? '👥' : '🔄';
            const fmtBg = fmt === 'knockout' ? 'linear-gradient(135deg,#ff6b35,#f43f5e)' : fmt === 'groups' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#2563eb,#06b6d4)';
            const fmtLabel = fmt === 'knockout' ? 'Knockout' : fmt === 'groups' ? `Groups ×${t.numGroups ?? 2}` : 'League';
            const status = getTournamentStatus(t);
            const statusMeta = {
              setup:     { label: 'Upcoming', bg: '#eff6ff', color: '#2563eb' },
              ongoing:   { label: 'Live 🔴',   bg: '#fff7ed', color: '#ea580c' },
              completed: { label: 'Completed', bg: '#f0fdf4', color: '#16a34a' },
            }[status];

            return (
              <div
                key={t.id}
                style={{
                  background: 'white', borderRadius: 16,
                  border: '1px solid #e8eef6',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Card top */}
                <div style={{ padding: '14px 14px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {/* Format icon badge */}
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: fmtBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 18 }}>{fmtIcon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === t.id ? (
                        <Input
                          size="small"
                          value={editingName}
                          autoFocus
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveEdit(t.id)}
                          onPressEnter={() => saveEdit(t.id)}
                        />
                      ) : (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {fmtLabel} · {t.teams.length} teams
                            <span style={{ padding: '1px 7px', borderRadius: 99, background: statusMeta.bg, color: statusMeta.color, fontWeight: 700, fontSize: 10 }}>
                              {statusMeta.label}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Edit / delete */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(t.id); setEditingName(t.name); }} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiEdit2 size={13} /></button>
                      {t.archived
                        ? <button onClick={(e) => { e.stopPropagation(); unarchiveTournament(t.id); }} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Unarchive"><FiArchive size={13} /></button>
                        : <button onClick={(e) => { e.stopPropagation(); archiveTournament(t.id); }} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Archive"><FiArchive size={13} /></button>
                      }
                      <button onClick={(e) => { e.stopPropagation(); deleteTournament(t.id); }} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiTrash2 size={13} /></button>
                    </div>
                  </div>

                  {total > 0 && <ProgressBar done={done} total={total} />}
                </div>

                {/* Card actions */}
                <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => navigate(`/t/${t.id}/${t.teams.length === 0 ? 'teams' : 'draw'}`)}
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRight: '1px solid #f1f5f9', WebkitTapHighlightColor: 'transparent' }}
                  >
                    Open <FiChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/t/${t.id}/table`)}
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderRight: '1px solid #f1f5f9', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <FiBarChart2 size={13} /> Stats
                  </button>
                  <button
                    onClick={(e) => copyShareLink(e, t.id)}
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: copiedId === t.id ? '#f0fdf4' : 'transparent', color: copiedId === t.id ? '#16a34a' : '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s' }}
                  >
                    <FiShare2 size={13} /> {copiedId === t.id ? 'Copied!' : 'Share'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Archived toggle */}
        {archivedTournaments.length > 0 && (
          <button
            onClick={() => setShowArchived(v => !v)}
            style={{ width: '100%', marginTop: 16, padding: '10px 0', borderRadius: 12, border: '1.5px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <FiArchive size={13} />
            {showArchived ? 'Hide Archived' : `Show Archived (${archivedTournaments.length})`}
          </button>
        )}
      </div>
    </div>
  );
}

