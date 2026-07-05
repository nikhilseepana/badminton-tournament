import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Flex, Input, Space, Tag, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import { useTournaments } from '../context/TournamentsContext';
import { getNextTeamId, getTournamentStatus } from '../utils/helpers';
import { buildSchedule, buildKnockout, buildGroups } from '../utils/schedule';
import { FiLock, FiCheck, FiTrash2, FiX } from 'react-icons/fi';

const { Text, Title } = Typography;

export default function TeamsPage() {
  const { tournament, teams, update } = useTournament();
  const { addTeamRequest, approveTeamRequest, rejectTeamRequest } = useTournaments();
  const navigate = useNavigate();
  const location = useLocation();
  const [playerPoolForm, setPlayerPoolForm] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [teamNameForm, setTeamNameForm] = useState('');
  const [teamNameEdited, setTeamNameEdited] = useState(false);
  const [addError, setAddError] = useState('');

  // Auto-add pending request from URL params (cross-device request link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jp1 = params.get('joinp1'), jp2 = params.get('joinp2'), jt = params.get('jointeam');
    if (jp1 && jp2) {
      addTeamRequest(tournament.id, { player1: jp1, player2: jp2, teamName: jt || `${jp1} & ${jp2}` });
      // Clean the URL
      navigate(location.pathname, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const status = getTournamentStatus(tournament);
  const isLocked = status !== 'upcoming';
  const playerPool = tournament.playerPool || [];

  function handleP1Change(val) {
    setP1(val);
    if (!teamNameEdited) setTeamNameForm(val && p2 ? `${val} & ${p2}` : val || p2 || '');
  }
  function handleP2Change(val) {
    setP2(val);
    if (!teamNameEdited) setTeamNameForm(p1 && val ? `${p1} & ${val}` : p1 || val || '');
  }
  function handleAddTeam(e) {
    e.preventDefault();
    const name = teamNameForm.trim() || (p1.trim() && p2.trim() ? `${p1.trim()} & ${p2.trim()}` : p1.trim() || p2.trim());
    if (!name || !p1.trim() || !p2.trim()) return;
    // Duplicate player check
    const allPlayers = teams.flatMap(t => (t.players || []).map(p => p.toLowerCase().trim()));
    const dup = [p1.trim(), p2.trim()].find(p => allPlayers.includes(p.toLowerCase()));
    if (dup) { setAddError(`"${dup}" is already in another team`); return; }
    if (p1.trim().toLowerCase() === p2.trim().toLowerCase()) { setAddError('Player 1 and Player 2 cannot be the same'); return; }
    setAddError('');
    update((t) => ({ ...t, teams: [...t.teams, { id: getNextTeamId(t.teams), name, players: [p1.trim(), p2.trim()] }], matches: [], selectedMatchId: null }));
    setP1(''); setP2(''); setTeamNameForm(''); setTeamNameEdited(false);
  }

  function handleAddPlayer() {
    const name = playerPoolForm.trim();
    if (!name) return;
    update((t) => ({ ...t, playerPool: [...(t.playerPool || []), name] }));
    setPlayerPoolForm('');
  }

  function handleRemovePlayer(idx) {
    update((t) => ({ ...t, playerPool: (t.playerPool || []).filter((_, i) => i !== idx) }));
  }

  function handleAutoCreateTeams() {
    update((t) => {
      const pool = [...(t.playerPool || [])].sort(() => Math.random() - 0.5);
      if (pool.length < 2) return t;
      const newTeams = [...t.teams];
      let nextId = getNextTeamId(newTeams);
      while (pool.length >= 2) {
        const p1 = pool.shift(), p2 = pool.shift();
        newTeams.push({ id: nextId++, name: `${p1} & ${p2}`, players: [p1, p2] });
      }
      return { ...t, teams: newTeams, playerPool: pool, matches: [] };
    });
  }

  function handleDeleteTeam(teamId) {
    update((t) => {
      const nextTeams = (t.teams || []).filter((tm) => tm.id !== teamId);
      const nextGroupAssignments = Object.fromEntries(
        Object.entries(t.groupAssignments || {}).filter(([id]) => Number(id) !== Number(teamId))
      );

      // Reset fixtures when roster changes to avoid stale references.
      return {
        ...t,
        teams: nextTeams,
        groupAssignments: nextGroupAssignments,
        matches: [],
        selectedMatchId: null,
      };
    });
  }

  function handleGenerateFixtures() {
    if (tournament.matches.length > 0) {
      navigate('draw');
      return;
    }
    update((t) => {
      if (t.format === 'groups') {
        const { matches, groupAssignments } = buildGroups(
          t.teams,
          t.numGroups ?? 2,
          t.courts ?? 2,
          t.groupFormat ?? 'league'
        );
        return { ...t, matches, groupAssignments, selectedMatchId: null };
      }

      const effectiveFormat = t.format || 'league';

      return {
        ...t,
        matches: effectiveFormat === 'knockout'
          ? buildKnockout(t.teams, t.courts ?? 2)
          : buildSchedule(t.teams, t.courts ?? 2),
        selectedMatchId: null,
      };
    });
    navigate('draw');
  }

  function handleUpdateCourts(val) {
    const n = Math.max(1, Math.min(10, Number(val) || 1));
    update((t) => ({ ...t, courts: n }));
  }

  function handleUpdateFormat(f) {
    // Save base format and keep groups toggle independent.
    update((t) => ({
      ...t,
      parentFormat: f,
      format: t.format === 'groups' ? 'groups' : f,
      matches: [],
      selectedMatchId: null,
    }));
  }

  function handleUpdateNumGroups(n) {
    // 0 = no groups, 2/3/4 = grouped stage then playoffs.
    update((t) => ({
      ...t,
      format: n > 0 ? 'groups' : (t.parentFormat || 'league'),
      numGroups: n || 2,
      matches: [],
      selectedMatchId: null,
    }));
  }

  return (
    <Card
      styles={{ body: { padding: '14px 16px' } }}
      style={{ border: '1px solid rgba(63,98,91,0.12)', boxShadow: '0 4px 20px rgba(31,70,60,0.08)', borderRadius: 18 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: !isLocked ? 8 : 10 }}>
        <Title level={4} style={{ margin: 0 }}>Teams</Title>
        <Tag>{teams.length} registered</Tag>
      </Flex>

      {/* ── Format config (upcoming only) ── */}
      {!isLocked && (
        <div style={{ background: '#fbfcff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Format</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: 'league', icon: '🔄', label: 'League' }, { v: 'knockout', icon: '🥊', label: 'Knockout' }].map(({ v, icon, label }) => {
              const baseFormat = tournament.format === 'groups'
                ? (tournament.parentFormat || 'league')
                : (tournament.format || 'league');
              const active = baseFormat === v;
              return (
                <button key={v} onClick={() => handleUpdateFormat(v)} style={{
                  flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  border: active ? '2px solid #3e4f7a' : '1.5px solid #e2e8f0',
                  background: active ? '#eef1f7' : '#fff',
                  color: active ? '#3e4f7a' : '#374151',
                  fontWeight: 700, fontSize: 12, textAlign: 'center',
                }}>{icon} {label}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Locked banner ── */}
      {isLocked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: status === 'completed' ? 'linear-gradient(135deg,#eef7f2,#e4f2ec)' : 'linear-gradient(135deg,#f8f1e8,#f4ebe0)',
          border: `1px solid ${status === 'completed' ? '#b9dccc' : '#d8c4ac'}`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
        }}>
          <FiLock size={16} color={status === 'completed' ? '#3e4f7a' : '#9a6b3f'} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: status === 'completed' ? '#3e4f7a' : '#8b633d' }}>
              {status === 'completed' ? 'Tournament completed' : 'Tournament in progress'}
            </div>
            <div style={{ fontSize: 11, color: status === 'completed' ? '#4f5f8f' : '#9a6b3f', marginTop: 1 }}>
              Teams are locked — editing is disabled once matches start
            </div>
          </div>
        </div>
      )}

      {/* ── Forms — hidden when locked ── */}
      {!isLocked && (
        <>
      {/* Add team */}
      <form onSubmit={handleAddTeam} style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Team</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input value={p1} placeholder="Player 1" onChange={(e) => handleP1Change(e.target.value)} size="small" style={{ flex: 1 }} />
          <Input value={p2} placeholder="Player 2" onChange={(e) => handleP2Change(e.target.value)} size="small" style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input
            value={teamNameForm}
            placeholder="Team name (auto)"
            onChange={(e) => { setTeamNameForm(e.target.value); setTeamNameEdited(true); }}
            onBlur={() => { if (!teamNameForm.trim()) setTeamNameEdited(false); }}
            size="small"
            style={{ flex: 1 }}
          />
          <Button type="primary" htmlType="submit" size="small" disabled={!p1.trim() || !p2.trim()}>Add</Button>
        </div>
        {addError && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, padding: '2px 2px' }}>⚠️ {addError}</div>}
      </form>

      {/* Player pool */}
      <div style={{ background: 'linear-gradient(135deg,#eef1f7,#f5f7fc)', border: '1px solid #d8e0ee', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 12, color: '#3e4f7a', display: 'block', marginBottom: 6 }}>⚡ Quick-add players → auto teams</Text>
        <form onSubmit={(e) => { e.preventDefault(); handleAddPlayer(); }} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <Input value={playerPoolForm} placeholder="Player name" onChange={(e) => setPlayerPoolForm(e.target.value)} style={{ flex: 1 }} size="small" />
          <Button type="primary" htmlType="submit" size="small">Add</Button>
        </form>
        {playerPool.length > 0 ? (
          <>
            <Flex wrap="wrap" gap={4} style={{ marginBottom: 6 }}>
              {playerPool.map((p, i) => (
                <Tag key={i} closable onClose={() => handleRemovePlayer(i)} color="blue" style={{ margin: 0 }}>{p}</Tag>
              ))}
            </Flex>
            {playerPool.length >= 2 && (
              <Button size="small" type="primary" onClick={handleAutoCreateTeams}>
                ⚡ Create {Math.floor(playerPool.length / 2)} team{Math.floor(playerPool.length / 2) !== 1 ? 's' : ''} from pool
              </Button>
            )}
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>Add players above — every pair becomes a team</Text>
        )}
      </div>

      <div style={{ marginBottom: 10, border: '1px solid #dfe5f1', background: '#f8faff', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Fixture Settings
        </div>
        <Flex align="center" gap="small" wrap="wrap" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Courts</span>
          <Input
            type="number" min={1} max={10}
            value={tournament.courts ?? 2}
            onChange={(e) => handleUpdateCourts(e.target.value)}
            style={{ width: 64 }} size="small"
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {tournament.format === 'groups' ? `with ${tournament.numGroups ?? 2} groups` : 'single table / bracket'}
          </span>
        </Flex>

        <Flex align="center" gap="small" wrap="wrap" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Groups</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ n: 0, label: '—' }, { n: 2, label: '2' }, { n: 3, label: '3' }, { n: 4, label: '4' }].map(({ n, label }) => {
              const cur = tournament.format === 'groups' ? (tournament.numGroups ?? 2) : 0;
              const active = cur === n;
              return (
                <button
                  key={n}
                  onClick={() => handleUpdateNumGroups(n)}
                  style={{
                    minWidth: 32,
                    height: 30,
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: '0 8px',
                    border: active ? '2px solid #596c95' : '1.5px solid #d7deeb',
                    background: active ? '#596c95' : '#fff',
                    color: active ? '#fff' : '#374151',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {tournament.format === 'groups' ? `${tournament.numGroups ?? 2} groups → playoffs` : 'no groups'}
          </span>
        </Flex>

        <button
          onClick={handleGenerateFixtures}
          disabled={teams.length < 2}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 10,
            border: 'none',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.2,
            cursor: teams.length < 2 ? 'not-allowed' : 'pointer',
            background: teams.length < 2
              ? '#e5e7eb'
              : 'linear-gradient(135deg,#3e4f7a,#51638f)',
            color: teams.length < 2 ? '#9ca3af' : '#ffffff',
            boxShadow: teams.length < 2
              ? 'none'
              : '0 8px 20px rgba(62,79,122,0.28)',
          }}
        >
          {tournament.matches.length > 0 ? 'Open Draw' : 'Generate Fixtures'}
        </button>
      </div>
        </>
      )}

      {/* Pending team requests */}
      {(tournament.teamRequests || []).filter(r => r.status === 'pending').length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            🙋 Pending Requests ({(tournament.teamRequests || []).filter(r => r.status === 'pending').length})
          </div>
          {(tournament.teamRequests || []).filter(r => r.status === 'pending').map(req => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#f8f4ea', border: '1px solid #e5d5bc', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{req.teamName}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{req.player1} · {req.player2}</div>
              </div>
              <Button
                size="small" type="primary"
                icon={<FiCheck size={12} />}
                style={{ background: '#3e4f7a', borderColor: '#3e4f7a' }}
                onClick={() => {
                  const allPlayers = teams.flatMap(t => (t.players || []).map(p => p.toLowerCase()));
                  if (allPlayers.includes(req.player1.toLowerCase()) || allPlayers.includes(req.player2.toLowerCase())) {
                    alert(`A player in this request is already on a team`);
                    return;
                  }
                  approveTeamRequest(tournament.id, req.id, { id: getNextTeamId(teams), name: req.teamName, players: [req.player1, req.player2] });
                }}
              >Approve</Button>
              <Button size="small" danger icon={<FiX size={12} />} onClick={() => rejectTeamRequest(tournament.id, req.id)}>Reject</Button>
            </div>
          ))}
        </div>
      )}

      {/* Team list — always visible, read-only */}
      <Space direction="vertical" style={{ width: '100%' }}>
        {teams.map((team) => (
          <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, border: '1px solid #dfe4ee', background: '#fbfcff' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong>{team.name}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>{team.players[0]} & {team.players[1]}</Text>
              </div>
            </div>
            {!isLocked && (
              <button
                onClick={() => handleDeleteTeam(team.id)}
                title="Delete team"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: '#faf2f2',
                  color: '#d27575',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </Space>
    </Card>
  );
}
