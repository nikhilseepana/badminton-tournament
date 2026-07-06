import { Card, Input, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import WinnerCards from '../components/WinnerCards';
import BracketChart from '../components/BracketChart';

const { Text, Title } = Typography;

export default function TablePage() {
  const {
    tournament, matches, teamLookup, standings, groupStandings, finalMatch,
    handleOpenMatch, update,
    handleWinnerPhoto, handleRunnerUpPhoto,
    handleShareChampion, handleShareRunnerUp,
  } = useTournament();

  const format = tournament.format || 'league';
  const isKnockout = format === 'knockout';
  const isGroups = format === 'groups';

  const champion = finalMatch?.winnerId ? teamLookup.get(finalMatch.winnerId) : null;
  const runnerUp = finalMatch?.winnerId
    ? teamLookup.get(finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId)
    : null;

  const playoffMatches = matches.filter((m) => m.phase === 'playoff');
  const totalPlayed = matches.filter((m) => m.winnerId !== null).length;

  return (
    <>
      <WinnerCards
        tournament={tournament}
        champion={champion}
        runnerUp={runnerUp}
        onWinnerPhoto={handleWinnerPhoto}
        onRunnerUpPhoto={handleRunnerUpPhoto}
        onShareChampion={handleShareChampion}
        onShareRunnerUp={handleShareRunnerUp}
      />

      {champion && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>💰 Prize</span>
          <Input
            placeholder="e.g. ₹5000"
            size="small"
            value={tournament.prizeMoney || ''}
            onChange={(e) => update((t) => ({ ...t, prizeMoney: e.target.value }))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>🥈 Runner-up</span>
          <Input
            placeholder="e.g. ₹2000"
            size="small"
            value={tournament.runnerUpPrize || ''}
            onChange={(e) => update((t) => ({ ...t, runnerUpPrize: e.target.value }))}
            style={{ flex: 1 }}
          />
        </div>
      )}

      <Card
        styles={{ body: { padding: '14px 16px' } }}
        style={{ border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(15,23,42,0.08)', borderRadius: 18, background: 'linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))' }}
      >
      


        {/* Knockout bracket */}
        {isKnockout && matches.length > 0 && (
          <BracketChart matches={matches} teamLookup={teamLookup} onOpenMatch={handleOpenMatch} accentColor="#64748b" />
        )}

        {/* Groups: per-group standings tables */}
        {isGroups && groupStandings && (
          <>
            {groupStandings.map(({ groupIdx, label, teams: gTeams }) => (
              <div key={groupIdx} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>{label}</div>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px 40px', gap: 4, padding: '4px 10px', marginBottom: 4 }}>
                  {['#','Team','MP','W','L','Pts'].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: h === 'Team' ? 'left' : 'center' }}>{h}</span>
                  ))}
                </div>
                {gTeams.map((e, i) => (
                  <div key={e.id} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px 40px',
                    gap: 4, alignItems: 'center', padding: '9px 10px',
                    borderRadius: 12, marginBottom: 4,
                    background: i === 0 ? 'linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))' : 'transparent',
                    border: i === 0 ? '1px solid #e2e8f0' : '1px solid transparent',
                    boxShadow: i === 0 ? '0 2px 8px rgba(15,23,42,0.06)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#334155' : '#94a3b8', textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#0f172a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                    <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>{e.played}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: e.wins > 0 ? '#15803d' : '#94a3b8', textAlign: 'center' }}>{e.wins}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: e.losses > 0 ? '#dc2626' : '#94a3b8', textAlign: 'center' }}>{e.losses}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: e.points > 0 ? '#334155' : '#94a3b8', textAlign: 'center' }}>{e.points}</span>
                  </div>
                ))}
              </div>
            ))}
            {playoffMatches.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Playoffs</div>
                <BracketChart matches={playoffMatches} teamLookup={teamLookup} onOpenMatch={handleOpenMatch} accentColor="#334155" />
              </div>
            )}
          </>
        )}

        {/* League standings */}
        {!isKnockout && !isGroups && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px 40px', gap: 4, padding: '4px 10px', marginBottom: 4 }}>
              {['#','Team','MP','W','L','Pts'].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: h === 'Team' ? 'left' : 'center' }}>{h}</span>
              ))}
            </div>
            {standings.map((e, i) => (
              <div key={e.id} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 36px 40px',
                gap: 4, alignItems: 'center', padding: '9px 10px',
                borderRadius: 12, marginBottom: 4,
                background: i === 0 ? 'linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))' : 'transparent',
                border: i === 0 ? '1px solid #e2e8f0' : '1px solid transparent',
                boxShadow: i === 0 ? '0 2px 8px rgba(15,23,42,0.06)' : 'none',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#334155' : '#94a3b8', textAlign: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#0f172a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>{e.played}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: e.wins > 0 ? '#15803d' : '#94a3b8', textAlign: 'center' }}>{e.wins}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: e.losses > 0 ? '#dc2626' : '#94a3b8', textAlign: 'center' }}>{e.losses}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: e.points > 0 ? '#334155' : '#94a3b8', textAlign: 'center' }}>{e.points}</span>
              </div>
            ))}
          </>
        )}

        {/* League playoff bracket */}
        {!isKnockout && !isGroups && playoffMatches.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: 8 }}>
              Playoffs
            </Text>
            <BracketChart
              matches={playoffMatches}
              teamLookup={teamLookup}
              onOpenMatch={handleOpenMatch}
              accentColor="#334155"
            />
          </div>
        )}
      </Card>
    </>
  );
}
