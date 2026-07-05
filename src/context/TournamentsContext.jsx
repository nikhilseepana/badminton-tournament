import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createTournament, getNextTournamentId } from '../utils/helpers';
import {
  isSupabaseConfigured,
  saveRemoteTournaments,
  loadRemoteTournaments,
} from '../lib/remoteStore';

function migrateRemoveDefault(list) {
  return list.filter(
    (t) => !(t.id === 1 && t.name === 'Summer Smash Cup' && t.teams.length === 0 && t.matches.length === 0)
  );
}

const TournamentsCtx = createContext(null);
const LOCAL_KEY = 'gametribe_data';
const LEGACY_LOCAL_KEY = 'badtour_data';

export function TournamentsProvider({ children }) {
  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY) || localStorage.getItem(LEGACY_LOCAL_KEY);
      if (saved) {
        const migrated = migrateRemoveDefault(JSON.parse(saved));
        localStorage.setItem(LOCAL_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch {}
    return [];
  });
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const tournamentsRef = useRef(tournaments);
  useEffect(() => {
    tournamentsRef.current = tournaments;
  }, [tournaments]);

  const clearStatusTimer = useRef(null);
  const isPushing = useRef(false);
  const pendingPushRef = useRef(null);
  const lastRemoteUpdatedAtRef = useRef(null);

  function showStatus(msg) {
    setSyncStatus(msg);
    clearTimeout(clearStatusTimer.current);
    if (msg.startsWith('✅')) {
      clearStatusTimer.current = setTimeout(() => setSyncStatus(''), 3000);
    }
  }

  function persist(next) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {}
    doPush(next);
  }

  async function doPush(data) {
    if (!isSupabaseConfigured) return;
    if (isPushing.current) {
      pendingPushRef.current = data;
      return;
    }

    isPushing.current = true;
    setSyncing(true);
    showStatus('⏳ Saving...');

    try {
      const saved = await saveRemoteTournaments(data);
      if (saved.ok) {
        lastRemoteUpdatedAtRef.current = new Date().toISOString();
      }
      showStatus(saved.ok ? '✅ Saved' : `❌ ${saved.error}`);
    } catch (e) {
      showStatus(`❌ ${e.message}`);
    }

    isPushing.current = false;
    setSyncing(false);

    if (pendingPushRef.current) {
      const nextPayload = pendingPushRef.current;
      pendingPushRef.current = null;
      doPush(nextPayload);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      showStatus('⚠️ Supabase not configured (local mode)');
      return;
    }
    // Load from Supabase on startup and merge with localStorage
    showStatus('⏳ Loading...');
    setSyncing(true);
    loadRemoteTournaments().then((result) => {
      setSyncing(false);
      if (result.ok && result.tournaments.length > 0) {
        setTournaments(result.tournaments);
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(result.tournaments));
        } catch {}
        showStatus('✅ Loaded');
      } else if (!result.ok) {
        showStatus(`❌ ${result.error}`);
      } else {
        // Supabase is empty — push local data up
        const local = tournamentsRef.current;
        if (local.length > 0) doPush(local);
        else showStatus('');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateTournament(id, updater) {
    setTournaments((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...updater(t), updatedAt: new Date().toISOString() } : t));
      persist(next);
      return next;
    });
  }

  function createNewTournament(name, format, numGroups = 2, groupFormat = 'league') {
    const nextId = getNextTournamentId(tournamentsRef.current);
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

  function addTeamRequest(tournamentId, { player1, player2, teamName }) {
    updateTournament(tournamentId, (t) => ({
      ...t,
      teamRequests: [
        ...(t.teamRequests || []),
        { id: Date.now(), player1, player2, teamName, status: 'pending', createdAt: new Date().toISOString() },
      ],
    }));
  }

  function approveTeamRequest(tournamentId, requestId, newTeam) {
    updateTournament(tournamentId, (t) => ({
      ...t,
      teams: [...t.teams, newTeam],
      teamRequests: (t.teamRequests || []).map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)),
    }));
  }

  function rejectTeamRequest(tournamentId, requestId) {
    updateTournament(tournamentId, (t) => ({
      ...t,
      teamRequests: (t.teamRequests || []).map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)),
    }));
  }

  async function deleteTournament(id) {
    const next = tournamentsRef.current.filter((x) => x.id !== id);
    setTournaments(next);
    persist(next);
  }

  async function syncNow() {
    await doPush(tournamentsRef.current);
  }

  return (
    <TournamentsCtx.Provider
      value={{
        tournaments,
        syncStatus,
        syncing,
        updateTournament,
        createNewTournament,
        renameTournament,
        deleteTournament,
        archiveTournament,
        unarchiveTournament,
        addTeamRequest,
        approveTeamRequest,
        rejectTeamRequest,
        syncNow,
      }}
    >
      {children}
    </TournamentsCtx.Provider>
  );
}

export function useTournaments() {
  return useContext(TournamentsCtx);
}
