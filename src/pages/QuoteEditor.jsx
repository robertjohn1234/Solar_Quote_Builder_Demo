import { useMemo, useState } from 'react';
import { useStore, newQuote } from '../store/store.jsx';
import { buildQuote, findItem, itemName, suggestPanels } from '../lib/engine.js';
import { CATEGORIES, ROLES } from '../data/library.js';
import { peso, pesoShort, num, pct, uid, years, fmtDate, addDays } from '../lib/format.js';
import { Icon, Badge, Field, toast } from '../components/ui.jsx';
import { DemoInfo } from '../components/Demo.jsx';
import { config } from '../config.js';

const SYSTEMS = [
  { id: 'grid', label: 'Grid-tie', icon: 'bolt' },
  { id: 'hybrid', label: 'Hybrid', icon: 'battery' },
  { id: 'offgrid', label: 'Off-grid', icon: 'sun' },
];
const USAGE = [
  { v: 0.3, label: 'Mostly night' },
  { v: 0.45, label: 'Day & night' },
  { v: 0.65, label: 'Mostly day' },
];
const COST_MODES = [
  { id: 'fixed', label: 'Fixed' },
  { id: 'perKWp', label: 'Per kWp' },
  { id: 'perTrip', label: 'Per trip' },
  { id: 'perUnit', label: 'Per unit' },
];

const n = (v) => (v === '' ? '' : Number(v));

function ItemSelect({ lib, category, value, onChange, filter, allowNone }) {
  const items = lib.filter((i) => i.category === category && (!filter || filter(i)));
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">— none —</option>}
      {!value && !allowNone && <option value="">Choose…</option>}
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {itemName(i)} — {pesoShort(i.cost)}
        </option>
      ))}
    </select>
  );
}

