import { useMemo } from 'react';
import { getHeadToHeadWinner } from '../utils/helpers';
import { getGroupLabel } from '../utils/helpers';

export function useTournamentData(tournament) {
  const teams = tournament?.teams || [];
  const matches = tournament?.matches || [];

  const teamLookup = useMemo(() => {
    const map = new Map();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const standings = useMemo(() => {
    const table = teams.map((team) => ({
      id: team.id,
      name: team.name,
      played: 0, wins: 0, losses: 0, points: 0,
      scoredFor: 0, scoredAgainst: 0, pointDiff: 0, winRate: 0, tieHint: '-',
    }));
    const indexById = new Map(table.map((e, i) => [e.id, i]));

    matches.forEach((match) => {
      if (!match.winnerId) return;
      const a = table[indexById.get(match.teamAId)];
      const b = table[indexById.get(match.teamBId)];
      if (!a || !b) return;
      a.played++; b.played++;
      a.scoredFor += match.scoreA; a.scoredAgainst += match.scoreB;
      b.scoredFor += match.scoreB; b.scoredAgainst += match.scoreA;
      if (match.winnerId === match.teamAId) { a.wins++; a.points += 2; b.losses++; }
      else { b.wins++; b.points += 2; a.losses++; }
    });

    table.forEach((e) => {
      e.pointDiff = e.scoredFor - e.scoredAgainst;
      e.winRate = e.played ? Math.round((e.wins / e.played) * 100) : 0;
    });

    table.sort((l, r) => {
      if (r.points !== l.points) return r.points - l.points;
      const h2h = getHeadToHeadWinner(l.id, r.id, matches);
      if (h2h === l.id) return -1;
      if (h2h === r.id) return 1;
      if (r.pointDiff !== l.pointDiff) return r.pointDiff - l.pointDiff;
      if (r.scoredFor !== l.scoredFor) return r.scoredFor - l.scoredFor;
      return l.name.localeCompare(r.name);
    });

    const grouped = new Map();
    table.forEach((e) => {
      if (!grouped.has(e.points)) grouped.set(e.points, []);
      grouped.get(e.points).push(e);
    });
    table.forEach((e) => {
      const same = grouped.get(e.points) || [];
      if (same.length <= 1 || e.played === 0) { e.tieHint = '-'; return; }
      const rival = same.find((x) => x.id !== e.id);
      const h2h = rival ? getHeadToHeadWinner(e.id, rival.id, matches) : null;
      e.tieHint = h2h === e.id ? 'H2H' : 'Diff';
    });

    return table;
  }, [matches, teams]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === tournament?.selectedMatchId) || null,
    [matches, tournament?.selectedMatchId]
  );

  const finalMatch = useMemo(() => {
    if (matches.length === 0) return null;
    // The real final is a playoff match that depends on two previous matches (has teamAFrom + teamBFrom)
    const playoffFinal = matches.find(m => m.phase === 'playoff' && m.teamAFrom && m.teamBFrom);
    if (playoffFinal) return playoffFinal;
    // For simple knockout (no groups/playoff phase tag): highest round match with both teams set
    const nonGroup = matches.filter(m => m.phase !== 'group' && m.teamAId && m.teamBId);
    if (nonGroup.length === 0) return null;
    return nonGroup.reduce((best, m) => m.round > (best?.round || 0) ? m : best, null);
  }, [matches]);

  // Per-group standings — only computed when format === 'groups'
  const groupStandings = useMemo(() => {
    if ((tournament?.format || 'league') !== 'groups') return null;
    const ga = tournament?.groupAssignments || {};
    const ng = tournament?.numGroups || 2;

    return Array.from({ length: ng }, (_, gi) => {
      const gTeamIds = new Set(
        Object.entries(ga).filter(([, g]) => Number(g) === gi).map(([id]) => Number(id))
      );
      const gTeams = teams.filter((t) => gTeamIds.has(t.id));
      const gMatches = matches.filter((m) => m.group === gi);

      const table = gTeams.map((team) => ({
        id: team.id, name: team.name,
        played: 0, wins: 0, losses: 0, points: 0,
        scoredFor: 0, scoredAgainst: 0, pointDiff: 0,
      }));
      const indexById = new Map(table.map((e, i) => [e.id, i]));

      gMatches.forEach((m) => {
        if (!m.winnerId) return;
        const a = table[indexById.get(m.teamAId)];
        const b = table[indexById.get(m.teamBId)];
        if (!a || !b) return;
        a.played++; b.played++;
        a.scoredFor += m.scoreA; a.scoredAgainst += m.scoreB;
        b.scoredFor += m.scoreB; b.scoredAgainst += m.scoreA;
        if (m.winnerId === m.teamAId) { a.wins++; a.points += 2; b.losses++; }
        else { b.wins++; b.points += 2; a.losses++; }
      });
      table.forEach((e) => { e.pointDiff = e.scoredFor - e.scoredAgainst; });
      table.sort((l, r) => {
        if (r.points !== l.points) return r.points - l.points;
        const h2h = getHeadToHeadWinner(l.id, r.id, gMatches);
        if (h2h === l.id) return -1;
        if (h2h === r.id) return 1;
        return (r.pointDiff - l.pointDiff) || (r.scoredFor - l.scoredFor);
      });

      return { groupIdx: gi, label: getGroupLabel(gi), teams: table };
    });
  }, [matches, teams, tournament?.groupAssignments, tournament?.numGroups, tournament?.format]);

  return { teams, matches, teamLookup, standings, groupStandings, selectedMatch, finalMatch };
}
