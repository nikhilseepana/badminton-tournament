import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GiShuttlecock } from 'react-icons/gi';
import { FiRefreshCw, FiUsers, FiCalendar, FiBarChart2, FiUserPlus } from 'react-icons/fi';

const GH_API = 'https://api.github.com';
const REPO = 'nikhilseepana/badminton-tournament';
const GIST_BOOTSTRAP = `${GH_API}/repos/${REPO}/contents/data/gist-id.json`;
const GIST_FILE = 'tournaments.json';
const GIST_ID_KEY = 'badtour_gist_id';

function b64dec(s) {
  const raw = atob(s.replace(/\s/g, ''));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function getGroupLabel(idx) {
  return `Group ${String.fromCharCode(65 + idx)}`;
}

function computeStandings(teams, matches) {
  const rows = Object.fromEntries(teams.map(t => [t.id, { team: t, played: 0, won: 0, lost: 0, scored: 0, against: 0 }]));
  matches.forEach(m => {
    if (!m.winnerId) return;
    if (rows[m.teamAId]) { rows[m.teamAId].played++; rows[m.teamAId].scored += m.scoreA; rows[m.teamAId].against += m.scoreB; }
    if (rows[m.teamBId]) { rows[m.teamBId].played++; rows[m.teamBId].scored += m.scoreB; rows[m.teamBId].against += m.scoreA; }
    if (rows[m.winnerId]) rows[m.winnerId].won++;
    const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
    if (rows[loserId]) rows[loserId].lost++;
  });
  return Object.values(rows).sort((a, b) => {
    const pa = a.won * 2, pb = b.won * 2;
    if (pb !== pa) return pb - pa;
    return (b.scored - b.against) - (a.scored - a.against);
  });
}

export default function ViewPage() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState('draw');
  const [joinP1, setJoinP1] = useState('');
  const [joinP2, setJoinP2] = useState('');
  const [joinTeam, setJoinTeam] = useState('');
  const [joinEdited, setJoinEdited] = useState(false);
  const [joinResult, setJoinResult] = useState(null); // 'sent' | 'link'
  const [joinLink, setJoinLink] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Try localStorage first (same device as owner)
      const saved = localStorage.getItem('badtour_data');
      if (saved) {
        const all = JSON.parse(saved);
        const t = all.find(x => x.id === tournamentId);
        if (t) { setTournament(t); setLastUpdated(new Date()); setLoading(false); return; }
      }

      // Fetch from public Gist (cross-device sharing)
      let gistId = localStorage.getItem(GIST_ID_KEY);
      if (!gistId) {
        const r = await fetch(GIST_BOOTSTRAP);
        if (r.ok) {
          const file = await r.json();
          try { ({ gistId } = JSON.parse(b64dec(file.content))); } catch {}
        }
      }
      if (!gistId) { setError('Could not find tournament storage. Share URL may be invalid.'); setLoading(false); return; }

      const res = await fetch(`${GH_API}/gists/${gistId}`);
      if (!res.ok) { setError('Could not load data. The tournament may not be publicly shared yet.'); setLoading(false); return; }
      const gist = await res.json();
      const raw = gist?.files?.[GIST_FILE]?.content;
      if (!raw) { setError('No data found.'); setLoading(false); return; }
      const parsed = JSON.parse(raw);
      const all = Array.isArray(parsed) ? parsed : (parsed.tournaments || []);
      const t = all.find(x => x.id === tournamentId);
      if (!t) { setError('Tournament not found.'); setLoading(false); return; }
      setTournament(t);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#eff6ff,#f8faff,#f0fdf4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center' }}>
        <GiShuttlecock size={36} color="#2563eb" />
      </div>
      <div style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading tournament…</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#eff6ff,#f8faff,#f0fdf4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ color: '#0f172a', fontSize: 16, fontWeight: 700 }}>Could not load tournament</div>
      <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', maxWidth: 300 }}>{error}</div>
      <Link to="/" style={{ marginTop: 8, padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>Back to Home</Link>
    </div>
  );

  const { teams = [], matches = [], name, format = 'league', numGroups = 2, groupAssignments = {} } = tournament;
  const teamLookup = new Map(teams.map(t => [t.id, t]));
  const doneCount = matches.filter(m => m.winnerId).length;
  const fmt = format;
  const fmtIcon = fmt === 'knockout' ? '🥊' : fmt === 'groups' ? '👥' : '🔄';
  const fmtLabel = fmt === 'knockout' ? 'Knockout' : fmt === 'groups' ? `Groups ×${numGroups}` : 'League';
  const statusLabel = matches.length === 0 ? 'Upcoming' : doneCount === matches.length ? 'Completed' : 'Live 🔴';
  const statusStyle = matches.length === 0
    ? { bg: '#eff6ff', color: '#2563eb' }
    : doneCount === matches.length
      ? { bg: '#f0fdf4', color: '#16a34a' }
      : { bg: '#fff7ed', color: '#ea580c' };

  // Standings data
  const globalStandings = computeStandings(teams, matches);
  const groupStandings = fmt === 'groups'
    ? Array.from({ length: numGroups }, (_, gi) => {
        const gTeamIds = new Set(Object.entries(groupAssignments).filter(([, g]) => Number(g) === gi).map(([id]) => Number(id)));
        const gTeams = teams.filter(t => gTeamIds.has(t.id));
        const gMatches = matches.filter(m => m.group === gi);
        return { label: getGroupLabel(gi), teams: computeStandings(gTeams, gMatches) };
      })
    : null;

  // Playoff results: find final + semis
  const isCompleted = matches.length > 0 && doneCount === matches.length;
  const playoffAll = matches.filter(m => m.phase === 'playoff');
  const finalMatch = playoffAll.find(m => m.teamAFrom && m.teamBFrom)
    || (playoffAll.length === 0 && matches.length > 0
        ? matches.filter(m => m.teamAId && m.teamBId).reduce((b, m) => m.round > (b?.round || 0) ? m : b, null)
        : null);
  const sfMatches = playoffAll.filter(m => m !== finalMatch && m.winnerId);
  const champion = finalMatch?.winnerId ? teamLookup.get(finalMatch.winnerId) : null;
  const runnerUp = finalMatch?.winnerId
    ? teamLookup.get(finalMatch.teamAId === finalMatch.winnerId ? finalMatch.teamBId : finalMatch.teamAId)
    : null;
  const semiFinalLosers = sfMatches.map(m => teamLookup.get(m.teamAId === m.winnerId ? m.teamBId : m.teamAId)).filter(Boolean);

  // Draw data
  const groupMatches = fmt === 'groups' ? matches.filter(m => m.phase === 'group') : [];
  const playoffMatches = fmt === 'groups' ? matches.filter(m => m.phase === 'playoff') : matches;
  const roundGroups = fmt === 'groups'
    ? Array.from({ length: numGroups }, (_, gi) => ({
        label: getGroupLabel(gi),
        rounds: [...new Set(groupMatches.filter(m => m.group === gi).map(m => m.round))].sort((a, b) => a - b)
          .map(round => ({ round, matches: groupMatches.filter(m => m.group === gi && m.round === round) })),
      }))
    : null;
  const simpleRounds = fmt !== 'groups'
    ? [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
        .map(round => ({ round, matches: matches.filter(m => m.round === round) }))
    : null;

  const TABS = [
    { key: 'draw', icon: <FiCalendar size={13} />, label: 'Draw' },
    { key: 'table', icon: <FiBarChart2 size={13} />, label: 'Standings' },
    { key: 'teams', icon: <FiUsers size={13} />, label: 'Teams' },
    { key: 'join', icon: <FiUserPlus size={13} />, label: 'Join' },
  ];

  function handleJoinP1(v) { setJoinP1(v); if (!joinEdited) setJoinTeam(v && joinP2 ? `${v} & ${joinP2}` : v || joinP2 || ''); }
  function handleJoinP2(v) { setJoinP2(v); if (!joinEdited) setJoinTeam(joinP1 && v ? `${joinP1} & ${v}` : joinP1 || v || ''); }

  function handleJoinSubmit(e) {
    e.preventDefault();
    const p1 = joinP1.trim(), p2 = joinP2.trim(), tName = joinTeam.trim() || `${p1} & ${p2}`;
    if (!p1 || !p2) return;
    // Try writing to localStorage (same device as admin)
    try {
      const saved = localStorage.getItem('badtour_data');
      if (saved) {
        const all = JSON.parse(saved);
        const idx = all.findIndex(t => t.id === tournamentId);
        if (idx !== -1) {
          all[idx] = { ...all[idx], teamRequests: [...(all[idx].teamRequests || []), { id: Date.now(), player1: p1, player2: p2, teamName: tName, status: 'pending', createdAt: new Date().toISOString() }] };
          localStorage.setItem('badtour_data', JSON.stringify(all));
          setJoinResult('sent');
          return;
        }
      }
    } catch {}
    // Cross-device: generate a link for the admin to open
    const base = `${window.location.origin}${window.location.pathname}`;
    const link = `${base}#/t/${tournamentId}/teams?joinp1=${encodeURIComponent(p1)}&joinp2=${encodeURIComponent(p2)}&jointeam=${encodeURIComponent(tName)}`;
    setJoinLink(link);
    setJoinResult('link');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#eff6ff,#f8faff,#f0fdf4)', fontFamily: "'SF Pro Display','Avenir Next','Segoe UI',sans-serif", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(37,99,235,0.1)', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GiShuttlecock size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', letterSpacing: '-0.3px' }}>BadTour</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</span>
          <button onClick={loadData} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tournament info banner */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ background: 'white', borderRadius: 18, padding: '16px', border: '1px solid #e8eef6', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: fmt === 'knockout' ? 'linear-gradient(135deg,#ff6b35,#f43f5e)' : fmt === 'groups' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {fmtIcon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {fmtLabel} · {teams.length} teams
                <span style={{ padding: '2px 8px', borderRadius: 99, background: statusStyle.bg, color: statusStyle.color, fontWeight: 700, fontSize: 10 }}>{statusLabel}</span>
              </div>
            </div>
          </div>
          {matches.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{doneCount}/{matches.length} matches played</span>
                <span style={{ fontSize: 11, color: doneCount === matches.length ? '#16a34a' : '#2563eb', fontWeight: 700 }}>{Math.round(doneCount / matches.length * 100)}%</span>
              </div>
              <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(doneCount / matches.length * 100)}%`, background: doneCount === matches.length ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#2563eb,#60a5fa)', borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
          <div style={{ marginTop: 10, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            👁 View-only mode · Updates every 10 seconds
          </div>
        </div>

        {/* Completed: Champion + Runner-up + Semis podium */}
        {isCompleted && champion && (
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', marginBottom: 14 }}>
            {/* Champion banner */}
            <div style={{ background: 'linear-gradient(160deg,#1a3a6b 0%,#0d2247 55%,#071530 100%)', padding: '24px 20px 20px', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,215,0,0.12) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,215,0,0.65)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10 }}>{name}</div>
              <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12, filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.7))' }}>🏆</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,215,0,0.55)', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>🥇 Champion</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(251,191,36,0.5)' }}>{champion.name}</div>
              {finalMatch && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,215,0,0.5)', fontWeight: 600 }}>
                  Final: {teamLookup.get(finalMatch.teamAId)?.name} {finalMatch.scoreA} – {finalMatch.scoreB} {teamLookup.get(finalMatch.teamBId)?.name}
                </div>
              )}
            </div>
            {/* Runner-up */}
            {runnerUp && (
              <div style={{ background: 'linear-gradient(160deg,#1e2936 0%,#18243a 55%,#0f1a28 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 32, filter: 'drop-shadow(0 0 8px rgba(148,163,184,0.4))' }}>🥈</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Runner-up</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#cbd5e1' }}>{runnerUp.name}</div>
                </div>
              </div>
            )}
            {/* Semis */}
            {semiFinalLosers.length > 0 && (
              <div style={{ background: '#0f1a28', padding: '10px 20px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Semifinals</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {sfMatches.map(m => (
                    <div key={m.id} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>{teamLookup.get(m.winnerId)?.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>
                        def. {teamLookup.get(m.teamAId === m.winnerId ? m.teamBId : m.teamAId)?.name} · {m.scoreA}–{m.scoreB}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'white', borderRadius: 14, padding: 4, border: '1px solid #e8eef6', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {TABS.map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: tab === key ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'transparent', color: tab === key ? '#fff' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* DRAW TAB */}
        {tab === 'draw' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>No fixtures generated yet.</div>}

            {/* Groups format */}
            {fmt === 'groups' && roundGroups?.map(({ label: gLabel, rounds }) => (
              <div key={gLabel} style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700, fontSize: 13 }}>{gLabel}</div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rounds.map(({ round, matches: rm }) => (
                    <div key={round}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>Round {round}</div>
                      {rm.map(m => <MatchRow key={m.id} m={m} teamLookup={teamLookup} />)}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Playoffs */}
            {fmt === 'groups' && playoffMatches.length > 0 && (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fde68a', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, fontSize: 13 }}>🏆 Playoffs</div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...new Set(playoffMatches.map(m => m.round))].sort((a, b) => a - b).map(round => (
                    <div key={round}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                        {playoffMatches.filter(m => m.round === round)[0]?.teamAId == null ? '🏆 Final' : round === Math.max(...playoffMatches.map(m => m.round)) - 0 ? '🏆 Final' : 'Semifinals'}
                      </div>
                      {playoffMatches.filter(m => m.round === round).map(m => <MatchRow key={m.id} m={m} teamLookup={teamLookup} />)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* League / Knockout */}
            {fmt !== 'groups' && simpleRounds?.map(({ round, matches: rm }) => (
              <div key={round} style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 12, color: '#475569' }}>Round {round}</div>
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rm.map(m => <MatchRow key={m.id} m={m} teamLookup={teamLookup} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STANDINGS TAB */}
        {tab === 'table' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fmt === 'groups' && groupStandings?.map(({ label, teams: gts }) => (
              <div key={label} style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700, fontSize: 13 }}>{label}</div>
                <StandingsTable rows={gts} />
              </div>
            ))}
            {fmt !== 'groups' && (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <StandingsTable rows={globalStandings} />
              </div>
            )}
            {teams.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>No teams yet.</div>}
          </div>
        )}

        {/* TEAMS TAB */}
        {tab === 'teams' && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {teams.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No teams yet.</div>}
            {teams.map((t, i) => {
              const gIdx = groupAssignments[t.id] != null ? Number(groupAssignments[t.id]) : null;
              return (
                <div key={t.id} style={{ padding: '12px 16px', borderBottom: i < teams.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.name}</div>
                    {t.players?.length > 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{t.players.join(' · ')}</div>}
                  </div>
                  {gIdx != null && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#f3e8ff', color: '#7c3aed' }}>{getGroupLabel(gIdx)}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* JOIN TAB */}
        {tab === 'join' && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8eef6', padding: '18px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>🙋 Request to Join</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Enter your names and submit — the admin will see and approve your request.</div>
            {joinResult === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#16a34a', marginBottom: 4 }}>Request sent!</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>The admin will see your request and approve it shortly.</div>
                <button onClick={() => { setJoinResult(null); setJoinP1(''); setJoinP2(''); setJoinTeam(''); setJoinEdited(false); }} style={{ padding: '8px 20px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>New Request</button>
              </div>
            ) : joinResult === 'link' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>Share this link with the admin</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Admin opens the link → your request appears instantly for approval.</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px', marginBottom: 10, wordBreak: 'break-all', fontSize: 10, color: '#475569', textAlign: 'left' }}>{joinLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(joinLink).catch(() => {}); }} style={{ padding: '8px 20px', borderRadius: 10, background: '#2563eb', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, marginRight: 8 }}>📋 Copy Link</button>
                <button onClick={() => { setJoinResult(null); setJoinP1(''); setJoinP2(''); setJoinTeam(''); setJoinEdited(false); }} style={{ padding: '8px 16px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Back</button>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={joinP1} onChange={e => handleJoinP1(e.target.value)} placeholder="Player 1 name" required style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                  <input value={joinP2} onChange={e => handleJoinP2(e.target.value)} placeholder="Player 2 name" required style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                </div>
                <input value={joinTeam} onChange={e => { setJoinTeam(e.target.value); setJoinEdited(true); }} placeholder="Team name (auto-filled)" style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', color: '#374151' }} />
                <button type="submit" disabled={!joinP1.trim() || !joinP2.trim()} style={{ padding: '11px', borderRadius: 12, background: joinP1.trim() && joinP2.trim() ? '#2563eb' : '#e2e8f0', border: 'none', color: joinP1.trim() && joinP2.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 14, cursor: joinP1.trim() && joinP2.trim() ? 'pointer' : 'not-allowed' }}>
                  Send Request
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchRow({ m, teamLookup }) {
  const tA = teamLookup.get(m.teamAId);
  const tB = teamLookup.get(m.teamBId);
  const done = m.winnerId !== null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 10, background: done ? '#f0fdf4' : '#f8fafc', border: `1px solid ${done ? '#86efac' : '#e2e8f0'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>C{m.court}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{done ? '✅ done' : 'pending'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span style={{ flex: 1, fontWeight: m.winnerId === m.teamAId ? 800 : 600, fontSize: 14, color: m.winnerId === m.teamAId ? '#16a34a' : '#0f172a' }}>{tA?.name ?? 'TBD'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#475569' : '#94a3b8', minWidth: 36, textAlign: 'center' }}>
          {done ? `${m.scoreA} – ${m.scoreB}` : 'vs'}
        </span>
        <span style={{ flex: 1, fontWeight: m.winnerId === m.teamBId ? 800 : 600, fontSize: 14, color: m.winnerId === m.teamBId ? '#16a34a' : '#0f172a', textAlign: 'right' }}>{tB?.name ?? 'TBD'}</span>
      </div>
    </div>
  );
}

function StandingsTable({ rows }) {
  return (
    <div>
      <div style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        <span style={{ flex: 1 }}>Team</span>
        <span style={{ width: 30, textAlign: 'center' }}>P</span>
        <span style={{ width: 30, textAlign: 'center' }}>W</span>
        <span style={{ width: 30, textAlign: 'center' }}>L</span>
        <span style={{ width: 30, textAlign: 'center' }}>Pts</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.team.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none', background: i < 2 ? (i === 0 ? '#fffbeb' : '#f0fdf4') : 'white' }}>
          <span style={{ width: 20, fontWeight: 700, fontSize: 12, color: i === 0 ? '#d97706' : i === 1 ? '#16a34a' : '#94a3b8' }}>{i + 1}</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.team.name}</span>
          <span style={{ width: 30, textAlign: 'center', fontSize: 13, color: '#475569' }}>{r.played}</span>
          <span style={{ width: 30, textAlign: 'center', fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{r.won}</span>
          <span style={{ width: 30, textAlign: 'center', fontSize: 13, color: '#ef4444' }}>{r.lost}</span>
          <span style={{ width: 30, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{r.won * 2}</span>
        </div>
      ))}
    </div>
  );
}
