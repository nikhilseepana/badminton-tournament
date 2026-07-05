import { createContext, useContext, useEffect } from 'react';
import { Outlet, useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Grid } from 'antd';
import { useTournaments } from '../context/TournamentsContext';
import { useTournamentData } from '../hooks/useTournamentData';
import { isMatchComplete } from '../utils/scoring';
import { getTournamentStatus } from '../utils/helpers';
import { FiArrowLeft, FiAward, FiCalendar, FiUsers } from 'react-icons/fi';

const { useBreakpoint } = Grid;

// Local context for the active tournament
export const TournamentCtx = createContext(null);
export function useTournament() { return useContext(TournamentCtx); }

export default function TournamentLayout() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { tournaments, updateTournament } = useTournaments();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  const { teams, matches, teamLookup, standings, groupStandings, selectedMatch, finalMatch } = useTournamentData(tournament);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Auto-generate playoffs when all group/league matches are done
  useEffect(() => {
    if (!tournament) return;
    const fmt = tournament.format || 'league';
    if (fmt === 'knockout') return;

    const stagingMatches = fmt === 'groups'
      ? (tournament.matches || []).filter((m) => m.phase === 'group')
      : (tournament.matches || []).filter((m) => m.phase !== 'playoff');

    if (stagingMatches.length === 0) return;
    if (!stagingMatches.every((m) => m.winnerId !== null)) return;
    if ((tournament.matches || []).some((m) => m.phase === 'playoff')) return;

    updateTournament(tournamentId, (t) => {
      if ((t.matches || []).some((m) => m.phase === 'playoff')) return t;

      let topTeams;
      if (fmt === 'groups') {
        const ga = t.groupAssignments || {};
        const ng = t.numGroups || 2;
        const gFmt = t.groupFormat || 'league';
        topTeams = [];
        for (let gi = 0; gi < ng; gi++) {
          const gIds = new Set(Object.entries(ga).filter(([, g]) => Number(g) === gi).map(([id]) => Number(id)));
          const gTeams = t.teams.filter((tm) => gIds.has(tm.id));
          const gMatches = t.matches.filter((m) => m.group === gi);

          if (gFmt === 'knockout') {
            // Top 2 = winner & loser of the group's final match (highest round)
            const maxRound = Math.max(...gMatches.map((m) => m.round));
            const groupFinal = gMatches.find((m) => m.round === maxRound && m.winnerId);
            if (groupFinal) {
              const winner = t.teams.find((tm) => tm.id === groupFinal.winnerId);
              const loser = t.teams.find((tm) => tm.id === (groupFinal.teamAId === groupFinal.winnerId ? groupFinal.teamBId : groupFinal.teamAId));
              if (winner) topTeams.push(winner);
              if (loser) topTeams.push(loser);
            }
          } else {
            // Top 2 by points within the group
            const pts = {};
            gTeams.forEach((tm) => { pts[tm.id] = 0; });
            gMatches.forEach((m) => { if (m.winnerId) pts[m.winnerId] = (pts[m.winnerId] || 0) + 2; });
            const sorted = [...gTeams].sort((a, b) => (pts[b.id] || 0) - (pts[a.id] || 0));
            topTeams.push(...sorted.slice(0, 2));
          }
        }
      } else {
        topTeams = standings.slice(0, Math.min(4, standings.length));
      }

      if (topTeams.length < 2) return t;

      const currentMatches = t.matches || [];
      const maxId = currentMatches.reduce((mx, m) => Math.max(mx, m.id), 0);
      const maxRound = currentMatches.reduce((mx, m) => Math.max(mx, m.round || 0), 0);
      const newMatches = [];
      if (topTeams.length >= 4) {
        const sf1Id = maxId + 1, sf2Id = maxId + 2, finalId = maxId + 3;
        newMatches.push(
          { id: sf1Id, teamAId: topTeams[0].id, teamBId: topTeams[3].id, scoreA: 0, scoreB: 0, winnerId: null, servingTeamId: topTeams[0].id, round: maxRound + 1, court: 1, teamAFrom: null, teamBFrom: null, phase: 'playoff' },
          { id: sf2Id, teamAId: topTeams[1].id, teamBId: topTeams[2].id, scoreA: 0, scoreB: 0, winnerId: null, servingTeamId: topTeams[1].id, round: maxRound + 1, court: 2, teamAFrom: null, teamBFrom: null, phase: 'playoff' },
          { id: finalId, teamAId: null, teamBId: null, scoreA: 0, scoreB: 0, winnerId: null, servingTeamId: null, round: maxRound + 2, court: 1, teamAFrom: sf1Id, teamBFrom: sf2Id, phase: 'playoff' },
        );
      } else {
        newMatches.push({ id: maxId + 1, teamAId: topTeams[0].id, teamBId: topTeams[1].id, scoreA: 0, scoreB: 0, winnerId: null, servingTeamId: topTeams[0].id, round: maxRound + 1, court: 1, teamAFrom: null, teamBFrom: null, phase: 'playoff' });
      }
      return { ...t, matches: [...t.matches, ...newMatches] };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.filter((m) => m.winnerId !== null).length]);

  if (!tournament) return <Navigate to="/" replace />;

  // Smart redirect: if fixtures already exist, land on draw; otherwise teams.
  const status = getTournamentStatus(tournament);
  const hasFixtures = Array.isArray(tournament.matches) && tournament.matches.length > 0;
  if (pathname === `/t/${id}` || pathname === `/t/${id}/`) {
    return <Navigate to={hasFixtures ? 'draw' : (status === 'upcoming' ? 'teams' : 'draw')} replace />;
  }

  const completedMatches = matches.filter((m) => m.winnerId !== null).length;
  const totalMatches = matches.length;
  const progressPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
  const tabs = [
    { key: 'teams', label: 'Teams', icon: FiUsers, to: `/t/${tournamentId}/teams` },
    ...(hasFixtures ? [
      { key: 'draw', label: 'Fixtures', icon: FiCalendar, to: `/t/${tournamentId}/draw` },
      { key: 'table', label: 'Standings', icon: FiAward, to: `/t/${tournamentId}/table` },
    ] : []),
  ];

  // --- Tournament-scoped handlers ---

  function update(updater) {
    updateTournament(tournamentId, updater);
  }

  function updateMatchScore(matchId, nextScoreA, nextScoreB) {
    update((t) => {
      let updatedMatch = null;
      const firstPass = t.matches.map((match) => {
        if (match.id !== matchId || match.winnerId !== null) return match;
        const scoreA = Math.max(0, nextScoreA);
        const scoreB = Math.max(0, nextScoreB);
        const finished = isMatchComplete(scoreA, scoreB);
        let nextServing = match.servingTeamId;
        if (scoreA > match.scoreA) nextServing = match.teamAId;
        else if (scoreB > match.scoreB) nextServing = match.teamBId;
        updatedMatch = { ...match, scoreA, scoreB, winnerId: finished ? (scoreA > scoreB ? match.teamAId : match.teamBId) : null, servingTeamId: nextServing };
        return updatedMatch;
      });
      const hasDeps = firstPass.some((m) => m.teamAFrom === matchId || m.teamBFrom === matchId);
      if (updatedMatch?.winnerId && hasDeps) {
        return {
          ...t,
          matches: firstPass.map((m) => {
            if (m.teamAFrom === matchId) return { ...m, teamAId: updatedMatch.winnerId, servingTeamId: updatedMatch.winnerId };
            if (m.teamBFrom === matchId) return { ...m, teamBId: updatedMatch.winnerId };
            return m;
          }),
        };
      }
      return { ...t, matches: firstPass };
    });
  }

  function resetMatch(matchId) {
    update((t) => {
      const cleared = t.matches.map((m) =>
        m.id === matchId ? { ...m, scoreA: 0, scoreB: 0, winnerId: null, servingTeamId: null } : m
      );
      const hasDeps = cleared.some((m) => m.teamAFrom === matchId || m.teamBFrom === matchId);
      if (hasDeps) {
        return {
          ...t,
          matches: cleared.map((m) => {
            if (m.teamAFrom === matchId) return { ...m, teamAId: null, scoreA: 0, scoreB: 0, winnerId: null };
            if (m.teamBFrom === matchId) return { ...m, teamBId: null, scoreA: 0, scoreB: 0, winnerId: null };
            return m;
          }),
        };
      }
      return { ...t, matches: cleared };
    });
  }

  function handleOpenMatch(matchId) {
    update((t) => ({ ...t, selectedMatchId: matchId }));
    navigate(`/t/${tournamentId}/score`);
  }

  function handleSetServe(matchId, teamId) {
    update((t) => ({ ...t, matches: t.matches.map((m) => m.id === matchId ? { ...m, servingTeamId: teamId } : m) }));
  }

  function handleWinnerPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update((t) => ({ ...t, winnerPhoto: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function handleRunnerUpPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update((t) => ({ ...t, runnerUpPhoto: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function handleShareChampion(champion, runnerUp) {
    const name = tournament?.name || 'Tournament';
    const text = `🏆 ${name} Results!\n\n🥇 Champion: ${champion?.name || '?'}\n🥈 Runner-up: ${runnerUp?.name || '?'}`;
    if (navigator.share) navigator.share({ title: name, text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  }

  function handleShareRunnerUp(champion, runnerUp) {
    const name = tournament?.name || 'Tournament';
    const text = `🥈 ${name}\n\nRunner-up: ${runnerUp?.name || '?'}\n🏆 Champion: ${champion?.name || '?'}`;
    if (navigator.share) navigator.share({ title: `${name} – Runner-up`, text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  }

  const ctx = {
    tournament, tournamentId, isMobile,
    teams, matches, teamLookup, standings, groupStandings, selectedMatch, finalMatch,
    update,
    updateMatchScore,
    resetMatch,
    handleOpenMatch,
    handleSetServe,
    handleWinnerPhoto,
    handleRunnerUpPhoto,
    handleShareChampion,
    handleShareRunnerUp,
  };

  return (
    <TournamentCtx.Provider value={ctx}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #031329 0px, #08264f 160px, #f1f5f9 280px, #f8fafc 100%)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Nunito Sans', 'Avenir Next', 'SF Pro Display', 'Segoe UI', sans-serif",
      }}>
        {/* Tournament hero header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'linear-gradient(180deg,#031329 0%, #08264f 100%)',
          borderBottom: '1px solid rgba(71,85,105,0.22)',
          padding: isMobile ? '8px 10px 10px' : '10px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <button
              onClick={() => pathname.endsWith('/score') ? navigate('draw') : navigate('/')}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'rgba(191,219,254,0.8)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              aria-label="Back"
            >
              <FiArrowLeft size={22} />
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: isMobile ? 21 : 25, lineHeight: 1.05, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.2px' }}>
                {tournament.name}
              </div>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(30,58,99,0.72)', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#34d399 0%,#22c55e 100%)', boxShadow: '0 0 16px rgba(34,197,94,0.5)' }} />
            </div>
            <div style={{ minWidth: 84, textAlign: 'right', color: '#a5b4fc', fontSize: 12, fontWeight: 700 }}>
              {completedMatches}/{totalMatches} played
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname.includes(`/${tab.key}`);
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.to)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: 'none',
                    background: active ? 'linear-gradient(180deg,rgba(16,185,129,0.22),rgba(5,150,105,0.18))' : 'rgba(15,23,42,0.12)',
                    color: active ? '#6ee7b7' : '#93aecf',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Page content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '10px 12px',
          paddingBottom: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <Outlet />
        </div>


      </div>
    </TournamentCtx.Provider>
  );
}
