import { Typography } from 'antd';
import { getKnockoutRoundLabel } from '../utils/schedule';

const { Text } = Typography;

export default function BracketChart({ matches, teamLookup, onOpenMatch, accentColor = '#64748b' }) {
  if (!matches || matches.length === 0) return null;

  const brd = matches.reduce((acc, m) => {
    const r = m.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});

  const rKeys = Object.keys(brd).sort((a, b) => Number(a) - Number(b));
  const maxRd = Math.max(...rKeys.map(Number), 0);
  const r1Cnt = (brd[rKeys[0]] || []).length;
  const bH = r1Cnt * 86;
  const isPlayoff = matches.some((m) => m.phase === 'playoff');

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: rKeys.length * 154 }}>
        {rKeys.map((round, rIdx) => {
          const rMatches = brd[round];
          const label = isPlayoff
            ? (Number(round) === maxRd ? '🏆 Final' : 'Semifinals')
            : getKnockoutRoundLabel(Number(round), maxRd);

          return (
            <div key={round} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ width: 136 }}>
                <Text style={{ fontSize: 9, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4, whiteSpace: 'nowrap' }}>
                  {label}
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: bH }}>
                  {rMatches.map((match) => {
                    const tA = teamLookup.get(match.teamAId);
                    const tB = teamLookup.get(match.teamBId);
                    const nA = tA?.name || (match.teamAFrom ? `W${match.teamAFrom}` : 'TBD');
                    const nB = tB?.name || (match.teamBFrom ? `W${match.teamBFrom}` : 'TBD');
                    const tbd = !match.teamAId || !match.teamBId;
                    const borderColor = match.winnerId ? '#c7d2fe' : tbd ? '#d1d5db' : isPlayoff ? '#dbe2f0' : '#d8dfec';
                    const bg = match.winnerId ? '#eef2ff' : tbd ? '#f9fafb' : isPlayoff ? '#f9fafb' : '#eef1f7';

                    return (
                      <div
                        key={match.id}
                        onClick={() => !tbd && onOpenMatch(match.id)}
                        style={{ border: `${match.winnerId ? '1.5px' : tbd ? '1px dashed' : '1.5px'} solid ${borderColor}`, background: bg, borderRadius: 8, padding: '5px 8px', cursor: tbd ? 'default' : 'pointer', opacity: tbd ? 0.6 : 1, marginBottom: 4 }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 11, color: match.winnerId === match.teamAId ? '#3e4f7a' : tbd ? '#9ca3af' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.winnerId === match.teamAId ? '🏅 ' : ''}{nA}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0', textAlign: 'center' }}>
                          {match.winnerId ? `${match.scoreA}–${match.scoreB}` : tbd ? '···' : 'vs'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 11, color: match.winnerId === match.teamBId ? '#3e4f7a' : tbd ? '#9ca3af' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.winnerId === match.teamBId ? '🏅 ' : ''}{nB}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {rIdx < rKeys.length - 1 && (
                <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: bH + 20, color: '#cbd5e1', fontSize: 16, paddingTop: 20 }}>›</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
