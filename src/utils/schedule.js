export function buildSchedule(teams, numCourts = 2) {
  if (teams.length < 2) return [];
  const ids = teams.map((t) => t.id);
  if (ids.length % 2 !== 0) ids.push(null);
  const n = ids.length;
  const list = [...ids];
  const fixtures = [];
  let matchId = 1;

  for (let round = 0; round < n - 1; round++) {
    let courtIdx = 0;
    for (let i = 0; i < n / 2; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home !== null && away !== null) {
        fixtures.push({
          id: matchId++,
          teamAId: home,
          teamBId: away,
          scoreA: 0, scoreB: 0,
          winnerId: null,
          servingTeamId: home,
          round: round + 1,
          court: (courtIdx % numCourts) + 1,
        });
        courtIdx++;
      }
    }
    list.splice(1, 0, list.pop());
  }
  return fixtures;
}

export function buildKnockout(teams, numCourts = 2) {
  if (teams.length < 2) return [];

  let size = 1;
  while (size < teams.length) size *= 2;
  // Distribute BYEs so top-seeded teams (earliest in list) get the byes,
  // not the last team. Each bye pair is (team, null) → team auto-advances.
  const numByes = size - teams.length;
  const padded = [];
  for (let i = 0; i < numByes; i++) padded.push(teams[i].id, null);
  for (let i = numByes; i < teams.length; i++) padded.push(teams[i].id);

  const fixtures = [];
  let matchId = 1;
  let slots = padded.map((id) => ({ teamId: id, fromMatchId: null }));
  let round = 1;

  while (slots.length > 1) {
    const nextSlots = [];
    let courtIdx = 0;
    for (let i = 0; i < slots.length; i += 2) {
      const sA = slots[i];
      const sB = slots[i + 1];

      if (sA.teamId === null && sA.fromMatchId === null && sB.teamId === null && sB.fromMatchId === null) {
        nextSlots.push({ teamId: null, fromMatchId: null });
        continue;
      }
      if (sA.teamId === null && sA.fromMatchId === null) {
        nextSlots.push({ teamId: sB.teamId, fromMatchId: sB.fromMatchId });
        continue;
      }
      if (sB.teamId === null && sB.fromMatchId === null) {
        nextSlots.push({ teamId: sA.teamId, fromMatchId: sA.fromMatchId });
        continue;
      }

      const mid = matchId++;
      fixtures.push({
        id: mid,
        teamAId: sA.teamId,
        teamBId: sB.teamId,
        scoreA: 0, scoreB: 0,
        winnerId: null,
        servingTeamId: sA.teamId,
        round,
        court: (courtIdx % numCourts) + 1,
        teamAFrom: sA.fromMatchId,
        teamBFrom: sB.fromMatchId,
      });
      nextSlots.push({ teamId: null, fromMatchId: mid });
      courtIdx++;
    }
    slots = nextSlots;
    round++;
  }
  return fixtures;
}

export function getKnockoutRoundLabel(round, totalRounds) {
  const f = totalRounds - round;
  if (f === 0) return '🏆 Final';
  if (f === 1) return 'Semifinals';
  return `Round ${round}`;
}

// Build group-stage schedules: splits teams into numGroups round-robin groups.
// Each match is tagged with { group: groupIndex, phase: 'group' }.
// Returns { matches, groupAssignments } where groupAssignments = { teamId: groupIndex }.
export function buildGroups(teams, numGroups = 2, numCourts = 2, groupFormat = 'league') {
  if (teams.length < 2) return { matches: [], groupAssignments: {} };

  const clampedGroups = Math.max(2, Math.min(numGroups, teams.length));
  const groupAssignments = {};
  const groups = Array.from({ length: clampedGroups }, () => []);

  // Round-robin distribution so groups are as equal as possible
  teams.forEach((t, i) => {
    const g = i % clampedGroups;
    groups[g].push(t);
    groupAssignments[t.id] = g;
  });

  let matchId = 1;
  let globalCourtIdx = 0;
  const matches = [];

  groups.forEach((groupTeams, groupIdx) => {
    if (groupTeams.length < 2) return;
    const raw = groupFormat === 'knockout'
      ? buildKnockout(groupTeams, numCourts)
      : buildSchedule(groupTeams, numCourts);
    raw.forEach((m) => {
      matches.push({
        ...m,
        id: matchId++,
        court: (globalCourtIdx++ % numCourts) + 1,
        group: groupIdx,
        phase: 'group',
      });
    });
  });

  return { matches, groupAssignments };
}
