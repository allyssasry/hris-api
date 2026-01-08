// src/utils/timeRange.js
export function monthRange(ym /* YYYY-MM */){
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    const d = new Date();
    const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0,0,0));
    const end   = new Date(Date.UTC(y, m+1, 0, 23,59,59,999));
    return [start, end];
  }
  const y = Number(ym.slice(0,4));
  const m = Number(ym.slice(5,7))-1;
  const start = new Date(Date.UTC(y, m, 1, 0,0,0));
  const end   = new Date(Date.UTC(y, m+1, 0, 23,59,59,999));
  return [start, end];
}
