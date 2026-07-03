export function isMatchComplete(scoreA, scoreB) {
  if (scoreA === 20 && scoreB === 20) return false;
  if ((scoreA === 21 && scoreB <= 20) || (scoreB === 21 && scoreA <= 20)) return true;
  return false;
}
