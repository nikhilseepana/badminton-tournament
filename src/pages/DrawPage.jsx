import { useNavigate } from 'react-router-dom';
import { Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import { getKnockoutRoundLabel } from '../utils/schedule';
import { getGroupLabel } from '../utils/helpers';
import { FiBarChart2 } from 'react-icons/fi';

const { Text, Title } = Typography;

function MatchCard({ match, teamLookup, onOpen }) {
  const teamA = teamLookup.get(match.teamAId);
  const teamB = teamLookup.get(match.teamBId);
  const nameA = teamA?.name || (match.teamAFrom ? `Winner M${match.teamAFrom}` : 'TBD');
  const nameB = teamB?.name || (match.teamBFrom ? `Winner M${match.teamBFrom}` : 'TBD');
  const isTbd = !match.teamAId || !match.teamBId;
  return (
    <div
      onClick={() => !isTbd && onOpen(match.id)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        padding: '10px 12px', borderRadius: 12,
        border: match.winnerId ? '1px solid #86efac' : isTbd ? '1px dashed #d1d5db' : '1px solid #d4deea',
        background: match.winnerId ? '#f0fdf4' : isTbd ? '#f9fafb' : '#fcfdff',
        opacity: isTbd ? 0.65 : 1, cursor: isTbd ? 'default' : 'pointer',
      }}
    >
      <Flex align="center" gap={6}>
        <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 5px', lineHeight: '18px' }}>C{match.court || 1}</Tag>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {match.winnerId ? '✅ done' : match.scoreA > 0 || match.scoreB > 0 ? '🏸 live' : 'pending'}
        </Text>
      </Flex>
      <Flex align="center" gap={8} style={{ marginTop: 4 }}>
        <Text strong style={{ fontSize: 15, flex: 1, color: isTbd ? '#9ca3af' : match.winnerId === match.teamAId ? '#16a34a' : undefined }}>{nameA}</Text>
        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
          {match.scoreA > 0 || match.scoreB > 0 ? `${match.scoreA} – ${match.scoreB}` : 'vs'}
        </Text>
        <Text strong style={{ fontSize: 15, flex: 1, textAlign: 'right', color: isTbd ? '#9ca3af' : match.winnerId === match.teamBId ? '#16a34a' : undefined }}>{nameB}</Text>
      </Flex>
    </div>
  );
}

