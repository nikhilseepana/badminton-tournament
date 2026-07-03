import "./App.css";
import "antd/dist/reset.css";
import { useEffect, useMemo, useState } from "react";
import { GiShuttlecock } from "react-icons/gi";
import {
  Button,
  Card,
  ConfigProvider,
  Flex,
  Grid,
  Input,
  Radio,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

const initialForm = {
  name: "",
  player1: "",
  player2: "",
};

const DEMO_TEAMS = [];

const TABS = [
  { key: "tournaments", label: "Events", icon: "🏆" },
  { key: "teams", label: "Teams", icon: "👥" },
  { key: "fixtures", label: "Draw", icon: "📋" },
  { key: "match", label: "Score", icon: "🏸" },
  { key: "standings", label: "Table", icon: "📊" },
];

function ShuttleIcon({ size = 16 }) {
  return (
    <GiShuttlecock className="shuttle-icon" size={size} aria-hidden="true" />
  );
}

function isMatchComplete(scoreA, scoreB) {
  if (scoreA === 20 && scoreB === 20) {
    return false;
  }

  if ((scoreA === 21 && scoreB <= 20) || (scoreB === 21 && scoreA <= 20)) {
    return true;
  }

  return false;
}

function buildSchedule(teams, numCourts = 2) {
  if (teams.length < 2) return [];
  const ids = teams.map((t) => t.id);
  if (ids.length % 2 !== 0) ids.push(null); // BYE for odd teams
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
          scoreA: 0,
          scoreB: 0,
          winnerId: null,
          servingTeamId: home,
          round: round + 1,
          court: (courtIdx % numCourts) + 1,
        });
        courtIdx++;
      }
    }
    // Rotate: move last element to index 1, keep index 0 fixed
    list.splice(1, 0, list.pop());
  }

  return fixtures;
}

