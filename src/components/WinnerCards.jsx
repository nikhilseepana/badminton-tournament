export default function WinnerCards({
  tournament,
  champion,
  runnerUp,
  onWinnerPhoto,
  onRunnerUpPhoto,
  onShareChampion,
  onShareRunnerUp,
}) {
  if (!champion) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Champion card */}
      <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', marginBottom: 10 }}>
        <div style={{ background: 'linear-gradient(160deg, #1a3a6b 0%, #0d2247 55%, #071530 100%)', padding: '28px 20px 24px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,215,0,0.12) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,215,0,0.65)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 14 }}>{tournament?.name}</div>
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16, filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.7)) drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>🏆</div>
          {tournament?.winnerPhoto && (
            <div style={{ display: 'inline-block', marginBottom: 16 }}>
              <img src={tournament.winnerPhoto} alt="champion" style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: '50%', border: '5px solid #fbbf24', boxShadow: '0 0 0 8px rgba(251,191,36,0.18), 0 8px 32px rgba(0,0,0,0.4)' }} />
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,215,0,0.55)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 6 }}>🥇 Champion</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.5px', textShadow: '0 2px 16px rgba(251,191,36,0.5)' }}>{champion?.name}</div>
        </div>
        <div style={{ background: '#071530', padding: '10px 16px', display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', display: 'block' }}>
            📷 {tournament?.winnerPhoto ? 'Change Photo' : 'Add Team Photo'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onWinnerPhoto} />
          </label>
          <button onClick={() => onShareChampion(champion, runnerUp)} style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            📤 Share
          </button>
        </div>
      </div>

      {/* Runner-up card */}
      <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}>
        <div style={{ background: 'linear-gradient(160deg, #1e293b 0%, #182436 55%, #0f1a28 100%)', padding: '24px 20px 20px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 14, filter: 'drop-shadow(0 0 12px rgba(148,163,184,0.5)) drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}>🥈</div>
          {tournament?.runnerUpPhoto && (
            <div style={{ display: 'inline-block', marginBottom: 14 }}>
              <img src={tournament.runnerUpPhoto} alt="runner-up" style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: '50%', border: '4px solid #64748b', boxShadow: '0 0 0 7px rgba(100,116,139,0.18), 0 8px 28px rgba(0,0,0,0.4)' }} />
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.55)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 6 }}>Runner-up</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#cbd5e1', letterSpacing: '-0.3px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{runnerUp?.name || '–'}</div>
        </div>
        <div style={{ background: '#0f1a28', padding: '10px 16px', display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '9px 0', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'block' }}>
            📷 {tournament?.runnerUpPhoto ? 'Change Photo' : 'Add Team Photo'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onRunnerUpPhoto} />
          </label>
          <button onClick={() => onShareRunnerUp(champion, runnerUp)} style={{ flex: 1, background: 'linear-gradient(135deg, #475569, #334155)', border: 'none', borderRadius: 12, padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
}
