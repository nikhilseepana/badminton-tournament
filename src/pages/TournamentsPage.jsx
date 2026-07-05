import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Typography } from 'antd';
import { FiArchive, FiBarChart2, FiChevronRight, FiEdit2, FiGitBranch, FiPlus, FiRefreshCw, FiSearch, FiShare2, FiTrash2, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { useTournaments } from '../context/TournamentsContext';
import { getTournamentStatus } from '../utils/helpers';

const { Text } = Typography;

function BrandBadge({ size = 20, rounded = 12 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: 'linear-gradient(135deg,#5d6f9c,#3e4f7a)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: Math.max(10, Math.floor(size * 0.42)),
        letterSpacing: 0.4,
        boxShadow: '0 6px 18px rgba(62,79,122,0.2)',
      }}
    >
      GT
    </div>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>{done}/{total} matches played</Text>
        <Text style={{ fontSize: 12, color: pct === 100 ? '#3e4f7a' : '#4d5f84', fontWeight: 700 }}>{pct}%</Text>
      </div>
      <div style={{ height: 7, background: '#e5e9f2', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg,#6b82b1,#7f96c4)'
              : 'linear-gradient(90deg,#6077a8,#9aaed0)',
            borderRadius: 99,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    upcoming: { label: 'Upcoming', bg: '#eef1f7', color: '#435575' },
    ongoing: { label: 'Live', bg: '#eef1f7', color: '#3e4f7a' },
    completed: { label: 'Completed', bg: '#edf1fb', color: '#425b8d' },
    archived: { label: 'Archived', bg: '#f2f4f8', color: '#6b7280' },
  };
  const cfg = map[status] || map.upcoming;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.2,
        padding: '3px 10px',
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function TournamentsPage() {
  const navigate = useNavigate();
  const {
    tournaments,
    syncStatus,
    syncing,
    createNewTournament,
    deleteTournament,
    archiveTournament,
    unarchiveTournament,
  } = useTournaments();

  const [showCreate, setShowCreate] = useState(false);
  const [nameForm, setNameForm] = useState('');
  const [searchForm, setSearchForm] = useState('');
  const [formatForm, setFormatForm] = useState('league');
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const liveTournaments = tournaments.filter((t) => !t.archived);
  const archivedTournaments = tournaments.filter((t) => t.archived);
  const visibleTournaments = showArchived ? archivedTournaments : liveTournaments;
  const filteredTournaments = useMemo(() => {
    const q = searchForm.trim().toLowerCase();
    if (!q) return visibleTournaments;
    return visibleTournaments.filter((t) => t.name.toLowerCase().includes(q));
  }, [visibleTournaments, searchForm]);

  const totalMatches = useMemo(
    () => tournaments.reduce((sum, t) => sum + (t.matches?.length || 0), 0),
    [tournaments]
  );
  const doneMatches = useMemo(
    () => tournaments.reduce((sum, t) => sum + (t.matches?.filter((m) => m.winnerId !== null).length || 0), 0),
    [tournaments]
  );

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
    createNewTournament(name, formatForm, 2, 'league');
    setNameForm('');
    setFormatForm('league');
    setShowCreate(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 460px at -8% -10%, #eef1f7 0%, transparent 70%), radial-gradient(900px 320px at 100% 0%, #eff2f8 0%, transparent 65%), linear-gradient(170deg, #f6f5f1 0%, #f1f3f8 54%, #f5f7fc 100%)',
        fontFamily: "'Nunito Sans', 'Avenir Next', 'SF Pro Display', 'Segoe UI', sans-serif",
        paddingBottom: 28,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          borderBottom: '1px solid rgba(100,116,139,0.16)',
          padding: '0 16px',
          height: 62,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandBadge size={40} rounded={13} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 21, color: '#14242a', letterSpacing: -0.35 }}>GameTribe</div>
            <div style={{ fontSize: 11, color: '#7a8398', marginTop: -2 }}>Play. Score. Celebrate.</div>
          </div>
        </div>

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#8a90a6,#717a95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <FiUser size={16} color="#fff" />
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            borderRadius: 18,
            padding: '14px 14px 12px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(247,250,248,0.9))',
            border: '1px solid #dfe4ef',
            boxShadow: '0 8px 22px rgba(100,116,139,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.4, color: '#14242a' }}>
                {showArchived ? 'Archived Tournaments' : 'Your Tournaments'}
              </div>
              <div style={{ fontSize: 13, color: '#76829b' }}>
                {showArchived
                  ? `${archivedTournaments.length} archived events`
                  : `${liveTournaments.length} active events • ${doneMatches}/${totalMatches} matches complete`}
              </div>
            </div>
            <button
              onClick={() => setShowCreate((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 14,
                border: 'none',
                background: showCreate
                  ? 'linear-gradient(135deg,#eef1f7,#eaedf6)'
                  : 'linear-gradient(135deg,#4f5f8f,#3e4f7a)',
                color: showCreate ? '#3e4f7a' : '#fff',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: showCreate ? 'none' : '0 10px 20px rgba(62,79,122,0.2)',
              }}
            >
              {showCreate ? <FiX size={15} /> : <FiPlus size={15} />}
              {showCreate ? 'Close' : 'New'}
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <Input
              value={searchForm}
              onChange={(e) => setSearchForm(e.target.value)}
              placeholder={showArchived ? 'Search archived tournaments' : 'Search tournaments'}
              prefix={<FiSearch size={14} color="#8a96ad" />}
              allowClear
              style={{ borderRadius: 12 }}
            />
          </div>

          {syncStatus && (
            <div style={{ marginTop: 12 }}>
              <span
                style={{
                  display: 'inline-flex',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: syncStatus.startsWith('✅')
                    ? '#edf1fb'
                    : syncStatus.startsWith('⏳')
                      ? '#eef1f7'
                      : '#f8efef',
                  color: syncStatus.startsWith('✅')
                    ? '#425b8d'
                    : syncStatus.startsWith('⏳')
                      ? '#3e4f7a'
                      : '#9b4c4c',
                }}
              >
                {syncing ? `${syncStatus}...` : syncStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {showCreate && (
          <form
            onSubmit={handleCreate}
            style={{
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 18,
              padding: 16,
              marginBottom: 14,
              border: '1px solid #e2e6f0',
              boxShadow: '0 10px 26px rgba(100,116,139,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <Input
              value={nameForm}
              placeholder="Name your tournament"
              onChange={(e) => setNameForm(e.target.value)}
              autoFocus
              size="large"
              style={{ borderRadius: 12 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { v: 'league', Icon: FiRefreshCw, name: 'League', desc: 'Round robin style' },
                { v: 'knockout', Icon: FiGitBranch, name: 'Knockout', desc: 'Single elimination' },
              ].map(({ v, Icon, name, desc }) => {
                const selected = formatForm === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormatForm(v)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: selected ? '#eef1f7' : '#fbfcff',
                      border: selected ? '2px solid #3e4f7a' : '1px solid #e4e8f1',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: selected ? '#3e4f7a' : '#6077a8' }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: selected ? '#3e4f7a' : '#374151' }}>{name}</div>
                    <div style={{ fontSize: 11, color: '#7d8597' }}>{desc}</div>
                  </button>
                );
              })}
            </div>

            <Button type="primary" htmlType="submit" block size="large" style={{ borderRadius: 12, fontWeight: 800, height: 46 }}>
              Create Tournament
            </Button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTournaments.length === 0 && !showCreate && (
            <div
              style={{
                textAlign: 'center',
                padding: '44px 20px',
                borderRadius: 18,
                border: '1px dashed #d8dee8',
                background: 'rgba(255,255,255,0.7)',
              }}
            >
              <div style={{ display: 'inline-flex', marginBottom: 10 }}><BrandBadge size={52} rounded={16} /></div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#4b5563', marginBottom: 4 }}>
                {searchForm.trim()
                  ? 'No tournaments match your search'
                  : showArchived
                    ? 'No archived tournaments yet'
                    : 'No tournaments yet'}
              </div>
              {!showArchived && (
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    marginTop: 14,
                    padding: '11px 24px',
                    borderRadius: 12,
                    background: '#3e4f7a',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Create First Tournament
                </button>
              )}
            </div>
          )}

          {filteredTournaments.map((t) => {
            const done = t.matches.filter((m) => m.winnerId !== null).length;
            const total = t.matches.length;
            const fmt = t.format || 'league';
            const FormatIcon = fmt === 'knockout' ? FiGitBranch : fmt === 'groups' ? FiUsers : FiRefreshCw;
            const fmtLabel = fmt === 'knockout' ? 'Knockout' : fmt === 'groups' ? `Groups ×${t.numGroups ?? 2}` : 'League';
            const fmtBg = fmt === 'knockout'
              ? 'linear-gradient(135deg,#4f628d,#3e4f7a)'
              : fmt === 'groups'
                ? 'linear-gradient(135deg,#4f628d,#3e4f7a)'
                : 'linear-gradient(135deg,#51638f,#3e4f7a)';
            const status = getTournamentStatus(t);
            const pendingRequests = (t.teamRequests || []).filter((r) => r.status === 'pending').length;
            const effectiveStatus = status;
            const canEditSettings = status === 'upcoming';

            return (
              <div
                key={t.id}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 20,
                  border: '1px solid #e1e5ef',
                  boxShadow: '0 10px 24px rgba(100,116,139,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '16px 14px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: fmtBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                    >
                      <FormatIcon size={18} color="#ffffff" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 900,
                            color: '#15242a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                          }}
                        >
                          <span style={{ fontSize: 15 }}>{t.name}</span>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
                            {fmtLabel} · {t.teams.length} teams
                          </span>
                          <StatusPill status={effectiveStatus} />
                          {pendingRequests > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#4b5563',
                                background: '#f5f6f8',
                                border: '1px solid #dfe4ec',
                                padding: '2px 8px',
                                borderRadius: 999,
                              }}
                            >
                              {pendingRequests} request{pendingRequests > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!canEditSettings) return;
                          navigate(`/t/${t.id}/teams`);
                        }}
                        title={canEditSettings ? 'Edit settings' : 'Editing disabled after matches start'}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          border: 'none',
                          background: canEditSettings ? '#f3f5fa' : '#f5f6f8',
                          color: canEditSettings ? '#7d8597' : '#b1b6c2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: canEditSettings ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <FiEdit2 size={14} />
                      </button>

                      {t.archived ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unarchiveTournament(t.id);
                          }}
                          title="Unarchive"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            border: 'none',
                            background: '#edf1fb',
                            color: '#3e4f7a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <FiArchive size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveTournament(t.id);
                          }}
                          title="Archive"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            border: 'none',
                            background: '#f3f5fa',
                            color: '#7d8597',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <FiArchive size={14} />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTournament(t.id);
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          border: 'none',
                          background: '#faf2f2',
                          color: '#d27575',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {total > 0 && <ProgressBar done={done} total={total} />}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #edf1f6' }}>
                  <button
                    onClick={() => navigate(`/t/${t.id}/${t.matches.length > 0 ? 'draw' : 'teams'}`)}
                    style={{
                      padding: '13px 0',
                      border: 'none',
                      borderRight: '1px solid #edf1f6',
                      background: 'transparent',
                      color: '#3e4f7a',
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    Open <FiChevronRight size={15} />
                  </button>

                  <button
                    onClick={() => navigate(`/t/${t.id}/table`)}
                    style={{
                      padding: '13px 0',
                      border: 'none',
                      borderRight: '1px solid #edf1f6',
                      background: 'transparent',
                      color: '#62737a',
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <FiBarChart2 size={14} /> Stats
                  </button>

                  <button
                    onClick={(e) => copyShareLink(e, t.id)}
                    style={{
                      padding: '13px 0',
                      border: 'none',
                      background: copiedId === t.id ? '#edf1fb' : 'transparent',
                      color: copiedId === t.id ? '#425b8d' : '#62737a',
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <FiShare2 size={14} /> {copiedId === t.id ? 'Copied' : 'Share'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {archivedTournaments.length > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '11px 0',
              borderRadius: 12,
              border: '1px dashed #d8dee8',
              background: 'rgba(255,255,255,0.6)',
              color: '#6b7280',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <FiArchive size={14} />
            {showArchived ? 'Hide Archived' : `Show Archived (${archivedTournaments.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
