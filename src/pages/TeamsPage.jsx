import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Flex, Input, Space, Tag, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import { getNextTeamId, getTournamentStatus } from '../utils/helpers';
import { buildSchedule, buildKnockout, buildGroups } from '../utils/schedule';
import { FiLock } from 'react-icons/fi';

const { Text, Title } = Typography;
const initialForm = { name: '', player1: '', player2: '' };

export default function TeamsPage() {
  const { tournament, teams, isMobile, update } = useTournament();
  const navigate = useNavigate();
  const [teamForm, setTeamForm] = useState(initialForm);
  const [playerPoolForm, setPlayerPoolForm] = useState('');

  const status = getTournamentStatus(tournament);
  const isLocked = status !== 'setup';
  const playerPool = tournament.playerPool || [];

  function handleAddTeam(e) {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.player1.trim() || !teamForm.player2.trim()) return;
    const nextTeam = {
      id: getNextTeamId(teams),
      name: teamForm.name.trim(),
      players: [teamForm.player1.trim(), teamForm.player2.trim()],
    };
    update((t) => ({ ...t, teams: [...t.teams, nextTeam], matches: [], selectedMatchId: null }));
    setTeamForm(initialForm);
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

  return (
    <Card
      styles={{ body: { padding: '14px 16px' } }}
      style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Title level={4} style={{ margin: 0 }}>Teams</Title>
        <Flex gap={6} align="center">
          <Tag color={(tournament.format || 'league') === 'knockout' ? 'volcano' : (tournament.format || 'league') === 'groups' ? 'purple' : 'blue'}>
            {(tournament.format || 'league') === 'knockout' ? '🥊 Knockout' : (tournament.format || 'league') === 'groups' ? `👥 Groups ×${tournament.numGroups ?? 2}` : '🔄 League'}
          </Tag>
          <Tag>{teams.length} registered</Tag>
        </Flex>
      </Flex>

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

      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Or add a team manually:</Text>
      <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 10 }}>
        <Input value={teamForm.name} placeholder="Team name" onChange={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))} />
        <Input value={teamForm.player1} placeholder="Player 1" onChange={(e) => setTeamForm((p) => ({ ...p, player1: e.target.value }))} />
        <Input value={teamForm.player2} placeholder="Player 2" onChange={(e) => setTeamForm((p) => ({ ...p, player2: e.target.value }))} />
        <Button type="primary" htmlType="submit">Add</Button>
      </form>

      <Flex align="center" gap="small" wrap="wrap" style={{ marginBottom: 10 }}>
        <Button
          onClick={handleGenerateFixtures}
          disabled={teams.length < 2 || tournament.matches.length > 0}
          type="primary" ghost
        >
          Generate Fixtures
        </Button>
        <Flex align="center" gap={4}>
          <Text style={{ fontSize: 12, color: '#64748b' }}>Courts:</Text>
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