export default function DrawPage() {
  const { tournament, matches, teamLookup, handleOpenMatch, update } = useTournament();
  const navigate = useNavigate();
  const format = tournament.format || 'league';
  const isKnockout = format === 'knockout';
  const isGroups = format === 'groups';
  const fixturesDone = matches.filter((m) => m.winnerId !== null).length;

  const leagueMatches = matches.filter((m) => m.phase !== 'playoff');
  const leagueDone = leagueMatches.length > 0 && leagueMatches.every((m) => m.winnerId !== null);
  const hasPlayoffs = matches.some((m) => m.phase === 'playoff');
  const playoffMatches = matches.filter((m) => m.phase === 'playoff');

  // --- Groups view ---
  if (isGroups) {
    const numGroups = tournament.numGroups ?? 2;
    const gFmt = tournament.groupFormat || 'league';
    const groupMatchesByGroup = Array.from({ length: numGroups }, (_, gi) =>
      matches.filter((m) => m.group === gi)
    );
    const playoffRoundNums = [...new Set(playoffMatches.map((m) => m.round))].sort((a, b) => a - b);
    const maxPlayoffRound = playoffRoundNums.length ? Math.max(...playoffRoundNums) : null;
    const byPlayoffRound = playoffMatches.reduce((acc, m) => { (acc[m.round] = acc[m.round] || []).push(m); return acc; }, {});

    return (
      <Card styles={{ body: { padding: '14px 16px' } }} style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>Draw</Title>
          <Flex gap="small" align="center">
            <Text type="secondary" style={{ fontSize: 11 }}>{tournament.courts ?? 2} courts</Text>
            <Tag>{fixturesDone} / {matches.length} done</Tag>
            <button onClick={() => navigate(`/t/${tournament.id}/table`)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <FiBarChart2 size={12} /> Stats
            </button>
          </Flex>
        </Flex>

        {matches.length === 0 && <Text type="secondary">No fixtures yet. Go to Teams and tap Generate Fixtures.</Text>}

        {/* Group sections */}
        {groupMatchesByGroup.map((gMatches, gi) => {
          const byRound = gMatches.reduce((acc, m) => { (acc[m.round] = acc[m.round] || []).push(m); return acc; }, {});
          const doneCnt = gMatches.filter((m) => m.winnerId).length;
          return (
            <div key={gi} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{getGroupLabel(gi)}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 6 }}>{gFmt === 'knockout' ? '🥊 Knockout' : '🔄 League'}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{doneCnt}/{gMatches.length} done</span>
              </div>
              {Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map((r) => (
                <div key={r} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 3 }}>Round {r}</Text>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {byRound[r].map((m) => <MatchCard key={m.id} match={m} teamLookup={teamLookup} onOpen={handleOpenMatch} />)}
                  </Space>
                </div>
              ))}
            </div>
          );
        })}

        {/* Playoffs */}
        {hasPlayoffs && playoffRoundNums.map((r) => (
          <div key={r} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 4 }}>
              {r === maxPlayoffRound ? '🏆 Final' : 'Semifinals'}
            </Text>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(byPlayoffRound[r] || []).map((m) => <MatchCard key={m.id} match={m} teamLookup={teamLookup} onOpen={handleOpenMatch} />)}
            </Space>
          </div>
        ))}
      </Card>
    );
  }

  // --- League / Knockout view (unchanged) ---
  const byRound = matches.reduce((acc, m) => {
    const r = m.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});

  const playoffRoundNums = Object.keys(byRound)
    .filter((r) => byRound[r].some((m) => m.phase === 'playoff'))
    .map(Number).sort((a, b) => a - b);
  const maxPlayoffRound = playoffRoundNums.length > 0 ? Math.max(...playoffRoundNums) : null;

  const leagueRoundNums = Object.keys(byRound)
    .filter((r) => !byRound[r].some((m) => m.phase === 'playoff'))
    .map(Number);
  const maxLeagueRound = leagueRoundNums.length > 0 ? Math.max(...leagueRoundNums) : 0;

  function handleGeneratePlayoffs() {
    update((t) => t);
  }

  return (
    <Card
      styles={{ body: { padding: '14px 16px' } }}
      style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Draw</Title>
        <Flex gap="small" align="center">
          <Text type="secondary" style={{ fontSize: 11 }}>{tournament.courts ?? 2} courts</Text>
          <Tag>{fixturesDone} / {matches.length} done</Tag>
          <button
            onClick={() => navigate(`/t/${tournament.id}/table`)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            <FiBarChart2 size={12} /> Stats
          </button>
        </Flex>
      </Flex>

      {matches.length === 0 && (
        <Space direction="vertical">
          <Text type="secondary">No fixtures yet. Go to Teams, set courts, then tap Generate Fixtures.</Text>
        </Space>
      )}

      {matches.length > 0 && (
        <>
          {leagueDone && !hasPlayoffs && (
            <Button type="primary" style={{ marginBottom: 12, width: '100%', borderRadius: 10 }} onClick={handleGeneratePlayoffs}>
              ⚡ Generating Playoffs...
            </Button>
          )}

          {Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map((round) => {
            const isPlayoffRound = byRound[round].some((m) => m.phase === 'playoff');
            let roundLabel;
            if (isPlayoffRound) {
              roundLabel = Number(round) === maxPlayoffRound ? '🏆 Final' : 'Semifinals';
            } else if (isKnockout) {
              roundLabel = getKnockoutRoundLabel(Number(round), maxLeagueRound);
            } else {
              roundLabel = `Round ${round}`;
            }

            return (
              <div key={round} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: isPlayoffRound ? '#b45309' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 4 }}>
                  {roundLabel}
                </Text>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {byRound[round].map((match) => (
                    <MatchCard key={match.id} match={match} teamLookup={teamLookup} onOpen={handleOpenMatch} />
                  ))}
                </Space>
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}