function Section({ title, icon, children, aside }) {
  return (
    <section className="card section">
      <div className="section__head">
        <h2>
          {icon && <Icon name={icon} size={18} />} {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function AddLine({ lib, onAdd }) {
  const [mode, setMode] = useState('');
  const [custom, setCustom] = useState({ name: '', unit: 'lot', qty: 1, cost: '' });
  if (mode === 'custom')
    return (
      <div className="add-line">
        <input className="input" placeholder="Item name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
        <input className="input input--sm" placeholder="Unit" value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value })} />
        <input className="input input--sm" type="number" min="0" placeholder="Qty" value={custom.qty} onChange={(e) => setCustom({ ...custom, qty: e.target.value })} />
        <input className="input input--sm" type="number" min="0" placeholder="Cost ₱" value={custom.cost} onChange={(e) => setCustom({ ...custom, cost: e.target.value })} />
        <button
          className="btn btn--primary btn--sm"
          disabled={!custom.name.trim()}
          onClick={() => {
            onAdd({ id: uid(), itemId: null, name: custom.name.trim(), unit: custom.unit || 'lot', qty: Number(custom.qty) || 1, cost: Number(custom.cost) || 0 });
            setCustom({ name: '', unit: 'lot', qty: 1, cost: '' });
            setMode('');
          }}
        >
          Add
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => setMode('')}>
          Cancel
        </button>
      </div>
    );
  return (
    <div className="add-line">
      <select
        className="input"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom') setMode('custom');
          else if (v) onAdd({ id: uid(), itemId: v, qty: 1 });
        }}
      >
        <option value="">+ Add a material line…</option>
        <option value="__custom">Custom item (not in library)</option>
        {CATEGORIES.map((c) => (
          <optgroup key={c.id} label={c.label}>
            {lib
              .filter((i) => i.category === c.id)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {itemName(i)} — {pesoShort(i.cost)}/{i.unit}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export default function QuoteEditor({ quote: q, go }) {
  const { state, settingsWithToday, saveQuote, canAddQuote } = useStore();
  const [limit, setLimit] = useState(false);
  const lib = state.library;
  const settings = state.settings;
  const r = useMemo(() => buildQuote(q, lib, settingsWithToday), [q, lib, settingsWithToday]);
  const update = (patch) => saveQuote({ ...q, ...patch });
  const setIn = (key, patch) => update({ [key]: { ...q[key], ...patch } });
  const [manualText, setManualText] = useState((q.manualStrings || []).join(', '));

  const panel = findItem(lib, q.panelId);
  const suggested = suggestPanels({ ...q.sizing, system: q.system }, panel, settings.design);
  const lowMargin = r.margin * 100 < settings.minMarginPct;

  // Edit a line's quantity: main items change the system; mounting/wiring become overrides
  const setLineQty = (line, value) => {
    const v = value === '' ? '' : Math.max(0, Number(value));
    if (line.key === 'panel') update({ panelQty: v === '' ? 0 : v });
    else if (line.key === 'inverter') update({ inverterQty: Math.max(1, Number(v) || 1) });
    else if (line.key === 'battery') update({ batteryQty: v === '' ? 0 : v });
    else if (line.role) update({ overrides: { ...q.overrides, [line.role]: { ...(q.overrides?.[line.role] || {}), qty: v } } });
    else if (line.extraId) update({ extraLines: q.extraLines.map((x) => (x.id === line.extraId ? { ...x, qty: v } : x)) });
  };
  const resetRole = (role) => {
    const o = { ...(q.overrides?.[role] || {}) };
    delete o.qty;
    update({ overrides: { ...q.overrides, [role]: o } });
  };
  const removeLine = (line) => {
    if (line.role) update({ overrides: { ...q.overrides, [line.role]: { ...(q.overrides?.[line.role] || {}), off: true } } });
    else if (line.extraId) update({ extraLines: q.extraLines.filter((x) => x.id !== line.extraId) });
    else if (line.key === 'battery') update({ batteryQty: 0 });
  };
  const offRoles = Object.entries(q.overrides || {}).filter(([, o]) => o.off).map(([role]) => role);

  const setCost = (id, patch) => update({ costs: q.costs.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const duplicate = () => {
    if (!canAddQuote) return setLimit(true);
    const copy = { ...structuredClone(q), id: uid(), number: newQuote(state).number, status: 'draft', date: new Date().toISOString().slice(0, 10) };
    saveQuote(copy);
    toast(`Copied as ${copy.number}`);
    go(`quote/${copy.id}`);
  };

  const checksByLevel = ['error', 'warn', 'ok'].flatMap((lv) => r.checks.filter((c) => c.level === lv));

  return (
    <div className="page editor">
      <div className="editor__bar">
        <button className="btn btn--ghost btn--sm" onClick={() => go('quotes')}>
          <Icon name="back" size={18} /> Quotes
        </button>
        <div className="editor__title">
          <span className="mono">{q.number}</span>
          <b>{q.customer.name || 'New quote'}</b>
        </div>
        <select className={`input input--sm status status--${q.status}`} value={q.status} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <div className="editor__actions">
          <button className="btn btn--ghost btn--sm" onClick={duplicate}>
            <Icon name="dup" size={16} /> <span className="hide-sm">Duplicate</span>
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => go(`print/${q.id}/internal`)}>
            <Icon name="peso" size={16} /> <span className="hide-sm">Costing sheet</span>
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => go(`print/${q.id}/customer`)}>
            <Icon name="print" size={16} /> Quotation
          </button>
        </div>
      </div>

      <div className="editor__grid">
        <div className="editor__main">
          <Section title="Customer" icon="quote">
            <div className="grid-2">
              <Field label="Name">
                <input className="input" value={q.customer.name} onChange={(e) => setIn('customer', { name: e.target.value })} />
              </Field>
              <Field label="Mobile">
                <input className="input" value={q.customer.phone} onChange={(e) => setIn('customer', { phone: e.target.value })} />
              </Field>
              <Field label="Site address">
                <input className="input" value={q.customer.address} onChange={(e) => setIn('customer', { address: e.target.value })} />
              </Field>
              <Field label="Email (optional)">
                <input className="input" value={q.customer.email} onChange={(e) => setIn('customer', { email: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="Customer's electricity use" icon="bolt" aside={<span className="muted small">Optional — for savings & payback</span>}>
            <div className="grid-4">
              <Field label="Monthly bill (₱)">
                <input className="input" type="number" min="0" value={q.sizing.bill || ''} onChange={(e) => setIn('sizing', { bill: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Rate (₱/kWh)">
                <input className="input" type="number" min="1" step="0.01" value={q.sizing.rate} onChange={(e) => setIn('sizing', { rate: Number(e.target.value) || settings.design.defaultRate })} />
              </Field>
              <Field label="Most usage">
                <select className="input" value={q.sizing.dayShare} onChange={(e) => setIn('sizing', { dayShare: Number(e.target.value) })}>
                  {USAGE.map((u) => (
                    <option key={u.v} value={u.v}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cover % of use">
                <input className="input" type="number" min="20" max="100" step="5" value={Math.round((q.sizing.target ?? 0.8) * 100)} onChange={(e) => setIn('sizing', { target: Math.min(1, Math.max(0.2, Number(e.target.value) / 100)) })} />
              </Field>
            </div>
            {q.sizing.bill > 0 && panel && (
              <p className="hint-row">
                ≈ {num(q.sizing.bill / q.sizing.rate)} kWh/month → suggested <b>{suggested} panels</b> ({num((suggested * panel.specs.watts) / 1000, 2)} kWp)
                {suggested !== q.panelQty && (
                  <button className="link" onClick={() => update({ panelQty: suggested })}>
                    Use {suggested} panels
                  </button>
                )}
              </p>
            )}
          </Section>

          <Section title="System" icon="panel">
            <div className="segmented segmented--wide" role="radiogroup" aria-label="System type">
              {SYSTEMS.map((s) => (
                <button key={s.id} role="radio" aria-checked={q.system === s.id} className={q.system === s.id ? 'is-on' : ''} onClick={() => update({ system: s.id, batteryQty: s.id === 'grid' ? q.batteryQty : q.batteryQty || 1 })}>
                  <Icon name={s.icon} size={16} /> {s.label}
                </button>
              ))}
            </div>
            <div className="equip">
              <div className="equip__row">
                <span className="equip__label">
                  <Icon name="panel" size={18} /> Panels
                </span>
                <ItemSelect lib={lib} category="panel" value={q.panelId} onChange={(v) => update({ panelId: v })} />
                <input className="input input--qty" type="number" min="0" value={q.panelQty} onChange={(e) => update({ panelQty: Math.max(0, Number(e.target.value) || 0) })} aria-label="Number of panels" />
                <span className="equip__info">{num(r.kWp, 2)} kWp</span>
              </div>
              <div className="equip__row">
                <span className="equip__label">
                  <Icon name="inverter" size={18} /> Inverter
                </span>
                <ItemSelect lib={lib} category="inverter" value={q.inverterId} onChange={(v) => update({ inverterId: v })} filter={(i) => q.system === 'grid' || i.specs?.type !== 'grid' || i.id === q.inverterId} />
                <input className="input input--qty" type="number" min="1" value={q.inverterQty} onChange={(e) => update({ inverterQty: Math.max(1, Number(e.target.value) || 1) })} aria-label="Number of inverters" />
                <span className="equip__info">{r.inverter ? `${num(r.inverter.specs.acKW * q.inverterQty, 1)} kW` : ''}</span>
              </div>
              {q.system !== 'grid' && (
                <div className="equip__row">
                  <span className="equip__label">
                    <Icon name="battery" size={18} /> Battery
                  </span>
                  <ItemSelect lib={lib} category="battery" value={q.batteryId} onChange={(v) => update({ batteryId: v })} allowNone />
                  <input className="input input--qty" type="number" min="0" value={q.batteryQty} onChange={(e) => update({ batteryQty: Math.max(0, Number(e.target.value) || 0) })} aria-label="Number of batteries" />
                  <span className="equip__info">{num(r.batteryKWh, 2)} kWh</span>
                </div>
              )}
            </div>

            <div className="strings">
              <div className="strings__head">
                <b>Strings</b>
                <div className="segmented segmented--sm">
                  <button className={q.layoutMode !== 'manual' ? 'is-on' : ''} onClick={() => update({ layoutMode: 'auto' })}>
                    Auto
                  </button>
                  <button
                    className={q.layoutMode === 'manual' ? 'is-on' : ''}
                    onClick={() => {
                      const s = r.layout.strings.length ? r.layout.strings : [q.panelQty];
                      setManualText(s.join(', '));
                      update({ layoutMode: 'manual', manualStrings: s });
                    }}
                  >
                    Manual
                  </button>
                </div>
              </div>
              {q.layoutMode === 'manual' ? (
                <Field label="Panels per string, separated by commas" hint="Strings on the same MPPT input must be equal.">
                  <input
                    className="input mono"
                    value={manualText}
                    onChange={(e) => {
                      setManualText(e.target.value);
                      update({ manualStrings: e.target.value.split(/[,\s+]+/).map(Number).filter((x) => x > 0) });
                    }}
                  />
                </Field>
              ) : null}
              <div className="string-chips">
                {r.layout.strings.map((len, i) => (
                  <span key={i} className="string-chip">
                    <i>
                      {Array.from({ length: Math.min(len, 14) }, (_, k) => (
                        <b key={k} />
                      ))}
                    </i>
                    String {i + 1}: <strong>{len}</strong> panels
                  </span>
                ))}
              </div>
              {r.layout.lim && (
                <p className="muted small">
                  Allowed {r.layout.lim.min}–{r.layout.lim.max} panels per string ({settings.design.tMinC}°C coldest, {settings.design.tMaxCellC}°C hottest panel temperature).
                </p>
              )}
              <div className="grid-2 tight">
                <Field label="Panels per row (mounting)">
                  <input className="input" type="number" min="1" value={q.panelsPerRow} onChange={(e) => update({ panelsPerRow: Math.max(1, Number(e.target.value) || 1) })} />
                </Field>
                <Field label="Cable run, roof to inverter (m)">
                  <input className="input" type="number" min="5" value={q.cableRunM} onChange={(e) => update({ cableRunM: Math.max(5, Number(e.target.value) || 5) })} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Design checks" icon="info" aside={<span className="muted small">Guide only — final design by a licensed electrical engineer</span>}>
            <ul className="checks">
              {checksByLevel.map((c, i) => (
                <li key={i} className={`check check--${c.level}`}>
                  <Icon name={c.level === 'ok' ? 'check' : 'alert'} size={16} />
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Materials" icon="box" aside={<span className="mono small">{peso(r.materials)}</span>}>
            {r.stale.length > 0 && (
              <p className="notice notice--warn">
                <Icon name="alert" size={16} /> {r.stale.length} price{r.stale.length === 1 ? ' is' : 's are'} older than {settings.staleDays} days — check with your supplier (Materials page).
              </p>
            )}
            <div className="table-wrap">
              <table className="table lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th className="num hide-sm">Unit cost</th>
                    <th className="num">Total</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {r.lines.map((l) => (
                    <tr key={l.key}>
                      <td>
                        <span className="line__name">{l.name}</span>
                        <span className="line__meta">
                          {CATEGORIES.find((c) => c.id === l.category)?.label}
                          {l.role && (l.auto ? ' · auto' : ` · edited (auto ${l.autoQty})`)}
                          <span className="show-sm"> · {peso(l.unitCost)}/{l.unit}</span>
                        </span>
                      </td>
                      <td className="num">
                        <input className="input input--qty" type="number" min="0" value={l.qty} onChange={(e) => setLineQty(l, e.target.value)} aria-label={`Quantity of ${l.name}`} />
                        <span className="unit">{l.unit}</span>
                      </td>
                      <td className="num hide-sm mono">{peso(l.unitCost)}</td>
                      <td className="num mono">{peso(l.total)}</td>
                      <td className="actions">
                        {l.role && !l.auto && (
                          <button className="icon-btn" title="Back to automatic quantity" aria-label="Reset quantity" onClick={() => resetRole(l.role)}>
                            <Icon name="bolt" size={16} />
                          </button>
                        )}
                        {(l.role || l.extraId || l.key === 'battery') && (
                          <button className="icon-btn" title="Remove" aria-label={`Remove ${l.name}`} onClick={() => removeLine(l)}>
                            <Icon name="x" size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {offRoles.length > 0 && (
              <p className="small muted">
                Removed:{' '}
                {offRoles.map((role) => (
                  <button key={role} className="chip" onClick={() => update({ overrides: { ...q.overrides, [role]: { ...q.overrides[role], off: false } } })}>
                    {ROLES.find((x) => x.id === role)?.label} ↺
                  </button>
                ))}
              </p>
            )}
            <AddLine lib={lib} onAdd={(x) => update({ extraLines: [...(q.extraLines || []), x] })} />
          </Section>

          <Section title="Labor, transport & other project costs" icon="peso" aside={<span className="mono small">{peso(r.services)}</span>}>
            <div className="costs">
              {q.costs.map((c) => {
                const total = r.costs.find((x) => x.id === c.id)?.total ?? 0;
                return (
                  <div key={c.id} className={`cost${c.on === false ? ' is-off' : ''}`}>
                    <label className="cost__on">
                      <input type="checkbox" checked={c.on !== false} onChange={(e) => setCost(c.id, { on: e.target.checked })} />
                    </label>
                    <input className="input cost__label" value={c.label} onChange={(e) => setCost(c.id, { label: e.target.value })} aria-label="Cost name" />
                    <select className="input cost__mode" value={c.mode} onChange={(e) => setCost(c.id, { mode: e.target.value, qty: c.qty ?? 1 })} aria-label="How it is charged">
                      {COST_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input className="input cost__amt" type="number" min="0" value={c.amount} onChange={(e) => setCost(c.id, { amount: n(e.target.value) })} aria-label="Amount" />
                    {(c.mode === 'perTrip' || c.mode === 'perUnit') && (
                      <input className="input cost__qty" type="number" min="0" value={c.qty ?? 1} onChange={(e) => setCost(c.id, { qty: n(e.target.value) })} aria-label="Quantity" title={c.mode === 'perTrip' ? 'Trips' : 'Units'} />
                    )}
                    {c.mode === 'perKWp' && <span className="cost__x muted small">× {num(r.kWp, 2)} kWp</span>}
                    <span className="cost__total mono">{c.on === false ? '—' : peso(total)}</span>
                    <button className="icon-btn" aria-label={`Remove ${c.label}`} onClick={() => update({ costs: q.costs.filter((x) => x.id !== c.id) })}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => update({ costs: [...q.costs, { id: uid(), label: 'Other cost', mode: 'fixed', amount: 0, on: true }] })}>
              <Icon name="plus" size={16} /> Add cost
            </button>
          </Section>

          <Section title="Pricing" icon="peso">
            <div className="grid-4">
              <Field label="Contingency %">
                <input className="input" type="number" min="0" step="0.5" value={q.contingencyPct} onChange={(e) => update({ contingencyPct: n(e.target.value) })} />
              </Field>
              <Field label="Pricing method">
                <select className="input" value={q.pricingMode} onChange={(e) => update({ pricingMode: e.target.value })}>
                  <option value="margin">Margin (% of price)</option>
                  <option value="markup">Markup (% on cost)</option>
                </select>
              </Field>
              <Field label={q.pricingMode === 'margin' ? 'Target margin %' : 'Markup %'}>
                <input className="input" type="number" min="0" max={q.pricingMode === 'margin' ? 90 : 500} step="1" value={q.pricingPct} onChange={(e) => update({ pricingPct: n(e.target.value) })} />
              </Field>
              <Field label="Round price up to">
                <select className="input" value={q.roundTo} onChange={(e) => update({ roundTo: Number(e.target.value) })}>
                  {[1, 100, 500, 1000, 5000].map((v) => (
                    <option key={v} value={v}>
                      {v === 1 ? 'No rounding' : `₱${num(v)}`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Discount (₱)">
                <input className="input" type="number" min="0" value={q.discount || ''} onChange={(e) => update({ discount: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="VAT">
                <label className="switch">
                  <input type="checkbox" checked={q.vat} onChange={(e) => update({ vat: e.target.checked })} />
                  <span>{q.vat ? `Add ${q.vatRate}% VAT` : 'No VAT (non-VAT)'}</span>
                </label>
              </Field>
              <Field label="On the quotation">
                <label className="switch">
                  <input type="checkbox" checked={q.showLinePrices} onChange={(e) => update({ showLinePrices: e.target.checked })} />
                  <span>{q.showLinePrices ? 'Show price per item' : 'Show items, total only'}</span>
                </label>
              </Field>
              <Field label="Mounting & wiring">
                <label className="switch">
                  <input type="checkbox" checked={q.groupBos !== false} onChange={(e) => update({ groupBos: e.target.checked })} />
                  <span>{q.groupBos !== false ? 'Shown as lots' : 'Every item listed'}</span>
                </label>
              </Field>
              <Field label="Valid for (days)">
                <input className="input" type="number" min="1" value={q.validityDays} onChange={(e) => update({ validityDays: Number(e.target.value) || 1 })} />
              </Field>
            </div>
          </Section>

          <Section title="Terms & notes on the quotation" icon="quote">
            <div className="grid-2">
              <Field label="Payment terms">
                <textarea className="input" rows={4} value={q.paymentTerms} onChange={(e) => update({ paymentTerms: e.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea className="input" rows={4} value={q.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Roof type, survey findings, inclusions/exclusions…" />
              </Field>
              <Field label="Quote date">
                <input className="input" type="date" value={q.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Valid until">
                <input className="input" value={fmtDate(addDays(q.date, q.validityDays))} readOnly />
              </Field>
            </div>
          </Section>
        </div>

        {/* ---------- Live summary ---------- */}
        <aside className="summary">
          <div className="card summary__card">
            <span className="eyebrow">Quote total</span>
            <div className="summary__total">{pesoShort(r.grandTotal)}</div>
            <dl className="summary__rows">
              <div>
                <dt>Materials</dt>
                <dd>{peso(r.materials)}</dd>
              </div>
              <div>
                <dt>Labor & project costs</dt>
                <dd>{peso(r.services)}</dd>
              </div>
              <div>
                <dt>Contingency {q.contingencyPct}%</dt>
                <dd>{peso(r.contingency)}</dd>
              </div>
              <div className="strong">
                <dt>Total cost</dt>
                <dd>{peso(r.totalCost)}</dd>
              </div>
              <div>
                <dt>Selling price</dt>
                <dd>{peso(r.price)}</dd>
              </div>
              {r.discount > 0 && (
                <div>
                  <dt>Discount</dt>
                  <dd>−{peso(r.discount)}</dd>
                </div>
              )}
              {q.vat && (
                <div>
                  <dt>VAT {r.vatRate}%</dt>
                  <dd>{peso(r.vat)}</dd>
                </div>
              )}
              <div className="strong">
                <dt>Customer pays</dt>
                <dd>{peso(r.grandTotal)}</dd>
              </div>
            </dl>
            <div className={`profit${lowMargin ? ' profit--low' : ''}`}>
              <div>
                <span>Gross profit</span>
                <b>{pesoShort(r.profit)}</b>
              </div>
              <div>
                <span>Margin</span>
                <b>{pct(r.margin)}</b>
              </div>
              <div>
                <span>Markup</span>
                <b>{pct(r.markup)}</b>
              </div>
            </div>
            {lowMargin && <p className="small bad">Below your {settings.minMarginPct}% minimum margin.</p>}
          </div>

          <div className="card summary__card summary__sys">
            <div className="mini-grid">
              <div>
                <span>System</span>
                <b>{num(r.kWp, 2)} kWp</b>
              </div>
              <div>
                <span>Battery</span>
                <b>{r.batteryKWh ? `${num(r.batteryKWh, 2)} kWh` : '—'}</b>
              </div>
              <div>
                <span>Produces</span>
                <b>~{num(r.monthlyKWh)} kWh/mo</b>
              </div>
              <div>
                <span>Roof area</span>
                <b>~{r.roofM2} m²</b>
              </div>
              {r.savings && (
                <>
                  <div>
                    <span>Customer saves</span>
                    <b className="good">{pesoShort(r.savings.savings)}/mo</b>
                  </div>
                  <div>
                    <span>Payback</span>
                    <b>{years(r.payback)}</b>
                  </div>
                </>
              )}
            </div>
            <a className={`checks-pill checks-pill--${r.errors ? 'error' : r.warnings ? 'warn' : 'ok'}`} href="#" onClick={(e) => {
              e.preventDefault();
              document.querySelector('.checks')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}>
              <Icon name={r.errors || r.warnings ? 'alert' : 'check'} size={16} />
              {r.errors ? `${r.errors} problem${r.errors > 1 ? 's' : ''} to fix` : r.warnings ? `${r.warnings} thing${r.warnings > 1 ? 's' : ''} to check` : 'Design checks passed'}
            </a>
            <Badge status={q.status} />
          </div>
        </aside>
      </div>
      {limit && <DemoInfo reason={`The demo keeps up to ${config.demoMaxQuotes} quotes. Delete one to duplicate this quote.`} onClose={() => setLimit(false)} />}
    </div>
  );
}
