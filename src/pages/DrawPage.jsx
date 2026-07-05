import { Button, Card, Space, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import { getKnockoutRoundLabel } from '../utils/schedule';
import { getGroupLabel } from '../utils/helpers';
import { FiAward } from 'react-icons/fi';

const { Text, Title } = Typography;

function MatchCard({ match, teamLookup, onOpen }) {
  const teamA = teamLookup.get(match.teamAId);
  const teamB = teamLookup.get(match.teamBId);
  const nameA = teamA?.name || (match.teamAFrom ? `Winner M${match.teamAFrom}` : 'TBD');
  const nameB = teamB?.name || (match.teamBFrom ? `Winner M${match.teamBFrom}` : 'TBD');
  const isTbd = !match.teamAId || !match.teamBId;
  const isDone = match.winnerId !== null;
  const isLive = !isDone && (match.scoreA > 0 || match.scoreB > 0);
  const winnerA = isDone && match.winnerId === match.teamAId;
  const winnerB = isDone && match.winnerId === match.teamBId;

  const bgColor = isTbd ? '#f9fafb' : 'linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))';
  const rowBorder = '1px solid #e2e8f0';

  const colorA = isTbd ? '#9ca3af' : winnerA ? '#15803d' : isDone ? '#94a3b8' : '#1e293b';
  const colorB = isTbd ? '#9ca3af' : winnerB ? '#15803d' : isDone ? '#94a3b8' : '#1e293b';

  return (
    <div
      onClick={() => !isTbd && onOpen(match.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        borderRadius: 14,
        border: rowBorder,
        background: bgColor,
        opacity: isTbd ? 0.55 : 1,
        cursor: isTbd ? 'default' : 'pointer',
        boxShadow: '0 4px 14px rgba(15,23,42,0.07)',
      }}
    >
      {/* Team A */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {winnerA && <FiAward size={14} color="#16a34a" style={{ flexShrink: 0 }} />}
        <Text style={{
          fontSize: 14,
          fontWeight: winnerA ? 800 : 600,
          color: colorA,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '20px',
        }}>{nameA}</Text>
      </div>

      {/* Score */}
      <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'center', padding: '0 8px' }}>
        {(isDone || isLive) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 17, fontWeight: winnerA ? 800 : 600, color: winnerA ? '#15803d' : '#475569', lineHeight: 1 }}>{match.scoreA}</span>
            <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>–</span>
            <span style={{ fontSize: 17, fontWeight: winnerB ? 800 : 600, color: winnerB ? '#15803d' : '#475569', lineHeight: 1 }}>{match.scoreB}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>vs</span>
        )}
      </div>

      {/* Team B */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        <Text style={{
          fontSize: 14,
          fontWeight: winnerB ? 800 : 600,
          color: colorB,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'right',
          lineHeight: '20px',
        }}>{nameB}</Text>
        {winnerB && <FiAward size={14} color="#16a34a" style={{ flexShrink: 0 }} />}
      </div>
    </div>
  );
}

export default function DrawPage() {
  const { tournament, matches, teamLookup, handleOpenMatch, update } = useTournament();
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
    const groupMatchesByGroup = Array.from({ length: numGroups }, (_, gi) =>
      matches.filter((m) => m.group === gi)
    );
    const playoffRoundNums = [...new Set(playoffMatches.map((m) => m.round))].sort((a, b) => a - b);
    const maxPlayoffRound = playoffRoundNums.length ? Math.max(...playoffRoundNums) : null;
    const byPlayoffRound = playoffMatches.reduce((acc, m) => { (acc[m.round] = acc[m.round] || []).push(m); return acc; }, {});

    return (
      <Card styles={{ body: { padding: '14px 16px' } }} style={{ border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(15,23,42,0.08)', borderRadius: 18, background: 'linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)' }}>
       

        {matches.length === 0 && <Text type="secondary">No fixtures yet. Go to Teams and tap Generate Fixtures.</Text>}

        {/* Group sections */}
        {groupMatchesByGroup.map((gMatches, gi) => {
          const byRound = gMatches.reduce((acc, m) => { (acc[m.round] = acc[m.round] || []).push(m); return acc; }, {});
          const doneCnt = gMatches.filter((m) => m.winnerId).length;
          return (
            <div key={gi} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{getGroupLabel(gi)}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{doneCnt}/{gMatches.length} done</span>
              </div>
              {Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map((r) => (
                <div key={r} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }}>Round {r}</Text>
                  <Space orientation="vertical" style={{ width: '100%' }}>
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
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 4 }}>
              {r === maxPlayoffRound ? 'Final' : 'Semifinals'}
            </Text>
            <Space orientation="vertical" style={{ width: '100%' }}>
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
      style={{ border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(15,23,42,0.08)', borderRadius: 18, background: 'linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)' }}
    >
      <Flex align="center" style={{ marginBottom: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Draw</Title>
      </Flex>

      {matches.length === 0 && (
        <Space orientation="vertical">
          <Text type="secondary">No fixtures yet. Go to Teams, set courts, then tap Generate Fixtures.</Text>
        </Space>
      )}

      {matches.length > 0 && (
        <>
          {leagueDone && !hasPlayoffs && (
            <Button type="primary" style={{ marginBottom: 12, width: '100%', borderRadius: 10 }} onClick={handleGeneratePlayoffs}>
              Generating Playoffs...
            </Button>
          )}

          {Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map((round) => {
            const isPlayoffRound = byRound[round].some((m) => m.phase === 'playoff');
            let roundLabel;
            if (isPlayoffRound) {
              roundLabel = Number(round) === maxPlayoffRound ? 'Final' : 'Semifinals';
            } else if (isKnockout) {
              roundLabel = getKnockoutRoundLabel(Number(round), maxLeagueRound);
            } else {
              roundLabel = `Round ${round}`;
            }

            return (
              <div key={round} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: isPlayoffRound ? '#334155' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 4 }}>
                  {roundLabel}
                </Text>
                <Space orientation="vertical" style={{ width: '100%' }}>
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
