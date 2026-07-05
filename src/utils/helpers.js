import { buildSchedule, buildKnockout } from './schedule';

export function getGroupLabel(idx) {
  return `Group ${String.fromCharCode(65 + idx)}`; // A, B, C...
}

export function getHeadToHeadWinner(teamAId, teamBId, matches) {
  const direct = matches.find((m) => {
    const p1 = m.teamAId === teamAId && m.teamBId === teamBId;
    const p2 = m.teamAId === teamBId && m.teamBId === teamAId;
    return (p1 || p2) && m.winnerId !== null;
  });
  return direct ? direct.winnerId : null;
}

export function getNextTeamId(teams) {
  return teams.reduce((max, t) => Math.max(max, t.id), 0) + 1;
}

export function getNextTournamentId(tournaments) {
  return tournaments.reduce((max, t) => Math.max(max, t.id), 0) + 1;
}

/**
 * Derives tournament status from data — never stored, always computed.
 *   'upcoming'  → before the first match starts (fixtures may already exist)
 *   'ongoing'   → once any match has started and tournament is not finished
 *   'completed' → every match has a winner
 *   'archived'  → moved to history
 */
export function getTournamentStatus(tournament) {
  if (tournament?.archived) return 'archived';

  const { matches = [] } = tournament || {};
  if (matches.length === 0) return 'upcoming';

  const hasStarted = matches.some(
    (m) => m.winnerId !== null || Number(m.scoreA || 0) > 0 || Number(m.scoreB || 0) > 0
  );

  if (!hasStarted) return 'upcoming';
  if (matches.every((m) => m.winnerId !== null)) return 'completed';
  return 'ongoing';
}

export function createTournament(id, name, teams = [], courts = 2, format = 'league', numGroups = 2, groupFormat = 'league') {
  return {
    id,
    name,
    teams,
    matches: format === 'knockout' ? buildKnockout(teams, courts) : buildSchedule(teams, courts),
    selectedMatchId: null,
    playerPool: [],
    courts,
    format,
    updatedAt: new Date().toISOString(),
    ...(format === 'groups' ? { numGroups, groupFormat } : {}),
  };
}
