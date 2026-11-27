import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store/store.jsx';
import { CATEGORIES, ROLES, seedLibrary } from '../data/library.js';
import { itemName, daysSince } from '../lib/engine.js';
import { parseCSV, toCSV, guessMapping, guessCategory, toNumber, IMPORT_FIELDS } from '../lib/csv.js';
import { peso, fmtDate, uid, todayISO, download } from '../lib/format.js';
import { Icon, Modal, Field, Empty, useConfirm, toast } from '../components/ui.jsx';
import { DemoInfo } from '../components/Demo.jsx';
import { isDemo } from '../config.js';

// Spec fields per category (used by the design checks)
const SPEC_FIELDS = {
  panel: [
    ['watts', 'Power (W)'],
    ['voc', 'Voc (V)'],
    ['vmp', 'Vmp (V)'],
    ['isc', 'Isc (A)'],
    ['imp', 'Imp (A)'],
    ['tcVoc', 'Temp. coeff. Voc (%/°C)'],
    ['lengthMm', 'Length (mm)'],
    ['widthMm', 'Width (mm)'],
  ],
  inverter: [
    ['acKW', 'AC output (kW)'],
    ['maxDcV', 'Max DC voltage (V)'],
    ['mpptMin', 'MPPT min (V)'],
    ['mpptMax', 'MPPT max (V)'],
    ['startV', 'Start-up voltage (V)'],
    ['mppts', 'No. of MPPTs'],
    ['stringsPerMppt', 'Strings per MPPT'],
    ['maxInputA', 'Max input current per MPPT (A)'],
    ['maxPvW', 'Max PV input (W)'],
    ['batteryV', 'Battery voltage (V, 0 = none)'],
    ['maxChargeA', 'Max battery charge (A)'],
  ],
  battery: [
    ['voltage', 'Voltage (V)'],
    ['ah', 'Capacity (Ah)'],
    ['kwh', 'Energy (kWh)'],
    ['maxParallel', 'Max in parallel'],
  ],
  mounting: [['lengthM', 'Rail length (m) — rails only']],
};

const specSummary = (i) => {
  const s = i.specs || {};
  if (i.category === 'panel') return `${s.watts}W · Voc ${s.voc} V · Imp ${s.imp} A`;
  if (i.category === 'inverter') return `${s.type === 'grid' ? 'Grid-tie' : s.type === 'hybrid' ? 'Hybrid' : 'Off-grid'} ${s.acKW} kW · MPPT ${s.mpptMin}–${s.mpptMax} V · ${s.mppts} × ${s.maxInputA} A${s.batteryV ? ` · ${s.batteryV} V batt.` : ''}`;
  if (i.category === 'battery') return `${s.voltage} V · ${s.ah} Ah · ${s.kwh} kWh`;
  return ROLES.find((r) => r.id === i.role && r.id)?.label || '';
};

const blankItem = (category) => ({ id: '', category, brand: '', model: '', unit: category === 'dc' ? 'm' : 'pc', cost: 0, supplier: '', role: '', notes: '', source: null, specs: category === 'inverter' ? { type: 'hybrid' } : {} });

