import { useNavigate } from 'react-router-dom';
import { Card, Flex, Table, Tag, Typography } from 'antd';
import { useTournament } from './TournamentLayout';
import WinnerCards from '../components/WinnerCards';
import BracketChart from '../components/BracketChart';
import { FiCalendar } from 'react-icons/fi';

const { Text, Title } = Typography;

export default function TablePage() {
  const {
    tournament, matches, teamLookup, standings, groupStandings, finalMatch,
    handleOpenMatch,
    handleWinnerPhoto, handleRunnerUpPhoto,
    handleShareChampion, handleShareRunnerUp,
  } = useTournament();
  const navigate = useNavigate();

  const format = tournament.format || 'league';
  const isKnockout = format === 'knockout';
  const isGroups = format === 'groups';

  const champion = finalMatch?.winnerId ? teamLookup.get(finalMatch.winnerId) : null;
  const runnerUp = finalMatch?.winnerId
    ? teamLookup.get(finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId)
    : null;

  const playoffMatches = matches.filter((m) => m.phase === 'playoff');

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

      <Card
        styles={{ body: { padding: '14px 16px' } }}
        style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}
      >
        <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
          <Title level={4} style={{ margin: 0 }}>{isKnockout ? 'Bracket' : 'Standings'}</Title>
          <button
            onClick={() => navigate(`/t/${tournament.id}/draw`)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >
            <FiCalendar size={12} /> Draw
          </button>
        </Flex>

        {/* Knockout bracket */}
        {isKnockout && matches.length > 0 && (
          <BracketChart matches={matches} teamLookup={teamLookup} onOpenMatch={handleOpenMatch} accentColor="#64748b" />
        )}

        {/* Groups: per-group standings tables */}
        {isGroups && groupStandings && (
          <>
            {groupStandings.map(({ groupIdx, label, teams: gTeams }) => (
              <div key={groupIdx} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#3e4f7a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{label}</div>
                <Table
                  dataSource={gTeams.map((e, i) => ({ ...e, key: e.id, rank: i + 1 }))}
                  columns={[
                    { title: '#', dataIndex: 'rank', width: 40 },
                    { title: 'Team', dataIndex: 'name' },
                    { title: 'P', dataIndex: 'played', width: 40 },
                    { title: 'W', dataIndex: 'wins', width: 40 },
                    { title: 'L', dataIndex: 'losses', width: 40 },
                    { title: 'Pts', dataIndex: 'points', width: 50 },
                  ]}
                  pagination={false} size="small" scroll={{ x: 'max-content' }}
                />
              </div>
            ))}
            {playoffMatches.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3e4f7a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Playoffs</div>
                <BracketChart matches={playoffMatches} teamLookup={teamLookup} onOpenMatch={handleOpenMatch} accentColor="#3e4f7a" />
              </div>
            )}
          </>
        )}

        {/* League standings table */}
        {!isKnockout && !isGroups && (
          <Table
            dataSource={standings.map((entry, idx) => ({ ...entry, key: entry.id, rank: idx + 1 }))}
            columns={[
              { title: 'Rank', dataIndex: 'rank', width: 50 },
              { title: 'Team', dataIndex: 'name' },
              { title: 'P', dataIndex: 'played', width: 45 },
              { title: 'W', dataIndex: 'wins', width: 45 },
              { title: 'L', dataIndex: 'losses', width: 45 },
              { title: 'Pts', dataIndex: 'points', width: 55 },
              { title: 'WR%', dataIndex: 'winRate', width: 60 },
              { title: 'TB', dataIndex: 'tieHint', width: 60 },
            ]}
            pagination={false} size="small" scroll={{ x: 'max-content' }}
          />
        )}

        {/* League playoff bracket */}
        {!isKnockout && !isGroups && playoffMatches.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#3e4f7a', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 8 }}>
              Playoffs
            </Text>
            <BracketChart
              matches={playoffMatches}
              teamLookup={teamLookup}
              onOpenMatch={handleOpenMatch}
              accentColor="#3e4f7a"
            />
          </div>
        )}
      </Card>
    </>
  );
}
