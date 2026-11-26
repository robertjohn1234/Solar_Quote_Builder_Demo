// App data: settings, materials library and quotes — saved in this browser (localStorage).
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { seedLibrary } from '../data/library.js';
import { defaultSettings, blankQuote } from '../lib/defaults.js';
import { uid, todayISO } from '../lib/format.js';

const STORAGE_KEY = 'liwanag-quote-v1';
const Ctx = createContext(null);

function sampleQuotes(settings) {
  const year = todayISO().slice(0, 4);
  const mk = (n, patch) => ({ ...blankQuote(settings, `${settings.quotePrefix}-${year}-${String(n).padStart(3, '0')}`), id: uid(), ...patch });
  return [
    mk(1, {
      status: 'won',
      date: `${year}-11-10`,
      customer: { name: 'Maria Santos', phone: '0917 555 0101', email: '', address: 'Brgy. San Antonio, Biñan, Laguna' },
      system: 'hybrid',
      sizing: { bill: 10000, rate: 15.55, dayShare: 0.45, target: 0.8 },
      panelId: 'pnl-620-topcon',
      panelQty: 10,
      inverterId: 'inv-deye-6k-hyb',
      batteryId: 'bat-512-100',
      batteryQty: 2,
    }),
    mk(2, {
      status: 'sent',
      date: `${year}-11-18`,
      customer: { name: 'Dela Cruz Bakeshop', phone: '0918 555 0202', email: '', address: 'Poblacion, Lipa City, Batangas' },
      system: 'grid',
      sizing: { bill: 8000, rate: 15.55, dayShare: 0.65, target: 0.9 },
      panelId: 'pnl-620-topcon',
      panelQty: 8,
      inverterId: 'inv-growatt-5k-grid',
      batteryId: '',
      batteryQty: 0,
    }),
    mk(3, {
      status: 'draft',
      date: todayISO(),
      customer: { name: 'Reyes Residence', phone: '0919 555 0303', email: '', address: 'Dasmariñas, Cavite' },
      system: 'hybrid',
      sizing: { bill: 15000, rate: 15.55, dayShare: 0.3, target: 0.8 },
      panelId: 'pnl-620-topcon',
      panelQty: 14,
      inverterId: 'inv-deye-8k-hyb',
      batteryId: 'bat-512-314',
      batteryQty: 1,
    }),
  ];
}

export function sampleData() {
  const settings = structuredClone(defaultSettings);
  return { settings, library: structuredClone(seedLibrary), quotes: sampleQuotes(settings), seq: 3, lastBackup: null };
}
export function emptyData() {
  const settings = structuredClone(defaultSettings);
  return { settings, library: structuredClone(seedLibrary), quotes: [], seq: 0, lastBackup: null };
}

function normalize(d) {
  const base = emptyData();
  const s = d?.settings || {};
  return {
    settings: { ...base.settings, ...s, company: { ...base.settings.company, ...(s.company || {}) }, design: { ...base.settings.design, ...(s.design || {}) } },
    library: Array.isArray(d?.library) ? d.library : base.library,
    quotes: Array.isArray(d?.quotes) ? d.quotes : [],
    seq: Number(d?.seq) || (d?.quotes?.length ?? 0),
    lastBackup: d?.lastBackup || null,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function reducer(state, a) {
  switch (a.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.settings } };
    case 'item/save': {
      const item = { ...a.item, updated: a.keepDate ? a.item.updated : todayISO() };
      const exists = state.library.some((i) => i.id === item.id);
      return { ...state, library: exists ? state.library.map((i) => (i.id === item.id ? item : i)) : [...state.library, { ...item, id: item.id || uid() }] };
    }
    case 'item/remove':
      return { ...state, library: state.library.filter((i) => i.id !== a.id) };
    case 'items/import':
      return { ...state, library: a.replace ? a.items : [...state.library, ...a.items] };
    case 'quote/save': {
      const q = a.quote;
      const exists = state.quotes.some((x) => x.id === q.id);
      return { ...state, quotes: exists ? state.quotes.map((x) => (x.id === q.id ? q : x)) : [{ ...q }, ...state.quotes], seq: exists ? state.seq : state.seq + 1 };
    }
    case 'quote/remove':
      return { ...state, quotes: state.quotes.filter((q) => q.id !== a.id) };
    case 'backup/done':
      return { ...state, lastBackup: todayISO() };
    case 'replace':
      return normalize(a.data);
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load() || sampleData());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked — data stays for this session */
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      saveSettings: (settings) => dispatch({ type: 'settings', settings }),
      saveItem: (item, keepDate = false) => dispatch({ type: 'item/save', item, keepDate }),
      removeItem: (id) => dispatch({ type: 'item/remove', id }),
      importItems: (items, replace = false) => dispatch({ type: 'items/import', items, replace }),
      saveQuote: (quote) => dispatch({ type: 'quote/save', quote }),
      removeQuote: (id) => dispatch({ type: 'quote/remove', id }),
      markBackedUp: () => dispatch({ type: 'backup/done' }),
      replaceAll: (data) => dispatch({ type: 'replace', data }),
      loadSample: () => dispatch({ type: 'replace', data: sampleData() }),
      eraseAll: () => dispatch({ type: 'replace', data: emptyData() }),
    }),
    []
  );

  const value = useMemo(() => ({ state, settingsWithToday: { ...state.settings, today: todayISO() }, ...actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// Next quote number, e.g. Q-2026-004
export function nextNumber(state) {
  const year = todayISO().slice(0, 4);
  const used = new Set(state.quotes.map((q) => q.number));
  let n = state.seq + 1;
  let num;
  do {
    num = `${state.settings.quotePrefix}-${year}-${String(n).padStart(3, '0')}`;
    n++;
  } while (used.has(num));
  return num;
}

export function newQuote(state) {
  const s = state.settings;
  const lib = state.library;
  const q = { ...blankQuote(s, nextNumber(state)), id: uid() };
  q.panelId = lib.find((i) => i.category === 'panel')?.id || '';
  q.inverterId = lib.find((i) => i.category === 'inverter' && i.specs?.type === 'hybrid')?.id || lib.find((i) => i.category === 'inverter')?.id || '';
  q.batteryId = lib.find((i) => i.category === 'battery')?.id || '';
  return q;
}
