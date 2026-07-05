import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from './supabaseClient';

const TABLE = 'tournaments';
const USERS_TABLE = 'users';
const TEAMS_TABLE = 'teams';
const TEAM_USERS_TABLE = 'team_users';
const MATCHES_TABLE = 'matches';
const SCORES_TABLE = 'scores';
const REQUESTS_TABLE = 'team_requests';
const GROUP_ASSIGNMENTS_TABLE = 'group_assignments';

export { isSupabaseConfigured };

function missingConfigError() {
  return supabaseConfigError || 'Supabase env vars missing';
}

function normalizeSupabaseError(errorMessage) {
  if (!errorMessage) return 'Unknown Supabase error';

  const msg = String(errorMessage);
  if (
    msg.includes("Could not find the table 'public.tournaments' in the schema cache") ||
    msg.includes('relation "public.tournaments" does not exist') ||
    msg.includes('relation "public.users" does not exist') ||
    msg.includes('relation "public.teams" does not exist') ||
    msg.includes('relation "public.team_users" does not exist') ||
    msg.includes('relation "public.matches" does not exist') ||
    msg.includes('relation "public.scores" does not exist') ||
    msg.includes('relation "public.team_requests" does not exist') ||
    msg.includes('relation "public.group_assignments" does not exist')
  ) {
    return 'Supabase core tables are missing. Run the SQL in supabase/gametribe_tournaments.sql, then retry.';
  }

  return msg;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function sortByNumberKey(list, key) {
  return [...ensureArray(list)].sort((a, b) => Number(a[key]) - Number(b[key]));
}

function groupByTournamentId(rows) {
  const map = new Map();
  ensureArray(rows).forEach((row) => {
    const tid = Number(row.tournament_id);
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid).push(row);
  });
  return map;
}

