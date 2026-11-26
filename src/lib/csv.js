// CSV reading/writing for supplier price lists.
// Supplier files come in any layout, so the import screen lets the owner
// match their columns to ours (Brand, Model, Price…). Excel: File → Save As → CSV.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  // Excel in some regions saves with semicolons
  const firstLine = s.split(/\r?\n/)[0] || '';
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

// "₱ 12,345.50", "12345", "PHP 1,200" → number
export function toNumber(v) {
  if (v == null) return NaN;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

// Our import fields and the header words that usually mean them
export const IMPORT_FIELDS = [
  { id: 'category', label: 'Category', hints: ['category', 'type', 'group', 'class'] },
  { id: 'brand', label: 'Brand', hints: ['brand', 'make', 'manufacturer'] },
  { id: 'model', label: 'Model / description', required: true, hints: ['model', 'description', 'item', 'product', 'name', 'particular'] },
  { id: 'cost', label: 'Cost price (₱)', required: true, hints: ['installer', 'dealer', 'cost', 'price', 'net', 'srp', 'amount', 'unit price'] },
  { id: 'unit', label: 'Unit', hints: ['unit', 'uom'] },
  { id: 'watts', label: 'Panel watts', hints: ['watt', 'wp', 'power', 'pmax'] },
  { id: 'kw', label: 'Inverter kW', hints: ['kw', 'capacity', 'rating'] },
  { id: 'kwh', label: 'Battery kWh', hints: ['kwh', 'energy'] },
  { id: 'supplier', label: 'Supplier', hints: ['supplier', 'vendor', 'distributor'] },
];

export function guessMapping(headers) {
  const used = new Set();
  const map = {};
  IMPORT_FIELDS.forEach((f) => {
    const idx = headers.findIndex((h, i) => !used.has(i) && f.hints.some((w) => h.toLowerCase().includes(w)));
    if (idx >= 0) {
      map[f.id] = idx;
      used.add(idx);
    } else map[f.id] = -1;
  });
  return map;
}

// Guess the category from words in the row when there's no category column
export function guessCategory(text, fallback = 'misc') {
  const t = text.toLowerCase();
  if (/inverter|hybrid|grid.?tie|on.?grid|off.?grid|mppt/.test(t)) return 'inverter';
  if (/batter|lifepo|lfp|kwh|\bah\b|powerwall/.test(t)) return 'battery';
  if (/panel|module|mono|bifacial|topcon|perc|\d{3}\s?w\b/.test(t)) return 'panel';
  if (/rail|clamp|l.?foot|hook|bracket|mount/.test(t)) return 'mounting';
  if (/dc|mc4|pv cable|pv wire|fuse|combiner|isolator/.test(t)) return 'dc';
  if (/ac|breaker|mcb|spd|ground|earth|meter/.test(t)) return 'ac';
  return fallback;
}