function ItemModal({ item, onClose, onSave, onDelete }) {
  const [it, setIt] = useState(() => structuredClone(item));
  const set = (k, v) => setIt((x) => ({ ...x, [k]: v }));
  const setSpec = (k, v) => setIt((x) => ({ ...x, specs: { ...x.specs, [k]: v === '' ? '' : Number(v) } }));
  const fields = SPEC_FIELDS[it.category] || [];
  const valid = it.model.trim() && Number(it.cost) >= 0;
  return (
    <Modal
      title={item.id ? 'Edit material' : 'Add material'}
      onClose={onClose}
      wide
      footer={
        <>
          {item.id && (
            <button className="btn btn--danger-ghost" onClick={onDelete}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!valid} onClick={() => onSave({ ...it, id: it.id || uid(), cost: Number(it.cost) || 0 })}>
            Save
          </button>
        </>
      }
    >
      <div className="grid-3">
        <Field label="Category">
          <select className="input" value={it.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input className="input" value={it.brand} onChange={(e) => set('brand', e.target.value)} />
        </Field>
        <Field label="Model / description">
          <input className="input" value={it.model} onChange={(e) => set('model', e.target.value)} />
        </Field>
        <Field label="Cost price (₱)" hint="Your buying price from the supplier">
          <input className="input" type="number" min="0" step="0.01" value={it.cost} onChange={(e) => set('cost', e.target.value)} />
        </Field>
        <Field label="Unit">
          <input className="input" value={it.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pc, m, set, lot" />
        </Field>
        <Field label="Supplier">
          <input className="input" value={it.supplier} onChange={(e) => set('supplier', e.target.value)} />
        </Field>
        {['mounting', 'dc', 'ac'].includes(it.category) && (
          <Field label="Used automatically as" hint="Quotes fill in quantities for these">
            <select className="input" value={it.role || ''} onChange={(e) => set('role', e.target.value)}>
              {ROLES.filter((r) => !r.id || r.category === it.category).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {it.category === 'inverter' && (
          <Field label="Inverter type">
            <select className="input" value={it.specs.type || 'hybrid'} onChange={(e) => setIt((x) => ({ ...x, specs: { ...x.specs, type: e.target.value } }))}>
              <option value="grid">Grid-tie</option>
              <option value="hybrid">Hybrid (battery-ready)</option>
              <option value="offgrid">Off-grid</option>
            </select>
          </Field>
        )}
      </div>
      {fields.length > 0 && (
        <>
          <h3 className="sub">Datasheet specs (used for design checks)</h3>
          <div className="grid-4">
            {fields.map(([k, label]) => (
              <Field key={k} label={label}>
                <input className="input" type="number" step="any" value={it.specs[k] ?? ''} onChange={(e) => setSpec(k, e.target.value)} />
              </Field>
            ))}
          </div>
        </>
      )}
      <Field label="Notes">
        <textarea className="input" rows={2} value={it.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      {it.source?.name && (
        <p className="small muted">
          Price source: {it.source.url ? <a href={it.source.url} target="_blank" rel="noreferrer">{it.source.name}</a> : it.source.name}
        </p>
      )}
    </Modal>
  );
}

function ImportModal({ onClose, onImport }) {
  const [rows, setRows] = useState(null);
  const [map, setMap] = useState({});
  const [hasHeader, setHasHeader] = useState(true);
  const [category, setCategory] = useState('auto');
  const [supplier, setSupplier] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const onFile = (file) => {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setError('This is an Excel file. In Excel, choose File → Save As → "CSV (Comma delimited)", then import the CSV.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = parseCSV(String(reader.result));
      if (data.length < 2) {
        setError('No rows found in this file.');
        return;
      }
      setError('');
      setRows(data);
      setMap(guessMapping(data[0]));
      if (!supplier) setSupplier(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsText(file);
  };

  const headers = rows ? (hasHeader ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`)) : [];
  const body = rows ? (hasHeader ? rows.slice(1) : rows) : [];
  const cell = (r, f) => (map[f] >= 0 ? r[map[f]] ?? '' : '');

  const items = body
    .map((r) => {
      const model = cell(r, 'model');
      const cost = toNumber(cell(r, 'cost'));
      if (!model || !Number.isFinite(cost)) return null;
      const text = `${cell(r, 'category')} ${model} ${cell(r, 'brand')}`;
      const cat = category === 'auto' ? guessCategory(text) : category;
      const specs = {};
      const w = toNumber(cell(r, 'watts'));
      const kw = toNumber(cell(r, 'kw'));
      const kwh = toNumber(cell(r, 'kwh'));
      if (cat === 'panel' && Number.isFinite(w)) specs.watts = w;
      if (cat === 'inverter') {
        specs.type = /grid.?tie|on.?grid/i.test(text) && !/hybrid/i.test(text) ? 'grid' : 'hybrid';
        if (Number.isFinite(kw)) specs.acKW = kw;
      }
      if (cat === 'battery' && Number.isFinite(kwh)) specs.kwh = kwh;
      return { id: uid(), category: cat, brand: cell(r, 'brand'), model, unit: cell(r, 'unit') || 'pc', cost, supplier: cell(r, 'supplier') || supplier, updated: todayISO(), role: '', notes: 'Imported — add datasheet specs for design checks.', source: null, specs };
    })
    .filter(Boolean);

  return (
    <Modal
      title="Import a supplier price list"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!items.length} onClick={() => onImport(items, replace)}>
            Import {items.length || ''} item{items.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      {!rows ? (
        <div className="drop" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}>
          <Icon name="upload" size={28} />
          <b>Choose a CSV file</b>
          <span className="small muted">From Excel or Google Sheets: File → Save As / Download → CSV. Any column layout works — you'll match the columns next.</span>
          <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" hidden onChange={(e) => onFile(e.target.files[0])} />
        </div>
      ) : (
        <>
          <div className="grid-3">
            <Field label="Category for these items">
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="auto">Detect from the description</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    All {c.label.toLowerCase()}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier name">
              <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
            <Field label="First row">
              <label className="switch">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                <span>{hasHeader ? 'Has column names' : 'Is data'}</span>
              </label>
            </Field>
          </div>
          <h3 className="sub">Match the columns</h3>
          <div className="grid-3">
            {IMPORT_FIELDS.map((f) => (
              <Field key={f.id} label={`${f.label}${f.required ? ' *' : ''}`}>
                <select className="input" value={map[f.id] ?? -1} onChange={(e) => setMap({ ...map, [f.id]: Number(e.target.value) })}>
                  <option value={-1}>— not in file —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <h3 className="sub">
            Preview — {items.length} of {body.length} rows can be imported
          </h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Item</th>
                  <th className="num">Cost</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 6).map((i) => (
                  <tr key={i.id}>
                    <td>{CATEGORIES.find((c) => c.id === i.category)?.label}</td>
                    <td>{itemName(i)}</td>
                    <td className="num mono">{peso(i.cost)}</td>
                    <td>{i.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="switch">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            <span>{replace ? 'Replace my whole library with this file' : 'Add to my library (keep existing items)'}</span>
          </label>
        </>
      )}
      {error && <p className="notice notice--warn">{error}</p>}
    </Modal>
  );
}

export default function Library() {
  const { state, saveItem, removeItem, importItems } = useStore();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [demoBlock, setDemoBlock] = useState('');
  const [bulkPct, setBulkPct] = useState(5);
  const [ask, dialog] = useConfirm();
  const staleDays = state.settings.staleDays;

  const items = useMemo(
    () =>
      state.library.filter((i) => (cat === 'all' || i.category === cat) && (!q || `${i.brand} ${i.model} ${i.supplier}`.toLowerCase().includes(q.toLowerCase()))),
    [state.library, cat, q]
  );
  const staleCount = state.library.filter((i) => daysSince(i.updated, todayISO()) > staleDays).length;

  const exportCsv = () => {
    const rows = [['Category', 'Brand', 'Model', 'Unit', 'Cost', 'Supplier', 'Updated', 'Auto role', 'Specs (JSON)', 'Source'], ...state.library.map((i) => [i.category, i.brand, i.model, i.unit, i.cost, i.supplier, i.updated, i.role || '', JSON.stringify(i.specs || {}), i.source?.url || i.source?.name || ''])];
    download(`materials-${todayISO()}.csv`, '﻿' + toCSV(rows), 'text/csv;charset=utf-8');
  };

  const applyBulk = () => {
    const f = 1 + (Number(bulkPct) || 0) / 100;
    items.forEach((i) => saveItem({ ...i, cost: Math.round(i.cost * f * 100) / 100 }));
    setBulk(false);
    toast(`Updated ${items.length} prices by ${bulkPct}%`);
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">Supplier library</p>
          <h1>Materials</h1>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={exportCsv}>
            <Icon name="download" size={18} /> <span className="hide-sm">Export</span>
          </button>
          <button className="btn btn--ghost" onClick={() => (isDemo ? setDemoBlock('Importing supplier price lists is part of the full version.') : setImporting(true))}>
            <Icon name="upload" size={18} /> Import price list
          </button>
          <button className="btn btn--primary" onClick={() => setEditing(blankItem(cat === 'all' ? 'panel' : cat))}>
            <Icon name="plus" size={18} /> Add
          </button>
        </div>
      </div>

      <p className="notice">
        <Icon name="info" size={16} />
        <span>
          Starting prices come from public 2026 Philippine listings (each item shows its source). Replace them with your own supplier prices: import their list or edit items one by one.
          {staleCount > 0 && <b> {staleCount} price{staleCount === 1 ? ' is' : 's are'} older than {staleDays} days.</b>}
        </span>
      </p>

      <div className="toolbar">
        <div className="segmented segmented--scroll" role="tablist">
          {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? 'is-on' : ''} onClick={() => setCat(c.id)}>
              {c.label}
              <span>{c.id === 'all' ? state.library.length : state.library.filter((i) => i.category === c.id).length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <Icon name="search" size={18} />
          <input placeholder="Search brand, model, supplier" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn btn--ghost btn--sm" onClick={() => setBulk(!bulk)}>
          ± Bulk price change
        </button>
      </div>

      {bulk && (
        <div className="card bulk">
          <span>
            Change the cost of the <b>{items.length} items shown</b> by
          </span>
          <input className="input input--qty" type="number" step="0.5" value={bulkPct} onChange={(e) => setBulkPct(e.target.value)} />
          <span>%</span>
          <button className="btn btn--primary btn--sm" onClick={applyBulk}>
            Apply
          </button>
          <span className="small muted">Use a negative number to lower prices.</span>
        </div>
      )}

      {!items.length ? (
        <Empty icon="box" title="No materials here" text="Add an item or import your supplier's price list." />
      ) : (
        <div className="card table-wrap">
          <table className="table lib">
            <thead>
              <tr>
                <th>Item</th>
                <th className="hide-sm">Key specs</th>
                <th className="num">Cost</th>
                <th className="hide-sm">Supplier</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const age = daysSince(i.updated, todayISO());
                return (
                  <tr key={i.id} className="clickable" onClick={() => setEditing(i)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(i)}>
                    <td>
                      <span className="line__name">{itemName(i)}</span>
                      <span className="line__meta">
                        {CATEGORIES.find((c) => c.id === i.category)?.label}
                        {i.role ? ' · auto' : ''}
                        <span className="show-sm"> · {i.supplier}</span>
                      </span>
                    </td>
                    <td className="hide-sm small muted">{specSummary(i)}</td>
                    <td className="num mono">
                      {peso(i.cost)}
                      <span className="unit">/{i.unit}</span>
                    </td>
                    <td className="hide-sm small">
                      {i.supplier}
                      {i.source?.url && (
                        <a className="src" href={i.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={i.source.name}>
                          <Icon name="link" size={14} />
                        </a>
                      )}
                    </td>
                    <td className={`small ${age > staleDays ? 'bad' : 'muted'}`}>{fmtDate(i.updated)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="small muted center">
        <button
          className="link"
          onClick={() =>
            ask({
              title: 'Reset to the starting library?',
              message: `This replaces all ${state.library.length} materials with the ${seedLibrary.length} starting items. Quotes that use removed items will need new selections.`,
              confirmLabel: 'Reset library',
              onConfirm: () => importItems(structuredClone(seedLibrary), true),
            })
          }
        >
          Reset to starting library
        </button>
      </p>

      {editing && (
        <ItemModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(it) => {
            saveItem(it);
            setEditing(null);
            toast('Material saved');
          }}
          onDelete={() =>
            ask({
              title: `Delete ${itemName(editing)}?`,
              message: 'Quotes that use this item will need another item selected.',
              onConfirm: () => {
                removeItem(editing.id);
                setEditing(null);
              },
            })
          }
        />
      )}
      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImport={(list, replace) => {
            importItems(list, replace);
            setImporting(false);
            toast(`Imported ${list.length} items`);
          }}
        />
      )}
      {demoBlock && <DemoInfo reason={demoBlock} onClose={() => setDemoBlock('')} />}
      {dialog}
    </div>
  );
}
