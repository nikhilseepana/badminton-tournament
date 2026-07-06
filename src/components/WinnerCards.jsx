import { useRef } from 'react';
import { toPng } from 'html-to-image';

function downloadCard(ref, filename) {
  if (!ref.current) return;
  toPng(ref.current, { cacheBust: true, pixelRatio: 3 })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    })
    .catch(console.error);
}

export default function WinnerCards({
  tournament,
  champion,
  runnerUp,
  onWinnerPhoto,
  onRunnerUpPhoto,
  onShareChampion,
  onShareRunnerUp,
}) {
  const championRef = useRef(null);
  const runnerUpRef = useRef(null);

  if (!champion) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Champion card */}
      <div style={{ borderRadius: 28, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(250,204,21,0.2)', marginBottom: 12 }}>
        <div ref={championRef} style={{ background: 'linear-gradient(160deg, #1a2a46 0%, #111f35 55%, #0b1527 100%)', padding: '40px 24px 32px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          {/* Gold shimmer overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(250,204,21,0.04) 0%, transparent 50%, rgba(250,204,21,0.04) 100%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(250,204,21,0.7)', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: 16 }}>{tournament?.name}</div>
          <div style={{ fontSize: 88, lineHeight: 1, marginBottom: 20, filter: 'drop-shadow(0 0 28px rgba(250,204,21,0.5)) drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>🥇</div>
          {tournament?.winnerPhoto && (
            <div style={{ display: 'inline-block', marginBottom: 20, borderRadius: 20, overflow: 'hidden', border: '4px solid rgba(250,204,21,0.6)', boxShadow: '0 0 0 8px rgba(250,204,21,0.1), 0 12px 40px rgba(0,0,0,0.5)' }}>
              <img src={tournament.winnerPhoto} alt="champion" style={{ width: 260, height: 200, objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(250,204,21,0.8)', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: 8 }}>🥇 Champions</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px', textShadow: '0 2px 20px rgba(250,204,21,0.3)', lineHeight: 1.2 }}>{champion?.name}</div>
          {tournament?.prizeMoney && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(250,204,21,0.6)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 6 }}>Prize Money</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,rgba(250,204,21,0.22),rgba(202,138,4,0.18))', border: '1px solid rgba(250,204,21,0.45)', borderRadius: 999, padding: '7px 20px' }}>
                <span style={{ fontSize: 16 }}>💰</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fde047', letterSpacing: 0.5 }}>{tournament.prizeMoney}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', padding: '12px 16px', display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', display: 'block' }}>
            📷 {tournament?.winnerPhoto ? 'Change Photo' : 'Add Photo'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onWinnerPhoto} />
          </label>
          <button onClick={() => downloadCard(championRef, `champion-${champion?.name}.png`)} style={{ flex: 1, background: 'linear-gradient(135deg,rgba(250,204,21,0.25),rgba(202,138,4,0.2))', border: '1px solid rgba(250,204,21,0.4)', borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 700, color: '#fde047', cursor: 'pointer' }}>
            ⬇️ Download
          </button>
          <button onClick={() => onShareChampion(champion, runnerUp)} style={{ flex: 1, background: 'linear-gradient(135deg, #4f628d, #3e4f7a)', border: 'none', borderRadius: 12, padding: '10px 0', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            📤 Share
          </button>
        </div>
      </div>

      {/* Runner-up card */}
      <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.28), 0 0 0 1px rgba(148,163,184,0.15)' }}>
        <div ref={runnerUpRef} style={{ background: 'linear-gradient(160deg, #1e293b 0%, #182436 55%, #0f1a28 100%)', padding: '32px 24px 28px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: 14 }}>{tournament?.name}</div>
          <div style={{ fontSize: 68, lineHeight: 1, marginBottom: 18, filter: 'drop-shadow(0 0 18px rgba(148,163,184,0.5)) drop-shadow(0 6px 12px rgba(0,0,0,0.4))' }}>🥈</div>
          {tournament?.runnerUpPhoto && (
            <div style={{ display: 'inline-block', marginBottom: 18, borderRadius: 18, overflow: 'hidden', border: '3px solid rgba(148,163,184,0.4)', boxShadow: '0 0 0 6px rgba(148,163,184,0.08), 0 8px 32px rgba(0,0,0,0.4)' }}>
              <img src={tournament.runnerUpPhoto} alt="runner-up" style={{ width: 240, height: 180, objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: 8 }}>Runners-up</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#cbd5e1', letterSpacing: '-0.3px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{runnerUp?.name || '–'}</div>
          {tournament?.runnerUpPrize && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: 6 }}>Prize Money</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 999, padding: '6px 18px' }}>
                <span style={{ fontSize: 14 }}>💰</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#94a3b8' }}>{tournament.runnerUpPrize}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', padding: '10px 16px', display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '9px 0', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'block' }}>
            📷 {tournament?.runnerUpPhoto ? 'Change Photo' : 'Add Photo'}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onRunnerUpPhoto} />
          </label>
          <button onClick={() => downloadCard(runnerUpRef, `runner-up-${runnerUp?.name}.png`)} style={{ flex: 1, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}>
            ⬇️ Download
          </button>
          <button onClick={() => onShareRunnerUp(champion, runnerUp)} style={{ flex: 1, background: 'linear-gradient(135deg, #475569, #334155)', border: 'none', borderRadius: 12, padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#cbd5e1', cursor: 'pointer' }}>
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
}