function groupByTournamentTeam(rows) {
  const map = new Map();
  ensureArray(rows).forEach((row) => {
    const key = `${Number(row.tournament_id)}:${Number(row.team_id)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function fromRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    format: row.format || 'league',
    numGroups: row.num_groups ?? 2,
    groupFormat: row.group_format || 'league',
    courts: row.courts ?? 2,
    archived: Boolean(row.archived),
    winnerPhoto: row.winner_photo || null,
    runnerUpPhoto: row.runner_up_photo || null,
    selectedMatchId: row.selected_match_id ?? null,
    parentFormat: row.parent_format || null,
    updatedAt: row.updated_at || null,
  };
}

function toRow(tournament) {
  const nowIso = new Date().toISOString();
  return {
    id: Number(tournament.id),
    name: tournament.name || `Tournament ${tournament.id}`,
    format: tournament.format || 'league',
    num_groups: tournament.numGroups ?? 2,
    group_format: tournament.groupFormat || 'league',
    courts: tournament.courts ?? 2,
    archived: Boolean(tournament.archived),
    winner_photo: tournament.winnerPhoto || null,
    runner_up_photo: tournament.runnerUpPhoto || null,
    selected_match_id: tournament.selectedMatchId ?? null,
    parent_format: tournament.parentFormat || null,
    updated_at: tournament.updatedAt || nowIso,
  };
}

export async function loadRemoteState() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: missingConfigError() };
  }

  const [tournamentsRes, usersRes, teamsRes, teamUsersRes, matchesRes, scoresRes, requestsRes, groupsRes] = await Promise.all([
    supabase.from(TABLE).select('*').order('id', { ascending: true }),
    supabase.from(USERS_TABLE).select('*'),
    supabase.from(TEAMS_TABLE).select('*'),
    supabase.from(TEAM_USERS_TABLE).select('*'),
    supabase.from(MATCHES_TABLE).select('*'),
    supabase.from(SCORES_TABLE).select('*'),
    supabase.from(REQUESTS_TABLE).select('*'),
    supabase.from(GROUP_ASSIGNMENTS_TABLE).select('*'),
  ]);

  const firstError = [
    tournamentsRes.error,
    usersRes.error,
    teamsRes.error,
    teamUsersRes.error,
    matchesRes.error,
    scoresRes.error,
    requestsRes.error,
    groupsRes.error,
  ].find(Boolean);

  if (firstError) return { ok: false, error: normalizeSupabaseError(firstError.message) };

  const usersById = new Map(
    ensureArray(usersRes.data).map((u) => [Number(u.id), u.display_name])
  );
  const teamMap = groupByTournamentId(teamsRes.data);
  const teamUsersMap = groupByTournamentTeam(teamUsersRes.data);
  const matchMap = groupByTournamentId(matchesRes.data);
  const scoreMap = groupByTournamentId(scoresRes.data);
  const requestMap = groupByTournamentId(requestsRes.data);
  const groupMap = groupByTournamentId(groupsRes.data);

  const tournaments = ensureArray(tournamentsRes.data).map((row) => {
    const base = fromRow(row);
    const tid = base.id;

    const teams = sortByNumberKey(teamMap.get(tid) || [], 'team_id').map((teamRow) => {
      const key = `${tid}:${Number(teamRow.team_id)}`;
      const linkedUsers = sortByNumberKey(teamUsersMap.get(key) || [], 'slot_no')
        .map((link) => usersById.get(Number(link.user_id)))
        .filter(Boolean);

      return {
        id: Number(teamRow.team_id),
        name: teamRow.team_name,
        players: linkedUsers.length > 0 ? linkedUsers : ensureArray(teamRow.players),
      };
    });

    const scoreRows = scoreMap.get(tid) || [];
    const pointsByKey = new Map(
      scoreRows.map((s) => [`${Number(s.match_id)}:${Number(s.team_id)}`, Number(s.points || 0)])
    );

    const matches = sortByNumberKey(matchMap.get(tid) || [], 'match_id').map((m) => {
      const teamAId = m.team1_id == null ? null : Number(m.team1_id);
      const teamBId = m.team2_id == null ? null : Number(m.team2_id);
      return {
        id: Number(m.match_id),
        teamAId,
        teamBId,
        scoreA: teamAId == null ? 0 : Number(pointsByKey.get(`${Number(m.match_id)}:${teamAId}`) || 0),
        scoreB: teamBId == null ? 0 : Number(pointsByKey.get(`${Number(m.match_id)}:${teamBId}`) || 0),
        winnerId: m.winner_team_id == null ? null : Number(m.winner_team_id),
        servingTeamId: m.serving_team_id == null ? null : Number(m.serving_team_id),
        round: Number(m.round || 1),
        court: Number(m.court || 1),
        phase: m.phase || null,
        group: m.group_no == null ? null : Number(m.group_no),
        teamAFrom: m.team1_from == null ? null : Number(m.team1_from),
        teamBFrom: m.team2_from == null ? null : Number(m.team2_from),
      };
    });

    const teamRequests = sortByNumberKey(requestMap.get(tid) || [], 'request_id').map((r) => ({
      id: Number(r.request_id),
      player1: r.player1,
      player2: r.player2,
      teamName: r.team_name,
      status: r.status || 'pending',
      createdAt: r.created_at || null,
    }));

    const groupAssignments = (groupMap.get(tid) || []).reduce((acc, g) => {
      acc[g.team_id] = Number(g.group_no);
      return acc;
    }, {});

    return {
      ...base,
      teams,
      matches,
      teamRequests,
      groupAssignments,
    };
  });

  const updatedAt = tournaments.reduce((latest, t) => {
    const ts = t?.updatedAt ? new Date(t.updatedAt).getTime() : 0;
    return ts > latest ? ts : latest;
  }, 0);

  return {
    ok: true,
    tournaments,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}

export async function loadRemoteTournaments() {
  const state = await loadRemoteState();
  if (!state.ok) return state;
  return { ok: true, tournaments: state.tournaments };
}

export async function saveRemoteTournaments(tournaments) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: missingConfigError() };
  }

  const list = ensureArray(tournaments);
  const rows = list.map(toRow);

  const allPlayerNames = Array.from(
    new Set(
      list
        .flatMap((t) => ensureArray(t.teams))
        .flatMap((team) => ensureArray(team.players))
        .map((name) => String(name || '').trim())
        .filter(Boolean)
    )
  );

  if (allPlayerNames.length > 0) {
    const userRows = allPlayerNames.map((displayName) => ({
      display_name: displayName,
      normalized_name: normalizeName(displayName),
    }));

    const { error: userUpsertError } = await supabase
      .from(USERS_TABLE)
      .upsert(userRows, { onConflict: 'normalized_name' });

    if (userUpsertError) return { ok: false, error: normalizeSupabaseError(userUpsertError.message) };
  }

  const { data: usersData, error: usersLoadError } = await supabase
    .from(USERS_TABLE)
    .select('id, display_name, normalized_name');

  if (usersLoadError) return { ok: false, error: normalizeSupabaseError(usersLoadError.message) };

  const userIdByNormalized = new Map(
    ensureArray(usersData).map((u) => [u.normalized_name, Number(u.id)])
  );

  const { data: existingRows, error: existingError } = await supabase.from(TABLE).select('id');
  if (existingError) return { ok: false, error: normalizeSupabaseError(existingError.message) };

  const incomingIds = new Set(rows.map((r) => Number(r.id)));
  const staleIds = ensureArray(existingRows)
    .map((r) => Number(r.id))
    .filter((id) => !incomingIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteTournamentsError } = await supabase
      .from(TABLE)
      .delete()
      .in('id', staleIds);
    if (deleteTournamentsError) return { ok: false, error: normalizeSupabaseError(deleteTournamentsError.message) };
  }

  if (rows.length > 0) {
    const { error: upsertTournamentsError } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'id' });
    if (upsertTournamentsError) return { ok: false, error: normalizeSupabaseError(upsertTournamentsError.message) };
  }

  for (const tournament of list) {
    const tid = Number(tournament.id);

    const [delTeams, delTeamUsers, delMatches, delScores, delRequests, delGroups] = await Promise.all([
      supabase.from(TEAMS_TABLE).delete().eq('tournament_id', tid),
      supabase.from(TEAM_USERS_TABLE).delete().eq('tournament_id', tid),
      supabase.from(MATCHES_TABLE).delete().eq('tournament_id', tid),
      supabase.from(SCORES_TABLE).delete().eq('tournament_id', tid),
      supabase.from(REQUESTS_TABLE).delete().eq('tournament_id', tid),
      supabase.from(GROUP_ASSIGNMENTS_TABLE).delete().eq('tournament_id', tid),
    ]);

    const deleteError = [
      delTeams.error,
      delTeamUsers.error,
      delMatches.error,
      delScores.error,
      delRequests.error,
      delGroups.error,
    ].find(Boolean);
    if (deleteError) return { ok: false, error: normalizeSupabaseError(deleteError.message) };

    const teamRows = ensureArray(tournament.teams).map((team) => ({
      tournament_id: tid,
      team_id: Number(team.id),
      team_name: team.name,
      players: ensureArray(team.players),
      updated_at: new Date().toISOString(),
    }));

    if (teamRows.length > 0) {
      const { error: teamInsertError } = await supabase.from(TEAMS_TABLE).insert(teamRows);
      if (teamInsertError) return { ok: false, error: normalizeSupabaseError(teamInsertError.message) };
    }

    const validTeamIds = new Set(teamRows.map((r) => Number(r.team_id)));

    const teamUserRows = ensureArray(tournament.teams).flatMap((team) =>
      ensureArray(team.players).map((playerName, idx) => {
        const normalized = normalizeName(playerName);
        const userId = userIdByNormalized.get(normalized);
        if (!userId) return null;
        return {
          tournament_id: tid,
          team_id: Number(team.id),
          user_id: userId,
          slot_no: idx + 1,
        };
      }).filter(Boolean)
    );

    if (teamUserRows.length > 0) {
      const { error: teamUsersInsertError } = await supabase.from(TEAM_USERS_TABLE).insert(teamUserRows);
      if (teamUsersInsertError) return { ok: false, error: normalizeSupabaseError(teamUsersInsertError.message) };
    }

    const matchRows = ensureArray(tournament.matches).map((m) => ({
      tournament_id: tid,
      match_id: Number(m.id),
      team1_id: m.teamAId == null ? null : Number(m.teamAId),
      team2_id: m.teamBId == null ? null : Number(m.teamBId),
      winner_team_id: m.winnerId == null ? null : Number(m.winnerId),
      serving_team_id: m.servingTeamId == null ? null : Number(m.servingTeamId),
      round: Number(m.round || 1),
      court: Number(m.court || 1),
      phase: m.phase || null,
      group_no: m.group == null ? null : Number(m.group),
      team1_from: m.teamAFrom == null ? null : Number(m.teamAFrom),
      team2_from: m.teamBFrom == null ? null : Number(m.teamBFrom),
      updated_at: new Date().toISOString(),
    }));

    if (matchRows.length > 0) {
      const { error: matchInsertError } = await supabase.from(MATCHES_TABLE).insert(matchRows);
      if (matchInsertError) return { ok: false, error: normalizeSupabaseError(matchInsertError.message) };
    }

    const scoreRows = ensureArray(tournament.matches).flatMap((m) => {
      const rows = [];
      if (m.teamAId != null && validTeamIds.has(Number(m.teamAId))) {
        rows.push({
          tournament_id: tid,
          match_id: Number(m.id),
          team_id: Number(m.teamAId),
          points: Number(m.scoreA || 0),
          updated_at: new Date().toISOString(),
        });
      }
      if (m.teamBId != null && validTeamIds.has(Number(m.teamBId))) {
        rows.push({
          tournament_id: tid,
          match_id: Number(m.id),
          team_id: Number(m.teamBId),
          points: Number(m.scoreB || 0),
          updated_at: new Date().toISOString(),
        });
      }
      return rows;
    });

    if (scoreRows.length > 0) {
      const { error: scoreInsertError } = await supabase.from(SCORES_TABLE).insert(scoreRows);
      if (scoreInsertError) return { ok: false, error: normalizeSupabaseError(scoreInsertError.message) };
    }

    const requestRows = ensureArray(tournament.teamRequests).map((r) => ({
      tournament_id: tid,
      request_id: Number(r.id),
      player1: r.player1,
      player2: r.player2,
      team_name: r.teamName,
      status: r.status || 'pending',
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (requestRows.length > 0) {
      const { error: requestInsertError } = await supabase.from(REQUESTS_TABLE).insert(requestRows);
      if (requestInsertError) return { ok: false, error: normalizeSupabaseError(requestInsertError.message) };
    }

    const groupAssignments = tournament.groupAssignments || {};
    const groupRows = Object.entries(groupAssignments).map(([teamId, groupNo]) => ({
      tournament_id: tid,
      team_id: Number(teamId),
      group_no: Number(groupNo),
    }));

    if (groupRows.length > 0) {
      const { error: groupsInsertError } = await supabase.from(GROUP_ASSIGNMENTS_TABLE).insert(groupRows);
      if (groupsInsertError) return { ok: false, error: normalizeSupabaseError(groupsInsertError.message) };
    }
  }

  return { ok: true };
}

export async function appendTeamRequestRemote(tournamentId, request) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: missingConfigError() };
  }

  const tid = Number(tournamentId);
  const payload = {
    tournament_id: tid,
    request_id: Number(request.id),
    player1: request.player1,
    player2: request.player2,
    team_name: request.teamName,
    status: request.status || 'pending',
    created_at: request.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: requestError } = await supabase
    .from(REQUESTS_TABLE)
    .upsert(payload, { onConflict: 'tournament_id,request_id' });

  if (requestError) return { ok: false, error: normalizeSupabaseError(requestError.message) };

  const { error: touchError } = await supabase
    .from(TABLE)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', tid);

  if (touchError) return { ok: false, error: normalizeSupabaseError(touchError.message) };

  return { ok: true };
}

export function subscribeToRemoteState(onStateChange) {
  if (!isSupabaseConfigured || !supabase || typeof onStateChange !== 'function') {
    return () => {};
  }

  const channel = supabase
    .channel('gametribe_tournaments_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: USERS_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TEAMS_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TEAM_USERS_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: MATCHES_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SCORES_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REQUESTS_TABLE,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: GROUP_ASSIGNMENTS_TABLE,
      },
      scheduleRefresh
    )
    .subscribe();

  let refreshTimer = null;

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      const state = await loadRemoteState();
      if (state.ok) onStateChange(state.tournaments, state.updatedAt);
    }, 120);
  }

  return () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    supabase.removeChannel(channel);
  };
}
