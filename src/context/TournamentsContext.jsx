import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createTournament, getNextTournamentId, b64dec } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Storage: GitHub Gist (no repo commit spam)
// - Data lives in a private Gist as "tournaments.json"
// - Gist ID is bootstrapped from data/gist-id.json in the repo (one-time)
// - PATCH /gists/:id → no SHA required, no 409 conflicts, no commit per save
// ---------------------------------------------------------------------------
const GH_API = 'https://api.github.com';
const REPO = 'nikhilseepana/badminton-tournament';
const GIST_BOOTSTRAP = `${GH_API}/repos/${REPO}/contents/data/gist-id.json`;
const GIST_FILE = 'tournaments.json';
const GIST_ID_KEY = 'badtour_gist_id';

// ---------------------------------------------------------------------------
// Match-level merge: pick whichever version of a match has more progress.
// This lets two scorers update different matches without overwriting each other.
// ---------------------------------------------------------------------------
function mergeMatch(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  if (remote.winnerId && !local.winnerId) return remote;
  if (local.winnerId && !remote.winnerId) return local;
  // Both finished or both unfinished — prefer higher total score (more recent)
  return (remote.scoreA + remote.scoreB) > (local.scoreA + local.scoreB) ? remote : local;
}

function mergeTournaments(local, remote) {
  const remoteById = Object.fromEntries(remote.map((t) => [t.id, t]));
  const localIds = new Set(local.map((t) => t.id));

  const merged = local.map((lt) => {
    const rt = remoteById[lt.id];
    if (!rt) return lt; // only exists locally

    // ── Setup phase: no fixtures yet ──────────────────────────────────────
    // Trust local completely. The user is still adding teams/players and the
    // remote may be stale. Overwriting here causes teams to disappear.
    if (lt.matches.length === 0) return lt;

    // ── Active/completed: merge only match scores ─────────────────────────
    // Keep teams, name, format, courts from local (locked anyway once ongoing).
    // Only blend in remote match progress so two scorers stay in sync.
    const remoteMatchById = Object.fromEntries(rt.matches.map((m) => [m.id, m]));
    const mergedMatches = lt.matches.map((lm) => mergeMatch(lm, remoteMatchById[lm.id]));
    return { ...lt, matches: mergedMatches };
  });

  // Pull in tournaments that exist remotely but not locally (added by someone else)
  remote.forEach((rt) => { if (!localIds.has(rt.id)) merged.push(rt); });
  return merged.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------

const TournamentsCtx = createContext(null);

export function TournamentsProvider({ children }) {
  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem('badtour_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [createTournament(1, 'Summer Smash Cup', [])];
  });
  const [githubToken, setGithubToken] = useState(
    () => localStorage.getItem('badtour_gh_token') || import.meta.env.VITE_GH_TOKEN || ''
  );
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Refs so async callbacks always see fresh values without stale closures
  const tokenRef = useRef(githubToken);
  const tournamentsRef = useRef(tournaments);
  useEffect(() => { tokenRef.current = githubToken; }, [githubToken]);
  useEffect(() => { tournamentsRef.current = tournaments; }, [tournaments]);

  const gistIdRef = useRef(localStorage.getItem(GIST_ID_KEY) || '');

  const autoPushTimer = useRef(null);
  const clearStatusTimer = useRef(null);
  const isPushing = useRef(false); // guard against overlapping pushes

  // Persist deleted tournament IDs so the merge never re-adds them after a poll
  const deletedIdsRef = useRef(
    new Set(JSON.parse(localStorage.getItem('badtour_deleted') || '[]'))
  );
  function markDeleted(id) {
    deletedIdsRef.current.add(id);
    try { localStorage.setItem('badtour_deleted', JSON.stringify([...deletedIdsRef.current])); } catch {}
  }
  function safeRemote(remoteTournaments) {
    return remoteTournaments.filter((rt) => !deletedIdsRef.current.has(rt.id));
  }

  function showStatus(msg) {
    setSyncStatus(msg);
    clearTimeout(clearStatusTimer.current);
    if (msg.startsWith('✅')) {
      clearStatusTimer.current = setTimeout(() => setSyncStatus(''), 3000);
    }
  }

  // Save to localStorage + schedule auto-push. Does NOT trigger poll.
  // Only push when at least one tournament has fixtures — never push setup-phase data.
  function persist(next) {
    try { localStorage.setItem('badtour_data', JSON.stringify(next)); } catch {}
    if (next.some((t) => t.matches.length > 0)) scheduleAutoPush(next);
  }

  // Update state + localStorage silently (used by poll merge, no re-push).
  function applyRemote(next) {
    setTournaments(next);
    try { localStorage.setItem('badtour_data', JSON.stringify(next)); } catch {}
  }

  // ── Bootstrap: load gist ID from repo if not already cached ─────────────
  useEffect(() => {
    if (gistIdRef.current) return; // already have it
    const token = tokenRef.current;
    if (!token?.trim()) return;
    fetch(GIST_BOOTSTRAP, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        if (!f) return;
        try {
          const { gistId } = JSON.parse(b64dec(f.content));
          if (gistId) { gistIdRef.current = gistId; localStorage.setItem(GIST_ID_KEY, gistId); }
        } catch {}
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  function ghHeaders(token) {
    return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
  }

  function gistContent(data) {
    return JSON.stringify({ tournaments: data, savedAt: new Date().toISOString() }, null, 2);
  }

  function parseGist(gistJson) {
    const raw = gistJson?.files?.[GIST_FILE]?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.tournaments || []);
  }

  // Write gist ID back to the repo once (so other devices can discover it)
  async function saveGistIdToRepo(gistId, token) {
    const hdrs = ghHeaders(token);
    const getRes = await fetch(GIST_BOOTSTRAP, { headers: hdrs });
    let sha;
    if (getRes.ok) { try { sha = (await getRes.json()).sha; } catch {} }
    const content = btoa(JSON.stringify({ gistId }));
    await fetch(GIST_BOOTSTRAP, {
      method: 'PUT', headers: hdrs,
      body: JSON.stringify({ message: 'badtour: init gist storage', content, ...(sha ? { sha } : {}) }),
    });
  }

  // ── Push: fetch gist → merge → PATCH (no SHA, no 409 dance) ─────────────
  async function doPush(data, token) {
    if (!token?.trim() || isPushing.current) return;
    isPushing.current = true;
    setSyncing(true); showStatus('⏳ Saving...');

    try {
      const hdrs = ghHeaders(token);
      let dataToSend = data;
      const gistId = gistIdRef.current;

      if (gistId) {
        // Merge remote gist content before writing
        const getRes = await fetch(`${GH_API}/gists/${gistId}`, { headers: hdrs });
        if (getRes.ok) {
          try {
            const remote = parseGist(await getRes.json());
            if (remote) { dataToSend = mergeTournaments(data, safeRemote(remote)); applyRemote(dataToSend); }
          } catch {}
        }
        const patchRes = await fetch(`${GH_API}/gists/${gistId}`, {
          method: 'PATCH', headers: hdrs,
          body: JSON.stringify({ files: { [GIST_FILE]: { content: gistContent(dataToSend) } } }),
        });
        showStatus(patchRes.ok ? '✅ Saved' : `❌ GitHub error ${patchRes.status}`);
      } else {
        // First push ever — create a new public gist (public so share URLs work)
        const postRes = await fetch(`${GH_API}/gists`, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ description: 'BadTour data', public: true, files: { [GIST_FILE]: { content: gistContent(data) } } }),
        });
        if (postRes.ok) {
          const gist = await postRes.json();
          gistIdRef.current = gist.id;
          localStorage.setItem(GIST_ID_KEY, gist.id);
          await saveGistIdToRepo(gist.id, token).catch(() => {});
          showStatus('✅ Saved');
        } else {
          showStatus(`❌ Could not create storage (${postRes.status})`);
        }
      }
    } catch (e) { showStatus(`❌ ${e.message}`); }

    isPushing.current = false;
    setSyncing(false);
  }

  function scheduleAutoPush(data) {
    clearTimeout(autoPushTimer.current);
    autoPushTimer.current = setTimeout(() => doPush(data, tokenRef.current), 1500);
  }

  // ── Background poll: silently merge gist into local every 15s ───────────
  async function silentPoll() {
    const token = tokenRef.current;
    const gistId = gistIdRef.current;
    if (!token?.trim() || !gistId || isPushing.current) return;
    try {
      const res = await fetch(`${GH_API}/gists/${gistId}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const remote = parseGist(await res.json());
      if (!remote) return;
      const merged = mergeTournaments(tournamentsRef.current, safeRemote(remote));
      if (JSON.stringify(merged) !== JSON.stringify(tournamentsRef.current)) applyRemote(merged);
    } catch { /* silent */ }
  }

  useEffect(() => {
    const id = setInterval(silentPoll, 3000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ─────────────────────────────────────────────────────────────
  function updateTournament(id, updater) {
    setTournaments((prev) => {
      const next = prev.map((t) => (t.id === id ? updater(t) : t));
      persist(next);
      return next;
    });
  }

  function createNewTournament(name, format, numGroups = 2, groupFormat = 'league') {
    const nextId = getNextTournamentId(tournaments);
    const t = createTournament(nextId, name, [], 2, format, numGroups, groupFormat);
    setTournaments((prev) => {
      const next = [...prev, t];
      persist(next);
      return next;
    });
    return nextId;
  }

  function renameTournament(id, name) {
    updateTournament(id, (t) => ({ ...t, name }));
  }

  function archiveTournament(id) {
    updateTournament(id, (t) => ({ ...t, archived: true }));
  }

  function unarchiveTournament(id) {
    updateTournament(id, (t) => ({ ...t, archived: false }));
  }

  async function deleteTournament(id) {
    markDeleted(id);
    const next = tournamentsRef.current.filter((x) => x.id !== id);
    setTournaments(next);
    try { localStorage.setItem('badtour_data', JSON.stringify(next)); } catch {}
    // Push immediately (don't debounce) so GitHub reflects the delete before next poll
    clearTimeout(autoPushTimer.current);
    doPush(next, tokenRef.current);
  }

  // Manual push — cancels pending auto-push and pushes immediately
  async function handlePushToGitHub() {
    if (!githubToken.trim()) { showStatus('❌ Enter a GitHub token first'); return; }
    clearTimeout(autoPushTimer.current);
    await doPush(tournamentsRef.current, githubToken);
  }

  // Manual pull — fetches gist and merges into local
  async function handlePullFromGitHub() {
    if (!githubToken.trim()) { showStatus('❌ No token'); return; }
    const gistId = gistIdRef.current;
    if (!gistId) { showStatus('❌ No data yet — push first'); return; }
    setSyncing(true); showStatus('⏳ Loading...');
    try {
      const res = await fetch(`${GH_API}/gists/${gistId}`, {
        headers: ghHeaders(githubToken),
      });
      if (!res.ok) { showStatus('❌ Could not reach storage'); setSyncing(false); return; }
      const remote = parseGist(await res.json());
      if (!remote) { showStatus('❌ No data in gist'); setSyncing(false); return; }
      const merged = mergeTournaments(tournamentsRef.current, safeRemote(remote));
      applyRemote(merged);
      showStatus('✅ Synced');
    } catch (e) { showStatus(`❌ ${e.message}`); }
    setSyncing(false);
  }

  return (
    <TournamentsCtx.Provider value={{
      tournaments,
      githubToken, setGithubToken,
      syncStatus, syncing,
      updateTournament,
      createNewTournament,
      renameTournament,
      deleteTournament,
      archiveTournament,
      unarchiveTournament,
      handlePushToGitHub,
      handlePullFromGitHub,
    }}>
      {children}
    </TournamentsCtx.Provider>
  );
}

export function useTournaments() {
  return useContext(TournamentsCtx);
}
