import { useMemo, useState } from 'react';
import { useStore, newQuote } from '../store/store.jsx';
import { buildQuote } from '../lib/engine.js';
import { parseInquiry } from '../lib/inquiry.js';
import { suggestPanels, findItem } from '../lib/engine.js';
import { pesoShort, num, pct, fmtDate, uid } from '../lib/format.js';
import { Icon, Badge, Empty, Modal, useConfirm, toast } from '../components/ui.jsx';

const STATUSES = ['draft', 'sent', 'won', 'lost'];
const SYS = { grid: 'Grid-tie', hybrid: 'Hybrid', offgrid: 'Off-grid' };

function PasteInquiry({ onClose, onCreate }) {
  const [text, setText] = useState('');
  const parsed = text.trim() ? parseInquiry(text) : null;
  return (
    <Modal
      title="New quote from a Messenger inquiry"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!parsed?.found} onClick={() => onCreate(parsed)}>
            Create quote
          </button>
        </>
      }
    >
      <p className="muted small">Copy the whole message the customer sent from your website and paste it here. The name, contact, location and calculator estimate are filled in for you.</p>
      <textarea className="input paste" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="☀️ SOLAR INQUIRY — …" />
      {parsed && (
        <div className={`parsed${parsed.found ? '' : ' parsed--bad'}`}>
          {parsed.found ? (
            <>
              <b>Found:</b> {parsed.customer.name || 'no name'} · {parsed.customer.phone || 'no number'} · {parsed.customer.address || 'no location'}
              {parsed.sizing.bill ? ` · bill ${pesoShort(parsed.sizing.bill)}` : ''}
              {parsed.system ? ` · ${SYS[parsed.system]}` : ''}
              {parsed.panelQty ? ` · ${parsed.panelQty} panels` : ''}
            </>
          ) : (
            'This does not look like an inquiry from the website. You can still create a blank quote instead.'
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Quotes({ go }) {
  const { state, settingsWithToday, saveQuote, removeQuote } = useStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [paste, setPaste] = useState(false);
  const [ask, dialog] = useConfirm();

  const rows = useMemo(
    () =>
      state.quotes.map((q) => ({ q, r: buildQuote(q, state.library, settingsWithToday) })).sort((a, b) => (b.q.date || '').localeCompare(a.q.date || '') || b.q.number.localeCompare(a.q.number)),
    [state.quotes, state.library, settingsWithToday]
  );

  const counts = STATUSES.reduce((o, s) => ({ ...o, [s]: rows.filter((x) => x.q.status === s) }), {});
  const sum = (list) => list.reduce((a, x) => a + x.r.grandTotal, 0);
  const open = [...counts.draft, ...counts.sent];
  const decided = counts.won.length + counts.lost.length;
  const avgMargin = rows.length ? rows.reduce((a, x) => a + x.r.margin, 0) / rows.length : 0;

  const shown = rows.filter(
    ({ q }) =>
      (filter === 'all' || q.status === filter) &&
      (!search || `${q.number} ${q.customer.name} ${q.customer.address}`.toLowerCase().includes(search.toLowerCase()))
  );

  const create = (patch = {}) => {
    const q = { ...newQuote(state), ...patch };
    saveQuote(q);
    go(`quote/${q.id}`);
  };

  const fromInquiry = (p) => {
    const q = newQuote(state);
    q.customer = { ...q.customer, ...Object.fromEntries(Object.entries(p.customer).filter(([, v]) => v)) };
    q.sizing = { ...q.sizing, ...Object.fromEntries(Object.entries(p.sizing).filter(([, v]) => v != null)) };
    if (p.system) q.system = p.system;
    q.notes = p.notes;
    const panel = findItem(state.library, q.panelId);
    q.panelQty = p.panelQty || suggestPanels({ ...q.sizing, system: q.system }, panel, state.settings.design) || q.panelQty;
    if (q.system === 'grid') q.inverterId = state.library.find((i) => i.category === 'inverter' && i.specs?.type === 'grid')?.id || q.inverterId;
    setPaste(false);
    saveQuote(q);
    toast('Quote created from inquiry');
    go(`quote/${q.id}`);
  };

  const duplicate = (q) => {
    const copy = { ...structuredClone(q), id: uid(), number: newQuote(state).number, status: 'draft', date: new Date().toISOString().slice(0, 10) };
    saveQuote(copy);
    toast(`Copied as ${copy.number}`);
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">Quotations</p>
          <h1>Quotes</h1>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => setPaste(true)}>
            <Icon name="paste" size={18} /> Paste inquiry
          </button>
          <button className="btn btn--primary" onClick={() => create()}>
            <Icon name="plus" size={18} /> New quote
          </button>
        </div>
      </div>

      <section className="kpis">
        <div className="kpi kpi--dark">
          <span>Open quotes</span>
          <strong>{pesoShort(sum(open))}</strong>
          <small>
            {open.length} draft or sent
          </small>
        </div>
        <div className="kpi">
          <span>Won</span>
          <strong>{pesoShort(sum(counts.won))}</strong>
          <small>
            {counts.won.length} project{counts.won.length === 1 ? '' : 's'}
            {decided ? ` · ${Math.round((counts.won.length / decided) * 100)}% win rate` : ''}
          </small>
        </div>
        <div className="kpi">
          <span>Average margin</span>
          <strong>{pct(avgMargin)}</strong>
          <small>gross profit ÷ price</small>
        </div>
        <div className="kpi">
          <span>Capacity quoted</span>
          <strong>{num(rows.reduce((a, x) => a + x.r.kWp, 0), 1)} kWp</strong>
          <small>{rows.length} quotes</small>
        </div>
      </section>

      <div className="toolbar">
        <div className="segmented" role="tablist">
          {['all', ...STATUSES].map((s) => (
            <button key={s} role="tab" aria-selected={filter === s} className={filter === s ? 'is-on' : ''} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
              <span>{s === 'all' ? rows.length : counts[s].length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <Icon name="search" size={18} />
          <input placeholder="Search customer or number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {!rows.length ? (
        <Empty
          icon="quote"
          title="No quotes yet"
          text="Create a quote, or paste a customer's inquiry from your website."
          action={
            <button className="btn btn--primary" onClick={() => create()}>
              <Icon name="plus" size={18} /> New quote
            </button>
          }
        />
      ) : (
        <div className="quote-list">
          {shown.map(({ q, r }) => (
            <article key={q.id} className="quote-row card" onClick={() => go(`quote/${q.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`quote/${q.id}`)}>
              <div className="quote-row__main">
                <span className="mono small muted">{q.number}</span>
                <b>{q.customer.name || 'Unnamed customer'}</b>
                <span className="muted small">{q.customer.address}</span>
              </div>
              <div className="quote-row__sys">
                <span className="tag">{SYS[q.system]}</span>
                <span className="small">
                  {num(r.kWp, 2)} kWp{r.batteryKWh ? ` · ${num(r.batteryKWh, 2)} kWh` : ''}
                </span>
                {r.errors > 0 && (
                  <span className="flag flag--bad">
                    <Icon name="alert" size={14} /> {r.errors} to fix
                  </span>
                )}
              </div>
              <div className="quote-row__money">
                <b>{pesoShort(r.grandTotal)}</b>
                <span className={`small ${r.margin * 100 < state.settings.minMarginPct ? 'bad' : 'muted'}`}>{pct(r.margin)} margin</span>
              </div>
              <div className="quote-row__status">
                <Badge status={q.status} />
                <span className="muted small">{fmtDate(q.date)}</span>
              </div>
              <div className="quote-row__actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" title="Duplicate" aria-label="Duplicate" onClick={() => duplicate(q)}>
                  <Icon name="dup" size={18} />
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => ask({ title: `Delete ${q.number}?`, message: 'This quote will be removed from this device.', onConfirm: () => removeQuote(q.id) })}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </article>
          ))}
          {!shown.length && <p className="muted center">No quotes match.</p>}
        </div>
      )}
      {paste && <PasteInquiry onClose={() => setPaste(false)} onCreate={fromInquiry} />}
      {dialog}
    </div>
  );
}
