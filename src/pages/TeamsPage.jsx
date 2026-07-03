import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Flex, Input, Space, Tag, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import { useTournaments } from '../context/TournamentsContext';
import { getNextTeamId, getTournamentStatus } from '../utils/helpers';
import { buildSchedule, buildKnockout, buildGroups } from '../utils/schedule';
import { FiLock, FiCheck, FiX } from 'react-icons/fi';

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
  const isLocked = status !== 'setup';
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

  function handleGenerateFixtures() {
    if (tournament.matches.length > 0) return;
    update((t) => {
      if (t.format === 'groups') {
        const { matches, groupAssignments } = buildGroups(t.teams, t.numGroups ?? 2, t.courts ?? 2, t.groupFormat ?? 'league');
        return { ...t, matches, groupAssignments, selectedMatchId: null };
      }
      return {
        ...t,
        matches: (t.format || 'league') === 'knockout'
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
    // Always save the base format (league/knockout); keep groups active if already set
    update((t) => ({
      ...t,
      parentFormat: f,
      format: t.format === 'groups' ? 'groups' : f,
      matches: [],
      selectedMatchId: null,
    }));
  }

  function handleUpdateNumGroups(n) {
    // 0 = no groups → revert to parentFormat; 2/3/4 = groups stage
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
      style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: !isLocked ? 8 : 10 }}>
        <Title level={4} style={{ margin: 0 }}>Teams</Title>
        <Tag>{teams.length} registered</Tag>
      </Flex>

      {/* ── Format + groups config (setup only) ── */}
      {!isLocked && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Format</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[{ v: 'league', icon: '🔄', label: 'League' }, { v: 'knockout', icon: '🥊', label: 'Knockout' }].map(({ v, icon, label }) => {
              const baseFormat = tournament.format === 'groups'
                ? (tournament.parentFormat || 'league')
                : (tournament.format || 'league');
              const active = baseFormat === v;
              return (
                <button key={v} onClick={() => handleUpdateFormat(v)} style={{
                  flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  border: active ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#fff',
                  color: active ? '#1d4ed8' : '#374151',
                  fontWeight: 700, fontSize: 12, textAlign: 'center',
                }}>{icon} {label}</button>
              );
            })}
          </div>
          {(tournament.format === 'league' || tournament.format === 'groups' || tournament.format === 'knockout' || !tournament.format) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>👥 Groups:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ n: 0, label: '—' }, { n: 2, label: '2' }, { n: 3, label: '3' }, { n: 4, label: '4' }].map(({ n, label }) => {
                  const cur = tournament.format === 'groups' ? (tournament.numGroups ?? 2) : 0;
                  const active = cur === n;
                  return (
                    <button key={n} onClick={() => handleUpdateNumGroups(n)} style={{
                      minWidth: 32, height: 30, borderRadius: 8, cursor: 'pointer', padding: '0 8px',
                      border: active ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
                      background: active ? '#7c3aed' : '#fff',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 700, fontSize: 13,
                    }}>{label}</button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {tournament.format === 'groups' ? `${tournament.numGroups ?? 2} groups → playoffs` : 'no groups'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Locked banner ── */}
      {isLocked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: status === 'completed' ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fff7ed,#ffedd5)',
          border: `1px solid ${status === 'completed' ? '#86efac' : '#fdba74'}`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
        }}>
          <FiLock size={16} color={status === 'completed' ? '#16a34a' : '#ea580c'} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: status === 'completed' ? '#15803d' : '#c2410c' }}>
              {status === 'completed' ? 'Tournament completed' : 'Tournament in progress'}
            </div>
            <div style={{ fontSize: 11, color: status === 'completed' ? '#16a34a' : '#ea580c', marginTop: 1 }}>
              Teams are locked — editing is disabled once fixtures are generated
            </div>
          </div>
        </div>
      )}

      {/* ── Forms — hidden when locked ── */}
      {!isLocked && (
        <>
      {/* Add team */}
      <form onSubmit={handleAddTeam} style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 12, padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
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
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 12, color: '#2563eb', display: 'block', marginBottom: 6 }}>⚡ Quick-add players → auto teams</Text>
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

      <Flex align="center" gap="small" wrap="wrap" style={{ marginBottom: 10 }}>
        <Button
          onClick={handleGenerateFixtures}
          disabled={teams.length < 2 || tournament.matches.length > 0}
          type="primary" ghost
        >
          Generate Fixtures
        </Button>
        <Flex align="center" gap={4}>
          <Input
            type="number" min={1} max={10}
            value={tournament.courts ?? 2}
            onChange={(e) => handleUpdateCourts(e.target.value)}
            style={{ width: 54 }} size="small"
          />
        </Flex>
      </Flex>
        </>
      )}

      {/* Pending team requests */}
      {(tournament.teamRequests || []).filter(r => r.status === 'pending').length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            🙋 Pending Requests ({(tournament.teamRequests || []).filter(r => r.status === 'pending').length})
          </div>
          {(tournament.teamRequests || []).filter(r => r.status === 'pending').map(req => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{req.teamName}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{req.player1} · {req.player2}</div>
              </div>
              <Button
                size="small" type="primary"
                icon={<FiCheck size={12} />}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
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
          <div key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 12, border: '1px solid #d4deea', background: '#fbfdff' }}>
            <Text strong>{team.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{team.players[0]} & {team.players[1]}</Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}
