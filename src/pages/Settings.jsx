import { useRef, useState } from 'react';
import { useStore } from '../store/store.jsx';
import { todayISO, download, fmtDate, uid } from '../lib/format.js';
import { Icon, Field, useConfirm, toast } from '../components/ui.jsx';
import { isDemo } from '../config.js';

const COST_MODES = [
  { id: 'fixed', label: 'Fixed amount' },
  { id: 'perKWp', label: 'Per kWp' },
  { id: 'perTrip', label: 'Per trip' },
  { id: 'perUnit', label: 'Per unit' },
];

export default function Settings() {
  const { state, saveSettings, replaceAll, loadSample, eraseAll, markBackedUp } = useStore();
  const [s, setS] = useState(() => structuredClone(state.settings));
  const [ask, dialog] = useConfirm();
  const fileRef = useRef(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(state.settings);

  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const setCo = (k, v) => setS((x) => ({ ...x, company: { ...x.company, [k]: v } }));
  const setDe = (k, v) => setS((x) => ({ ...x, design: { ...x.design, [k]: v === '' ? '' : Number(v) } }));
  const setCost = (id, patch) => set('costItems', s.costItems.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const save = () => {
    saveSettings(s);
    toast('Settings saved — new quotes will use them');
  };

  const backup = () => {
    download(`quote-builder-backup-${todayISO()}.json`, JSON.stringify({ ...state, app: 'liwanag-quote', exportedAt: new Date().toISOString() }, null, 2), 'application/json');
    markBackedUp();
    toast('Backup file saved');
  };
  const restore = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.settings || !Array.isArray(data.library)) throw new Error('bad');
        ask({
          title: 'Restore this backup?',
          message: `It has ${data.quotes?.length || 0} quotes and ${data.library.length} materials. Everything on this device will be replaced.`,
          confirmLabel: 'Restore',
          danger: false,
          onConfirm: () => {
            replaceAll(data);
            setS(structuredClone({ ...state.settings, ...data.settings }));
            toast('Backup restored');
          },
        });
      } catch {
        toast("That file isn't a quote builder backup");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page settings">
      <div className="page__head">
        <div>
          <p className="eyebrow">Company, pricing & defaults</p>
          <h1>Settings</h1>
        </div>
      </div>

      <section className="card section">
        <div className="section__head">
          <h2>
            <Icon name="quote" size={18} /> Company (shown on quotations)
          </h2>
        </div>
        <div className="grid-3">
          <Field label="Company name" hint={isDemo ? 'Locked in the demo' : undefined}>
            <input className="input" value={s.company.name} onChange={(e) => setCo('name', e.target.value)} disabled={isDemo} />
          </Field>
          <Field label="Tagline">
            <input className="input" value={s.company.tagline} onChange={(e) => setCo('tagline', e.target.value)} />
          </Field>
          <Field label="Address">
            <input className="input" value={s.company.address} onChange={(e) => setCo('address', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" value={s.company.phone} onChange={(e) => setCo('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" value={s.company.email} onChange={(e) => setCo('email', e.target.value)} />
          </Field>
          <Field label="TIN (optional)">
            <input className="input" value={s.company.tin} onChange={(e) => setCo('tin', e.target.value)} />
          </Field>
          <Field label="Prepared by (name on quotes)">
            <input className="input" value={s.company.preparedBy} onChange={(e) => setCo('preparedBy', e.target.value)} />
          </Field>
          <Field label="Quote number prefix" hint="e.g. Q → Q-2026-001">
            <input className="input" value={s.quotePrefix} onChange={(e) => set('quotePrefix', e.target.value.replace(/\s/g, '') || 'Q')} />
          </Field>
          <Field label="Quotes valid for (days)">
            <input className="input" type="number" min="1" value={s.validityDays} onChange={(e) => set('validityDays', Number(e.target.value) || 1)} />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Default payment terms">
            <textarea className="input" rows={4} value={s.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
          </Field>
          <Field label="Warranty (printed on quotes)">
            <textarea className="input" rows={4} value={s.warranty} onChange={(e) => set('warranty', e.target.value)} />
          </Field>
          <Field label="Standard note (printed on quotes)">
            <textarea className="input" rows={4} value={s.quoteNotes} onChange={(e) => set('quoteNotes', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card section">
        <div className="section__head">
          <h2>
            <Icon name="peso" size={18} /> Pricing defaults for new quotes
          </h2>
        </div>
        <div className="grid-4">
          <Field label="Pricing method">
            <select className="input" value={s.pricingMode} onChange={(e) => set('pricingMode', e.target.value)}>
              <option value="margin">Margin (% of price)</option>
              <option value="markup">Markup (% on cost)</option>
            </select>
          </Field>
          <Field label={s.pricingMode === 'margin' ? 'Target margin %' : 'Markup %'}>
            <input className="input" type="number" min="0" value={s.pricingPct} onChange={(e) => set('pricingPct', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Warn below margin %">
            <input className="input" type="number" min="0" value={s.minMarginPct} onChange={(e) => set('minMarginPct', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Contingency %">
            <input className="input" type="number" min="0" step="0.5" value={s.contingencyPct} onChange={(e) => set('contingencyPct', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Round prices up to">
            <select className="input" value={s.roundTo} onChange={(e) => set('roundTo', Number(e.target.value))}>
              {[1, 100, 500, 1000, 5000].map((v) => (
                <option key={v} value={v}>
                  {v === 1 ? 'No rounding' : `₱${v.toLocaleString('en-PH')}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="VAT on new quotes">
            <label className="switch">
              <input type="checkbox" checked={s.vat} onChange={(e) => set('vat', e.target.checked)} />
              <span>{s.vat ? 'On' : 'Off (non-VAT)'}</span>
            </label>
          </Field>
          <Field label="VAT rate %">
            <input className="input" type="number" min="0" value={s.vatRate} onChange={(e) => set('vatRate', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Flag prices older than (days)">
            <input className="input" type="number" min="1" value={s.staleDays} onChange={(e) => set('staleDays', Number(e.target.value) || 60)} />
          </Field>
        </div>
        <p className="small muted">Margin 25% means profit is 25% of the selling price (cost ÷ 0.75). Markup 25% means cost × 1.25 — a lower price.</p>
      </section>

      <section className="card section">
        <div className="section__head">
          <h2>
            <Icon name="bolt" size={18} /> Standard project costs
          </h2>
          <span className="muted small">Copied into every new quote — editable per quote</span>
        </div>
        <div className="costs">
          {s.costItems.map((c) => (
            <div key={c.id} className="cost cost--settings">
              <input className="input cost__label" value={c.label} onChange={(e) => setCost(c.id, { label: e.target.value })} aria-label="Cost name" />
              <select className="input cost__mode" value={c.mode} onChange={(e) => setCost(c.id, { mode: e.target.value })} aria-label="How it is charged">
                {COST_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input className="input cost__amt" type="number" min="0" value={c.amount} onChange={(e) => setCost(c.id, { amount: Number(e.target.value) || 0 })} aria-label="Amount" />
              {(c.mode === 'perTrip' || c.mode === 'perUnit') && (
                <input className="input cost__qty" type="number" min="0" value={c.qty ?? 1} onChange={(e) => setCost(c.id, { qty: Number(e.target.value) || 0 })} aria-label="Default quantity" />
              )}
              <span className="cost__total small muted">{c.note}</span>
              <button className="icon-btn" aria-label={`Remove ${c.label}`} onClick={() => set('costItems', s.costItems.filter((x) => x.id !== c.id))}>
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => set('costItems', [...s.costItems, { id: uid(), label: 'New cost', mode: 'fixed', amount: 0, note: '' }])}>
          <Icon name="plus" size={16} /> Add cost
        </button>
      </section>

      <section className="card section">
        <div className="section__head">
          <h2>
            <Icon name="sun" size={18} /> Design assumptions
          </h2>
        </div>
        <div className="grid-3">
          <Field label="Coldest panel temperature (°C)" hint="Early morning. Lower = stricter max string voltage.">
            <input className="input" type="number" value={s.design.tMinC} onChange={(e) => setDe('tMinC', e.target.value)} />
          </Field>
          <Field label="Hottest panel temperature (°C)" hint="Noon on a hot roof. Higher = stricter min string voltage.">
            <input className="input" type="number" value={s.design.tMaxCellC} onChange={(e) => setDe('tMaxCellC', e.target.value)} />
          </Field>
          <Field label="Peak sun hours per day">
            <input className="input" type="number" step="0.1" value={s.design.peakSunHours} onChange={(e) => setDe('peakSunHours', e.target.value)} />
          </Field>
          <Field label="System efficiency (0–1)">
            <input className="input" type="number" step="0.01" value={s.design.performanceRatio} onChange={(e) => setDe('performanceRatio', e.target.value)} />
          </Field>
          <Field label="Electricity rate (₱/kWh)" hint="Meralco residential, Nov 2026: ₱15.55">
            <input className="input" type="number" step="0.01" value={s.design.defaultRate} onChange={(e) => setDe('defaultRate', e.target.value)} />
          </Field>
          <Field label="Net-metering credit (₱/kWh)">
            <input className="input" type="number" step="0.1" value={s.design.exportRate} onChange={(e) => setDe('exportRate', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card section">
        <div className="section__head">
          <h2>
            <Icon name="download" size={18} /> Backup & restore
          </h2>
        </div>
        <p className="small">
          Your quotes and materials are saved <b>only in this browser on this device</b>. Save a backup file regularly. Last backup: <b>{state.lastBackup ? fmtDate(state.lastBackup) : 'never'}</b>.
        </p>
        {isDemo && <p className="notice notice--warn">Backup and restore are turned off in the demo.</p>}
        <div className="row-actions">
          <button className="btn btn--primary" onClick={backup} disabled={isDemo}>
            <Icon name="download" size={18} /> Save backup file
          </button>
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={isDemo}>
            <Icon name="upload" size={18} /> Restore from file
          </button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => restore(e.target.files[0])} />
        </div>
        <div className="row-actions danger-zone">
          <button className="btn btn--ghost btn--sm" onClick={() => ask({ title: 'Load sample data?', message: 'Replaces everything with 3 sample quotes and the starting materials.', confirmLabel: 'Load sample', danger: false, onConfirm: loadSample })}>
            Load sample data
          </button>
          <button className="btn btn--danger-ghost btn--sm" onClick={() => ask({ title: 'Start over?', message: 'Deletes all quotes and resets settings. Materials go back to the starting library. Save a backup first.', confirmLabel: 'Erase everything', onConfirm: eraseAll })}>
            Erase everything
          </button>
        </div>
      </section>

      {dirty && (
        <div className="save-bar">
          <span>You have unsaved changes</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setS(structuredClone(state.settings))}>
            Undo
          </button>
          <button className="btn btn--sun btn--sm" onClick={save}>
            Save settings
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
}