// Bracket seeding order: ensures top seeds meet only in finals
function buildBracketOrder(size) {
  if (size <= 2) return Array.from({ length: size }, (_, i) => i + 1);
  const half = buildBracketOrder(size / 2);
  const result = [];
  for (const s of half) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

function buildKnockout(teams, numCourts = 2) {
  if (teams.length < 2) return [];
  let size = 1;
  while (size < teams.length) size *= 2;
  const order = buildBracketOrder(size);
  const teamIds = teams.map((t) => t.id);
  const fixtures = [];
  let matchId = 1;
  let slots = [];
  let courtIdx = 0;
  // First round
  for (let i = 0; i < size; i += 2) {
    const teamA = teamIds[order[i] - 1] ?? null;
    const teamB = teamIds[order[i + 1] - 1] ?? null;
    if (teamA !== null && teamB === null) {
      slots.push({ mid: null, bye: teamA }); // BYE: auto-advance
    } else {
      fixtures.push({
        id: matchId,
        teamAId: teamA,
        teamBId: teamB,
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        servingTeamId: teamA,
        round: 1,
        court: (courtIdx % numCourts) + 1,
        teamAFrom: null,
        teamBFrom: null,
      });
      slots.push({ mid: matchId, bye: null });
      matchId++;
      courtIdx++;
    }
  }
  // Subsequent rounds
  const totalRounds = Math.log2(size);
  for (let round = 2; round <= totalRounds; round++) {
    const next = [];
    courtIdx = 0;
    for (let i = 0; i < slots.length; i += 2) {
      const sA = slots[i];
      const sB = slots[i + 1];
      fixtures.push({
        id: matchId,
        teamAId: sA.bye ?? null,
        teamBId: sB.bye ?? null,
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        servingTeamId: sA.bye ?? null,
        round,
        court: (courtIdx % numCourts) + 1,
        teamAFrom: sA.mid,
        teamBFrom: sB.mid,
      });
      next.push({ mid: matchId, bye: null });
      matchId++;
      courtIdx++;
    }
    slots = next;
  }
  return fixtures;
}

function getKnockoutRoundLabel(round, totalRounds) {
  const f = totalRounds - round;
  if (f === 0) return "🏆 Final";
  if (f === 1) return "Semifinal";
  if (f === 2) return "Quarterfinal";
  if (f === 3) return "Round of 16";
  return `Round ${round}`;
}

function getHeadToHeadWinner(teamAId, teamBId, matches) {
  const directMatch = matches.find((match) => {
    const pair1 = match.teamAId === teamAId && match.teamBId === teamBId;
    const pair2 = match.teamAId === teamBId && match.teamBId === teamAId;
    return (pair1 || pair2) && match.winnerId !== null;
  });

  return directMatch ? directMatch.winnerId : null;
}

function getNextTeamId(teams) {
  return teams.reduce((maxId, team) => Math.max(maxId, team.id), 0) + 1;
}

function getNextTournamentId(tournaments) {
  return (
    tournaments.reduce(
      (maxId, tournament) => Math.max(maxId, tournament.id),
      0,
    ) + 1
  );
}

function createTournament(id, name, teams = [], courts = 2, format = "league") {
  return {
    id,
    name,
    teams,
    matches:
      format === "knockout"
        ? buildKnockout(teams, courts)
        : buildSchedule(teams, courts),
    selectedMatchId: null,
    playerPool: [],
    courts,
    format,
  };
}

function App() {
  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem("badtour_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [createTournament(1, "Summer Smash Cup", DEMO_TEAMS)];
  });
  const [activeTournamentId, setActiveTournamentId] = useState(() => {
    return Number(localStorage.getItem("badtour_active")) || 1;
  });
  const [tournamentForm, setTournamentForm] = useState("");
  const [teamForm, setTeamForm] = useState(initialForm);
  const [playerPoolForm, setPlayerPoolForm] = useState("");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('badtour_gh_token') || import.meta.env.VITE_GH_TOKEN || '');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("fixtures");

  useEffect(() => {
    try {
      localStorage.setItem("badtour_data", JSON.stringify(tournaments));
      localStorage.setItem("badtour_active", String(activeTournamentId));
    } catch {}
  }, [tournaments, activeTournamentId]);

  const activeTournament = useMemo(
    () =>
      tournaments.find((tournament) => tournament.id === activeTournamentId) ||
      null,
    [activeTournamentId, tournaments],
  );

  const teams = activeTournament?.teams || [];
  const matches = activeTournament?.matches || [];
  const selectedMatchId = activeTournament?.selectedMatchId || null;

  const teamLookup = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const standings = useMemo(() => {
    const table = teams.map((team) => ({
      id: team.id,
      name: team.name,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      scoredFor: 0,
      scoredAgainst: 0,
      pointDiff: 0,
      winRate: 0,
      tieHint: "-",
    }));

    const indexById = new Map(table.map((entry, idx) => [entry.id, idx]));

    matches.forEach((match) => {
      if (match.winnerId === null) {
        return;
      }

      const a = table[indexById.get(match.teamAId)];
      const b = table[indexById.get(match.teamBId)];

      a.played += 1;
      b.played += 1;
      a.scoredFor += match.scoreA;
      a.scoredAgainst += match.scoreB;
      b.scoredFor += match.scoreB;
      b.scoredAgainst += match.scoreA;

      if (match.winnerId === match.teamAId) {
        a.wins += 1;
        a.points += 2;
        b.losses += 1;
      } else {
        b.wins += 1;
        b.points += 2;
        a.losses += 1;
      }
    });

    table.forEach((entry) => {
      entry.pointDiff = entry.scoredFor - entry.scoredAgainst;
      entry.winRate = entry.played
        ? Math.round((entry.wins / entry.played) * 100)
        : 0;
    });

    table.sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      const h2hWinner = getHeadToHeadWinner(left.id, right.id, matches);
      if (h2hWinner === left.id) {
        return -1;
      }
      if (h2hWinner === right.id) {
        return 1;
      }

      if (right.pointDiff !== left.pointDiff) {
        return right.pointDiff - left.pointDiff;
      }

      if (right.scoredFor !== left.scoredFor) {
        return right.scoredFor - left.scoredFor;
      }

      return left.name.localeCompare(right.name);
    });

    const groupedByPoints = new Map();
    table.forEach((entry) => {
      if (!groupedByPoints.has(entry.points)) {
        groupedByPoints.set(entry.points, []);
      }
      groupedByPoints.get(entry.points).push(entry);
    });

    table.forEach((entry) => {
      const samePoints = groupedByPoints.get(entry.points) || [];
      if (samePoints.length <= 1 || entry.played === 0) {
        entry.tieHint = "-";
        return;
      }

      const rival = samePoints.find((item) => item.id !== entry.id);
      const h2hWinner = rival
        ? getHeadToHeadWinner(entry.id, rival.id, matches)
        : null;
      entry.tieHint = h2hWinner === entry.id ? "H2H" : "Diff";
    });

    return table;
  }, [matches, teams]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId],
  );

  const fixturesDone = matches.filter(
    (match) => match.winnerId !== null,
  ).length;

  function updateActiveTournament(updater) {
    if (!activeTournamentId) {
      return;
    }

    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === activeTournamentId ? updater(tournament) : tournament,
      ),
    );
  }

  function handleCreateTournament(event) {
    event.preventDefault();

    const name = tournamentForm.trim();
    if (!name) {
      return;
    }

    const nextId = getNextTournamentId(tournaments);
    const nextTournament = createTournament(nextId, name, []);

    setTournaments((current) => [...current, nextTournament]);
    setActiveTournamentId(nextId);
    setTournamentForm("");
    setActiveTab("teams");
  }

  function handleSelectTournament(tournamentId) {
    setActiveTournamentId(tournamentId);
    const t = tournaments.find((x) => x.id === tournamentId);
    setActiveTab(t && t.teams.length === 0 ? "teams" : "fixtures");
  }

  function updateMatchScore(
    matchId,
    nextScoreA,
    nextScoreB,
    allowFinishedUpdate = false,
  ) {
    updateActiveTournament((tournament) => {
      let updatedMatch = null;
      const firstPass = tournament.matches.map((match) => {
        if (match.id !== matchId) return match;
        if (match.winnerId !== null && !allowFinishedUpdate) return match;
        const scoreA = Math.max(0, nextScoreA);
        const scoreB = Math.max(0, nextScoreB);
        const finished = isMatchComplete(scoreA, scoreB);
        let nextServingTeamId = match.servingTeamId || match.teamAId;
        if (scoreA === 0 && scoreB === 0) nextServingTeamId = match.teamAId;
        else if (scoreA > match.scoreA && scoreB === match.scoreB)
          nextServingTeamId = match.teamAId;
        else if (scoreB > match.scoreB && scoreA === match.scoreA)
          nextServingTeamId = match.teamBId;
        updatedMatch = {
          ...match,
          scoreA,
          scoreB,
          winnerId: finished
            ? scoreA > scoreB
              ? match.teamAId
              : match.teamBId
            : null,
          servingTeamId: nextServingTeamId,
        };
        return updatedMatch;
      });
      // Knockout bracket advancement
      if (
        (tournament.format || "league") === "knockout" &&
        updatedMatch?.winnerId
      ) {
        return {
          ...tournament,
          matches: firstPass.map((m) => {
            if (m.teamAFrom === matchId)
              return {
                ...m,
                teamAId: updatedMatch.winnerId,
                servingTeamId: updatedMatch.winnerId,
              };
            if (m.teamBFrom === matchId)
              return { ...m, teamBId: updatedMatch.winnerId };
            return m;
          }),
        };
      }
      return { ...tournament, matches: firstPass };
    });
  }

  function resetMatch(matchId) {
    updateActiveTournament((tournament) => {
      const cleared = tournament.matches.map((m) =>
        m.id === matchId
          ? {
              ...m,
              scoreA: 0,
              scoreB: 0,
              winnerId: null,
              servingTeamId: m.teamAId,
            }
          : m,
      );
      if ((tournament.format || "league") === "knockout") {
        return {
          ...tournament,
          matches: cleared.map((m) => {
            if (m.teamAFrom === matchId)
              return {
                ...m,
                teamAId: null,
                scoreA: 0,
                scoreB: 0,
                winnerId: null,
              };
            if (m.teamBFrom === matchId)
              return {
                ...m,
                teamBId: null,
                scoreA: 0,
                scoreB: 0,
                winnerId: null,
              };
            return m;
          }),
        };
      }
      return { ...tournament, matches: cleared };
    });
  }

  function handleAddTeam(event) {
    event.preventDefault();

    if (
      !teamForm.name.trim() ||
      !teamForm.player1.trim() ||
      !teamForm.player2.trim()
    ) {
      return;
    }

    const nextTeam = {
      id: getNextTeamId(teams),
      name: teamForm.name.trim(),
      players: [teamForm.player1.trim(), teamForm.player2.trim()],
    };

    updateActiveTournament((tournament) => ({
      ...tournament,
      teams: [...tournament.teams, nextTeam],
      matches: [],
      selectedMatchId: null,
    }));
    setActiveTab("teams");
    setTeamForm(initialForm);
  }

  function handleGenerateFixtures() {
    const t = tournaments.find((x) => x.id === activeTournamentId);
    if (t && t.matches.length > 0) return;
    updateActiveTournament((tournament) => ({
      ...tournament,
      matches:
        (tournament.format || "league") === "knockout"
          ? buildKnockout(tournament.teams, tournament.courts ?? 2)
          : buildSchedule(tournament.teams, tournament.courts ?? 2),
      selectedMatchId: null,
    }));
    setActiveTab("fixtures");
  }

  function handleOpenMatch(matchId) {
    updateActiveTournament((tournament) => ({
      ...tournament,
      selectedMatchId: matchId,
    }));
    setActiveTab("match");
  }

  function handleSetServe(matchId, teamId) {
    updateActiveTournament((t) => ({
      ...t,
      matches: t.matches.map((m) =>
        m.id === matchId ? { ...m, servingTeamId: teamId } : m,
      ),
    }));
  }

  function loadDemoData() {
    updateActiveTournament((tournament) => ({
      ...tournament,
      teams: DEMO_TEAMS,
      playerPool: [],
      matches: buildSchedule(DEMO_TEAMS, tournament.courts ?? 2),
      selectedMatchId: null,
    }));
    setActiveTab("fixtures");
  }

  function handleAddPlayer() {
    const name = playerPoolForm.trim();
    if (!name) return;
    updateActiveTournament((t) => ({
      ...t,
      playerPool: [...(t.playerPool || []), name],
    }));
    setPlayerPoolForm("");
  }

  function handleRemovePlayer(idx) {
    updateActiveTournament((t) => ({
      ...t,
      playerPool: (t.playerPool || []).filter((_, i) => i !== idx),
    }));
  }

  function handleAutoCreateTeams() {
    updateActiveTournament((t) => {
      const pool = [...(t.playerPool || [])];
      if (pool.length < 2) return t;
      const newTeams = [...t.teams];
      let nextId = getNextTeamId(newTeams);
      while (pool.length >= 2) {
        const p1 = pool.shift();
        const p2 = pool.shift();
        newTeams.push({
          id: nextId++,
          name: `${p1} & ${p2}`,
          players: [p1, p2],
        });
      }
      return { ...t, teams: newTeams, playerPool: pool, matches: [] };
    });
  }

  function handleUpdateCourts(val) {
    const n = Math.max(1, Math.min(10, Number(val) || 1));
    updateActiveTournament((t) => ({ ...t, courts: n }));
  }

  function handleUpdateFormat(fmt) {
    updateActiveTournament((t) => ({
      ...t,
      format: fmt,
      matches: [],
      selectedMatchId: null,
    }));
  }

  async function handlePushToGitHub() {
    if (!githubToken.trim()) { setSyncStatus('❌ Enter a GitHub token first'); return; }
    setSyncing(true); setSyncStatus('⏳ Pushing to GitHub...');
    try {
      const HDRS = { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
      const URL = 'https://api.github.com/repos/nikhilseepana/badminton-tournament/contents/data/tournaments.json';
      const getRes = await fetch(URL, { headers: HDRS });
      const sha = getRes.ok ? (await getRes.json()).sha : undefined;
      const jsonStr = JSON.stringify({ tournaments, activeTournamentId, savedAt: new Date().toISOString() }, null, 2);
      let binary = ''; const enc = new TextEncoder().encode(jsonStr);
      for (let i = 0; i < enc.length; i++) binary += String.fromCharCode(enc[i]);
      const putRes = await fetch(URL, {
        method: 'PUT', headers: HDRS,
        body: JSON.stringify({ message: `badtour: save ${new Date().toISOString().slice(0,16).replace('T',' ')}`, content: btoa(binary), ...(sha ? { sha } : {}) }),
      });
      setSyncStatus(putRes.ok ? '✅ Saved to GitHub!' : `❌ GitHub error ${putRes.status}`);
    } catch (e) { setSyncStatus(`❌ ${e.message}`); }
    setSyncing(false);
  }

  async function handleFillTokenFromGhCLI() {
    setSyncStatus('⏳ Reading gh CLI...');
    try {
      const res = await fetch('/api/gh-token');
      const data = await res.json();
      if (!res.ok || data.error) { setSyncStatus(`❌ ${data.error || 'gh CLI failed'}`); return; }
      setGithubToken(data.token);
      localStorage.setItem('badtour_gh_token', data.token);
      setSyncStatus('✅ Token loaded from gh CLI!');
    } catch { setSyncStatus('❌ Could not reach dev server endpoint'); }
  }

  async function handlePullFromGitHub() {
    if (!githubToken.trim()) { setSyncStatus('❌ Enter a GitHub token first'); return; }
    setSyncing(true); setSyncStatus('⏳ Loading from GitHub...');
    try {
      const res = await fetch('https://api.github.com/repos/nikhilseepana/badminton-tournament/contents/data/tournaments.json', {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) { setSyncStatus('❌ No data file yet — push first'); setSyncing(false); return; }
      const file = await res.json();
      const raw = atob(file.content.replace(/\n/g, ''));
      const rawBytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) rawBytes[i] = raw.charCodeAt(i);
      const decoded = JSON.parse(new TextDecoder().decode(rawBytes));
      if (Array.isArray(decoded.tournaments)) {
        setTournaments(decoded.tournaments);
        if (decoded.activeTournamentId) setActiveTournamentId(Number(decoded.activeTournamentId));
        setSyncStatus('✅ Loaded from GitHub!');
      }
    } catch (e) { setSyncStatus(`❌ ${e.message}`); }
    setSyncing(false);
  }

  const servingTeamId = selectedMatch
    ? selectedMatch.servingTeamId || selectedMatch.teamAId
    : null;
  const isServingA = selectedMatch && servingTeamId === selectedMatch.teamAId;
  const isServingB = selectedMatch && servingTeamId === selectedMatch.teamBId;

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 14,
          fontFamily: "'SF Pro Display', 'Avenir Next', 'Segoe UI', sans-serif",
          fontSize: 14,
          colorBgContainer: "#ffffff",
        },
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(160deg, #eff6ff 0%, #f8faff 60%, #f0fdf4 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'SF Pro Display', 'Avenir Next', 'Segoe UI', sans-serif",
        }}
      >
        {/* Desktop top nav */}
        {!isMobile && (
          <div style={{ padding: "12px 16px 0", display: "flex", gap: 6 }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background:
                    activeTab === tab.key ? "#2563eb" : "rgba(0,0,0,0.06)",
                  color: activeTab === tab.key ? "#fff" : "#374151",
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 13,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 10px",
            paddingBottom: isMobile ? 80 : 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Active tournament banner */}
          {activeTournament && activeTab !== "tournaments" && (
            <div
              style={{
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(37,99,235,0.15)",
                borderRadius: 14,
                padding: "8px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#1e293b", fontWeight: 700, fontSize: 14 }}>
                {activeTournament.name}
              </span>
              <span style={{ color: "#64748b", fontSize: 11 }}>
                {teams.length} teams · {matches.length} fixtures
              </span>
            </div>
          )}

          {/* Tournaments page */}
          {activeTab === "tournaments" && (
            <Card
              styles={{ body: { padding: "14px 16px" } }}
              style={{
                border: "1px solid rgba(37,99,235,0.1)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
                borderRadius: 18,
              }}
            >
              <Flex
                justify="space-between"
                align="center"
                style={{ marginBottom: 8 }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  Tournaments
                </Title>
                <Flex gap={4} align="center">
                  <Button size="small" loading={syncing} disabled={syncing} onClick={handlePullFromGitHub} title="Pull from GitHub">⬇</Button>
                  <Button size="small" type="primary" loading={syncing} disabled={syncing} onClick={handlePushToGitHub} title="Push to GitHub">⬆</Button>
                  {syncStatus && <Text style={{ fontSize: 11, color: syncStatus.startsWith('✅') ? '#16a34a' : syncStatus.startsWith('⏳') ? '#2563eb' : '#dc2626' }}>{syncStatus}</Text>}
                </Flex>
              </Flex>
              <form
                onSubmit={handleCreateTournament}
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Input
                  value={tournamentForm}
                  placeholder="Tournament name"
                  onChange={(e) => setTournamentForm(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button type="primary" htmlType="submit">
                  Create
                </Button>
              </form>
              <Space direction="vertical" style={{ width: "100%" }}>
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    onClick={() => handleSelectTournament(tournament.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1px solid ${tournament.id === activeTournamentId ? "#1d4ed8" : "#d4deea"}`,
                      background:
                        tournament.id === activeTournamentId
                          ? "rgba(29,78,216,0.05)"
                          : "white",
                      cursor: "pointer",
                    }}
                  >
                    <Text strong>{tournament.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {tournament.teams.length} teams ·{" "}
                      {tournament.matches.length} fixtures
                    </Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* Teams page */}
          {activeTab === "teams" && activeTournament && (
            <Card
              styles={{ body: { padding: "14px 16px" } }}
              style={{
                border: "1px solid rgba(37,99,235,0.1)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
                borderRadius: 18,
              }}
            >
              <Flex
                justify="space-between"
                align="center"
                style={{ marginBottom: 10 }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  Teams
                </Title>
                <Tag>{teams.length} registered</Tag>
              </Flex>

              {/* Player pool */}
              <div
                style={{
                  background: "linear-gradient(135deg,#eff6ff,#f0fdf4)",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 10,
                }}
              >
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    color: "#2563eb",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  ⚡ Quick-add players → auto teams
                </Text>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddPlayer();
                  }}
                  style={{ display: "flex", gap: 6, marginBottom: 6 }}
                >
                  <Input
                    value={playerPoolForm}
                    placeholder="Player name"
                    onChange={(e) => setPlayerPoolForm(e.target.value)}
                    style={{ flex: 1 }}
                    size="small"
                  />
                  <Button type="primary" htmlType="submit" size="small">
                    Add
                  </Button>
                </form>
                {(activeTournament.playerPool || []).length > 0 ? (
                  <>
                    <Flex wrap="wrap" gap={4} style={{ marginBottom: 6 }}>
                      {(activeTournament.playerPool || []).map((p, i) => (
                        <Tag
                          key={i}
                          closable
                          onClose={() => handleRemovePlayer(i)}
                          color="blue"
                          style={{ margin: 0 }}
                        >
                          {p}
                        </Tag>
                      ))}
                    </Flex>
                    {(activeTournament.playerPool || []).length >= 2 && (
                      <Button
                        size="small"
                        type="primary"
                        onClick={handleAutoCreateTeams}
                      >
                        ⚡ Create{" "}
                        {Math.floor(
                          (activeTournament.playerPool || []).length / 2,
                        )}{" "}
                        team
                        {Math.floor(
                          (activeTournament.playerPool || []).length / 2,
                        ) !== 1
                          ? "s"
                          : ""}{" "}
                        from pool
                      </Button>
                    )}
                  </>
                ) : (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Add players above — every pair becomes a team
                  </Text>
                )}
              </div>

              <Text
                type="secondary"
                style={{ fontSize: 11, display: "block", marginBottom: 6 }}
              >
                Or add a team manually:
              </Text>
              <form
                onSubmit={handleAddTeam}
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Input
                  value={teamForm.name}
                  placeholder="Team name"
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <Input
                  value={teamForm.player1}
                  placeholder="Player 1"
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, player1: e.target.value }))
                  }
                />
                <Input
                  value={teamForm.player2}
                  placeholder="Player 2"
                  onChange={(e) =>
                    setTeamForm((p) => ({ ...p, player2: e.target.value }))
                  }
                />
                <Button type="primary" htmlType="submit">
                  Add
                </Button>
              </form>

              <Flex
                align="center"
                gap="small"
                wrap="wrap"
                style={{ marginBottom: 8 }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  Format:
                </Text>
                <Radio.Group
                  value={activeTournament.format || "league"}
                  onChange={(e) => handleUpdateFormat(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="league">🔄 League</Radio.Button>
                  <Radio.Button value="knockout">🥊 Knockout</Radio.Button>
                </Radio.Group>
              </Flex>
              <Flex
                align="center"
                gap="small"
                wrap="wrap"
                style={{ marginBottom: 10 }}
              >
                <Button
                  onClick={handleGenerateFixtures}
                  disabled={teams.length < 2 || (activeTournament && activeTournament.matches.length > 0)}
                  type="primary"
                  ghost
                >
                  Generate Fixtures
                </Button>
                <Flex align="center" gap={4}>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    Courts:
                  </Text>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={activeTournament.courts ?? 2}
                    onChange={(e) => handleUpdateCourts(e.target.value)}
                    style={{ width: 54 }}
                    size="small"
                  />
                </Flex>
                <Button onClick={loadDemoData} size="small">
                  Load Demo
                </Button>
              </Flex>

              <Space direction="vertical" style={{ width: "100%" }}>
                {teams.map((team) => (
                  <div
                    key={team.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid #d4deea",
                      background: "#fbfdff",
                    }}
                  >
                    <Text strong>{team.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {team.players[0]} & {team.players[1]}
                    </Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* Fixtures page */}
          {activeTab === "fixtures" && activeTournament && (
            <Card
              styles={{ body: { padding: "14px 16px" } }}
              style={{
                border: "1px solid rgba(37,99,235,0.1)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
                borderRadius: 18,
              }}
            >
              <Flex
                justify="space-between"
                align="center"
                style={{ marginBottom: 8 }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  Draw
                </Title>
                <Flex gap="small" align="center">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {activeTournament.courts ?? 2} courts
                  </Text>
                  <Tag>
                    {fixturesDone} / {matches.length} done
                  </Tag>
                </Flex>
              </Flex>
              {matches.length === 0 && (
                <Space direction="vertical">
                  <Text type="secondary">
                    No fixtures yet. Go to Teams, set courts count, then tap
                    Generate Fixtures.
                  </Text>
                  <Button onClick={() => setActiveTab("teams")}>
                    Go to Teams
                  </Button>
                </Space>
              )}
              {matches.length > 0 &&
                (() => {
                  const byRound = matches.reduce((acc, m) => {
                    const r = m.round || 1;
                    if (!acc[r]) acc[r] = [];
                    acc[r].push(m);
                    return acc;
                  }, {});
                  const totalRounds = Math.max(
                    ...Object.keys(byRound).map(Number),
                  );
                  const isKnockout =
                    (activeTournament.format || "league") === "knockout";
                  return Object.keys(byRound)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((round) => (
                      <div key={round} style={{ marginBottom: 8 }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.6px",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          {isKnockout
                            ? getKnockoutRoundLabel(Number(round), totalRounds)
                            : `Round ${round}`}
                        </Text>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          {byRound[round].map((match) => {
                            const teamA = teamLookup.get(match.teamAId);
                            const teamB = teamLookup.get(match.teamBId);
                            const nameA =
                              teamA?.name ||
                              (match.teamAFrom
                                ? `Winner M${match.teamAFrom}`
                                : "TBD");
                            const nameB =
                              teamB?.name ||
                              (match.teamBFrom
                                ? `Winner M${match.teamBFrom}`
                                : "TBD");
                            const isTbd = !match.teamAId || !match.teamBId;
                            return (
                              <div
                                key={match.id}
                                style={{
                                  display: "flex",
                                  flexDirection: isMobile ? "column" : "row",
                                  justifyContent: "space-between",
                                  alignItems: isMobile ? "stretch" : "center",
                                  gap: 8,
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: match.winnerId
                                    ? "1px solid #86efac"
                                    : isTbd
                                      ? "1px dashed #d1d5db"
                                      : "1px solid #d4deea",
                                  background: match.winnerId
                                    ? "#f0fdf4"
                                    : isTbd
                                      ? "#f9fafb"
                                      : "#fcfdff",
                                  opacity: isTbd ? 0.65 : 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 3,
                                  }}
                                >
                                  <Flex align="center" gap={6}>
                                    <Tag
                                      color="blue"
                                      style={{
                                        fontSize: 10,
                                        margin: 0,
                                        padding: "0 5px",
                                        lineHeight: "18px",
                                      }}
                                    >
                                      C{match.court || 1}
                                    </Tag>
                                    <Text
                                      strong
                                      style={{
                                        fontSize: 13,
                                        color: isTbd ? "#9ca3af" : undefined,
                                      }}
                                    >
                                      {nameA} vs {nameB}
                                    </Text>
                                  </Flex>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    {match.winnerId
                                      ? `✅ ${teamLookup.get(match.winnerId)?.name} won ${match.scoreA}–${match.scoreB}`
                                      : isTbd
                                        ? "Waiting for previous round"
                                        : match.scoreA > 0 || match.scoreB > 0
                                          ? `🏸 ${match.scoreA}–${match.scoreB} in progress`
                                          : "Pending"}
                                  </Text>
                                </div>
                                <Button
                                  type={match.winnerId ? "default" : "primary"}
                                  size="small"
                                  disabled={isTbd}
                                  onClick={() => handleOpenMatch(match.id)}
                                  style={{
                                    alignSelf: isMobile ? "flex-end" : "auto",
                                  }}
                                >
                                  {match.winnerId ? "Edit" : "Score"}
                                </Button>
                              </div>
                            );
                          })}
                        </Space>
                      </div>
                    ));
                })()}
            </Card>
          )}

          {/* Match page */}
          {activeTab === "match" && activeTournament && (
            <Card
              styles={{ body: { padding: "14px 16px" } }}
              style={{
                border: "1px solid rgba(37,99,235,0.1)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
                borderRadius: 18,
              }}
            >
              <Title level={4} style={{ marginTop: 0 }}>
                Match Scoring
              </Title>
              {!selectedMatch && (
                <Space direction="vertical">
                  <Text type="secondary">
                    Choose a fixture first to enter score.
                  </Text>
                  <Button onClick={() => setActiveTab("fixtures")}>
                    Go to Fixtures
                  </Button>
                </Space>
              )}
              {selectedMatch && (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Flex
                    justify="space-between"
                    align="center"
                    style={{ padding: "0 4px" }}
                  >
                    <Text strong>
                      {teamLookup.get(selectedMatch.teamAId)?.name}
                    </Text>
                    <Text type="secondary">vs</Text>
                    <Text strong>
                      {teamLookup.get(selectedMatch.teamBId)?.name}
                    </Text>
                  </Flex>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      className={`counter-btn${isServingA ? " is-serving" : ""}`}
                      type="button"
                      disabled={selectedMatch.winnerId !== null}
                      onClick={() =>
                        updateMatchScore(
                          selectedMatch.id,
                          selectedMatch.scoreA + 1,
                          selectedMatch.scoreB,
                        )
                      }
                      style={{ flex: 1 }}
                    >
                      <span
                        className="serve-chip"
                        style={{
                          visibility: isServingA ? "visible" : "hidden",
                        }}
                      >
                        <ShuttleIcon size={14} /> Serving
                      </span>
                      <span className="counter-name">
                        {teamLookup.get(selectedMatch.teamAId)?.name}
                      </span>
                      <span className="counter-score">
                        {selectedMatch.scoreA}
                      </span>
                    </button>
                    <button
                      className={`counter-btn${isServingB ? " is-serving" : ""}`}
                      type="button"
                      disabled={selectedMatch.winnerId !== null}
                      onClick={() =>
                        updateMatchScore(
                          selectedMatch.id,
                          selectedMatch.scoreA,
                          selectedMatch.scoreB + 1,
                        )
                      }
                      style={{ flex: 1 }}
                    >
                      <span
                        className="serve-chip"
                        style={{
                          visibility: isServingB ? "visible" : "hidden",
                        }}
                      >
                        <ShuttleIcon size={14} /> Serving
                      </span>
                      <span className="counter-name">
                        {teamLookup.get(selectedMatch.teamBId)?.name}
                      </span>
                      <span className="counter-score">
                        {selectedMatch.scoreB}
                      </span>
                    </button>
                  </div>
                  {!selectedMatch.winnerId &&
                    selectedMatch.scoreA === 0 &&
                    selectedMatch.scoreB === 0 && (
                      <Flex align="center" gap="small" wrap="wrap">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          First serve:
                        </Text>
                        <Button
                          size="small"
                          type={isServingA ? "primary" : "default"}
                          onClick={() =>
                            handleSetServe(
                              selectedMatch.id,
                              selectedMatch.teamAId,
                            )
                          }
                        >
                          {teamLookup.get(selectedMatch.teamAId)?.name}
                        </Button>
                        <Button
                          size="small"
                          type={isServingB ? "primary" : "default"}
                          onClick={() =>
                            handleSetServe(
                              selectedMatch.id,
                              selectedMatch.teamBId,
                            )
                          }
                        >
                          {teamLookup.get(selectedMatch.teamBId)?.name}
                        </Button>
                      </Flex>
                    )}
                  <Flex
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap="small"
                  >
                    <Button onClick={() => resetMatch(selectedMatch.id)}>
                      Reset
                    </Button>
                    <Text>
                      {selectedMatch.winnerId
                        ? `Winner: ${teamLookup.get(selectedMatch.winnerId)?.name}`
                        : "In progress"}
                    </Text>
                    {selectedMatch.scoreA === 20 &&
                      selectedMatch.scoreB === 20 && (
                        <Tag color="green">Golden Point: next point wins</Tag>
                      )}
                  </Flex>
                </Space>
              )}
            </Card>
          )}

          {/* Standings page */}
          {activeTab === "standings" && activeTournament && (
            <Card
              styles={{ body: { padding: "14px 16px" } }}
              style={{
                border: "1px solid rgba(37,99,235,0.1)",
                boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
                borderRadius: 18,
              }}
            >
              <Flex
                justify="space-between"
                align="center"
                style={{ marginBottom: 8 }}
              >
                <Title level={4} style={{ margin: 0 }}>
                  Standings
                </Title>
                {(activeTournament.format || "league") !== "knockout" && (
                  <Tag>Win = 2 pts</Tag>
                )}
              </Flex>
              {(activeTournament.format || "league") === "knockout" ? (
                <Text type="secondary">
                  Standings apply to League format only. Follow the bracket in
                  the Draw tab.
                </Text>
              ) : null}
              {(activeTournament.format || "league") !== "knockout" && (
                <Table
                  dataSource={standings.map((entry, idx) => ({
                    ...entry,
                    key: entry.id,
                    rank: idx + 1,
                  }))}
                  columns={[
                    { title: "Rank", dataIndex: "rank", width: 60 },
                    { title: "Team", dataIndex: "name" },
                    { title: "P", dataIndex: "played", width: 50 },
                    { title: "W", dataIndex: "wins", width: 50 },
                    { title: "L", dataIndex: "losses", width: 50 },
                    { title: "Pts", dataIndex: "points", width: 60 },
                    { title: "WR%", dataIndex: "winRate", width: 70 },
                    { title: "TB", dataIndex: "tieHint", width: 80 },
                  ]}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              )}
            </Card>
          )}
        </div>

        {/* Mobile bottom nav — iOS glass */}
        {isMobile && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(248,250,255,0.88)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              borderTop: "0.5px solid rgba(37,99,235,0.15)",
              padding: "6px 8px 12px",
              display: "flex",
              gap: 4,
              zIndex: 20,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "6px 4px",
                  background:
                    activeTab === tab.key
                      ? "rgba(37,99,235,0.12)"
                      : "transparent",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  color: activeTab === tab.key ? "#2563eb" : "#94a3b8",
                  transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    letterSpacing: "0.2px",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}

export default App;
