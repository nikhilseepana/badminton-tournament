import { Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useTournament } from './TournamentLayout';
import WinnerCards from '../components/WinnerCards';
import ShuttleIcon from '../components/ShuttleIcon';

const { Text, Title } = Typography;

export default function ScorePage() {
  const {
    tournament, tournamentId,
    teamLookup, selectedMatch, finalMatch,
    updateMatchScore, resetMatch,
    handleWinnerPhoto, handleRunnerUpPhoto,
    handleShareChampion, handleShareRunnerUp,
  } = useTournament();
  const navigate = useNavigate();

  const servingTeamId = selectedMatch ? selectedMatch.servingTeamId : null;
  const isServingA = selectedMatch && servingTeamId === selectedMatch.teamAId;
  const isServingB = selectedMatch && servingTeamId === selectedMatch.teamBId;

  const isFinalDone = finalMatch?.winnerId && selectedMatch?.id === finalMatch?.id;
  const champion = isFinalDone ? teamLookup.get(finalMatch.winnerId) : null;
  const runnerUp = isFinalDone
    ? teamLookup.get(finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId)
    : null;

  return (
    <>
      <Card
        styles={{ body: { padding: '14px 16px' } }}
        style={{ border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 20px rgba(37,99,235,0.08)', borderRadius: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => navigate(`/t/${tournamentId}/draw`)}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <FiArrowLeft size={20} />
          </button>
          <Title level={4} style={{ margin: 0 }}>Match Scoring</Title>
        </div>

        {!selectedMatch && (
          <Space direction="vertical">
            <Text type="secondary">Choose a fixture first to enter score.</Text>
            <Button onClick={() => navigate(`/t/${tournamentId}/draw`)}>Go to Draw</Button>
          </Space>
        )}

        {selectedMatch && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className={`counter-btn${isServingA ? ' is-serving' : ''}${selectedMatch.winnerId === selectedMatch.teamAId ? ' is-winner' : ''}${selectedMatch.winnerId && selectedMatch.winnerId !== selectedMatch.teamAId ? ' is-loser' : ''}`}
                type="button"
                disabled={selectedMatch.winnerId !== null}
                onClick={() => updateMatchScore(selectedMatch.id, selectedMatch.scoreA + 1, selectedMatch.scoreB)}
                style={{ flex: 1 }}
              >
                <span className={`serve-chip${isServingA ? ' serve-active' : ' serve-idle'}`}><ShuttleIcon size={15} /></span>
                {selectedMatch.winnerId === selectedMatch.teamAId && (
                  <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#ca8a04,#a16207)', color: '#fef08a', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 999, letterSpacing: 0.5, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(161,98,7,0.4)' }}>🏆 WINNER</span>
                )}
                <span className="counter-name">{teamLookup.get(selectedMatch.teamAId)?.name}</span>
                <span className="counter-score">{selectedMatch.scoreA}</span>
              </button>
              <button
                className={`counter-btn${isServingB ? ' is-serving' : ''}${selectedMatch.winnerId === selectedMatch.teamBId ? ' is-winner' : ''}${selectedMatch.winnerId && selectedMatch.winnerId !== selectedMatch.teamBId ? ' is-loser' : ''}`}
                type="button"
                disabled={selectedMatch.winnerId !== null}
                onClick={() => updateMatchScore(selectedMatch.id, selectedMatch.scoreA, selectedMatch.scoreB + 1)}
                style={{ flex: 1 }}
              >
                <span className={`serve-chip${isServingB ? ' serve-active' : ' serve-idle'}`}><ShuttleIcon size={15} /></span>
                {selectedMatch.winnerId === selectedMatch.teamBId && (
                  <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#ca8a04,#a16207)', color: '#fef08a', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 999, letterSpacing: 0.5, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(161,98,7,0.4)' }}>🏆 WINNER</span>
                )}
                <span className="counter-name">{teamLookup.get(selectedMatch.teamBId)?.name}</span>
                <span className="counter-score">{selectedMatch.scoreB}</span>
              </button>
            </div>

            <Flex justify="space-between" align="center" wrap="wrap" gap="small">
              <Button onClick={() => resetMatch(selectedMatch.id)}>Reset</Button>
              {selectedMatch.scoreA === 20 && selectedMatch.scoreB === 20 && (
                <Tag color="geekblue">Golden Point: next point wins</Tag>
              )}
            </Flex>
          </Space>
        )}
      </Card>

      {/* Show winner/runner-up cards when the final match is completed */}
      {isFinalDone && (
        <WinnerCards
          tournament={tournament}
          champion={champion}
          runnerUp={runnerUp}
          onWinnerPhoto={handleWinnerPhoto}
          onRunnerUpPhoto={handleRunnerUpPhoto}
          onShareChampion={handleShareChampion}
          onShareRunnerUp={handleShareRunnerUp}
        />
      )}
    </>
  );
}
