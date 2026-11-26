// Money and number formatting
export const peso = (n) =>
  `${n < 0 ? '−' : ''}₱${Math.abs(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pesoShort = (n) => `${n < 0 ? '−' : ''}₱${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-PH')}`;
export const num = (n, d = 0) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (n, d = 1) => `${(Number(n || 0) * 100).toFixed(d)}%`;
export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};
export const addDays = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + Number(days || 0));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
export const years = (n) => {
  if (n == null || !isFinite(n)) return '—';
  const y = Math.floor(n);
  const m = Math.round((n - y) * 12);
  if (m === 12) return `${y + 1} yrs`;
  return m ? `${y} yr ${m} mo` : `${y} yrs`;
};

export function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
