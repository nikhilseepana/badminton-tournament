import { buildSchedule, buildKnockout } from './schedule';

export function getGroupLabel(idx) {
  return `Group ${String.fromCharCode(65 + idx)}`; // A, B, C...
}

export const GH_DATA = 'https://api.github.com/repos/nikhilseepana/badminton-tournament/contents/data';

export function b64enc(str) {
  let bin = '';
  const b = new TextEncoder().encode(str);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin);
}

export function b64dec(s) {
  const raw = atob(s.replace(/\n/g, ''));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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
 *   'setup'     → no fixtures generated yet, teams can still be edited
 *   'ongoing'   → fixtures exist and at least one score/result recorded
 *   'completed' → every match has a winner
 */
export function getTournamentStatus(tournament) {
  const { matches = [] } = tournament;
  if (matches.length === 0) return 'setup';
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
    ...(format === 'groups' ? { numGroups, groupFormat } : {}),
  };
}
