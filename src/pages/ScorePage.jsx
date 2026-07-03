import { Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTournament } from './TournamentLayout';
import ShuttleIcon from '../components/ShuttleIcon';
import WinnerCards from '../components/WinnerCards';

const { Text, Title } = Typography;

export default function ScorePage() {
  const {
    tournament, tournamentId,
    teamLookup, selectedMatch, finalMatch,
    updateMatchScore, resetMatch, handleSetServe,
    handleWinnerPhoto, handleRunnerUpPhoto,
    handleShareChampion, handleShareRunnerUp,
  } = useTournament();
  const navigate = useNavigate();

  const servingTeamId = selectedMatch ? (selectedMatch.servingTeamId || selectedMatch.teamAId) : null;
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
        <Title level={4} style={{ marginTop: 0 }}>Match Scoring</Title>

        {!selectedMatch && (
          <Space direction="vertical">
            <Text type="secondary">Choose a fixture first to enter score.</Text>
            <Button onClick={() => navigate(`/t/${tournamentId}/draw`)}>Go to Draw</Button>
          </Space>
        )}

        {selectedMatch && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Flex justify="space-between" align="center" style={{ padding: '0 4px' }}>
              <Text strong>{teamLookup.get(selectedMatch.teamAId)?.name}</Text>
              <Text type="secondary">vs</Text>
              <Text strong>{teamLookup.get(selectedMatch.teamBId)?.name}</Text>
            </Flex>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className={`counter-btn${isServingA ? ' is-serving' : ''}`}
                type="button"
                disabled={selectedMatch.winnerId !== null}
                onClick={() => updateMatchScore(selectedMatch.id, selectedMatch.scoreA + 1, selectedMatch.scoreB)}
                style={{ flex: 1 }}
              >
                <span className="serve-chip" style={{ visibility: isServingA ? 'visible' : 'hidden' }}>
                  <ShuttleIcon size={14} /> Serving
                </span>
                <span className="counter-name">{teamLookup.get(selectedMatch.teamAId)?.name}</span>
                <span className="counter-score">{selectedMatch.scoreA}</span>
              </button>
              <button
                className={`counter-btn${isServingB ? ' is-serving' : ''}`}
                type="button"
                disabled={selectedMatch.winnerId !== null}
                onClick={() => updateMatchScore(selectedMatch.id, selectedMatch.scoreA, selectedMatch.scoreB + 1)}
                style={{ flex: 1 }}
              >
                <span className="serve-chip" style={{ visibility: isServingB ? 'visible' : 'hidden' }}>
                  <ShuttleIcon size={14} /> Serving
                </span>
                <span className="counter-name">{teamLookup.get(selectedMatch.teamBId)?.name}</span>
                <span className="counter-score">{selectedMatch.scoreB}</span>
              </button>
            </div>

            {!selectedMatch.winnerId && selectedMatch.scoreA === 0 && selectedMatch.scoreB === 0 && (
              <Flex align="center" gap="small" wrap="wrap">
                <Text type="secondary" style={{ fontSize: 12 }}>First serve:</Text>
                <Button size="small" type={isServingA ? 'primary' : 'default'} onClick={() => handleSetServe(selectedMatch.id, selectedMatch.teamAId)}>
                  {teamLookup.get(selectedMatch.teamAId)?.name}
                </Button>
                <Button size="small" type={isServingB ? 'primary' : 'default'} onClick={() => handleSetServe(selectedMatch.id, selectedMatch.teamBId)}>
                  {teamLookup.get(selectedMatch.teamBId)?.name}
                </Button>
              </Flex>
            )}

            {!selectedMatch.winnerId && (
              <Flex align="center" gap="small" wrap="wrap" style={{ padding: '2px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>BYE / Walkover:</Text>
                <Button
                  size="small"
                  danger
                  onClick={() => updateMatchScore(selectedMatch.id, 21, 0)}
                >
                  {teamLookup.get(selectedMatch.teamAId)?.name} wins
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => updateMatchScore(selectedMatch.id, 0, 21)}
                >
                  {teamLookup.get(selectedMatch.teamBId)?.name} wins
                </Button>
              </Flex>
            )}

            <Flex justify="space-between" align="center" wrap="wrap" gap="small">
              <Button onClick={() => resetMatch(selectedMatch.id)}>Reset</Button>
              <Text>
                {selectedMatch.winnerId
                  ? `Winner: ${teamLookup.get(selectedMatch.winnerId)?.name}`
                  : 'In progress'}
              </Text>
              {selectedMatch.scoreA === 20 && selectedMatch.scoreB === 20 && (
                <Tag color="green">Golden Point: next point wins</Tag>
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
