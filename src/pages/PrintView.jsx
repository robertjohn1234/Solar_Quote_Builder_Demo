import { useMemo } from 'react';
import { useStore } from '../store/store.jsx';
import { buildQuote } from '../lib/engine.js';
import { CATEGORIES } from '../data/library.js';
import { peso, pesoShort, num, pct, fmtDate, addDays, years } from '../lib/format.js';
import { Icon } from '../components/ui.jsx';
import { DemoWatermark } from '../components/Demo.jsx';

const SYS = { grid: 'Grid-tie solar PV system', hybrid: 'Hybrid solar PV system with battery storage', offgrid: 'Off-grid solar PV system with battery storage' };

function Header({ co, title, q }) {
  return (
    <header className="doc__head">
      <div className="doc__brand">
        <span className="doc__mark">
          <Icon name="sun" size={22} />
        </span>
        <div>
          <b>{co.name}</b>
          <span>{co.tagline}</span>
          <span>
            {co.address}
            {co.phone ? ` · ${co.phone}` : ''}
            {co.email ? ` · ${co.email}` : ''}
          </span>
          {co.tin && <span>TIN {co.tin}</span>}
        </div>
      </div>
      <div className="doc__meta">
        <h1>{title}</h1>
        <dl>
          <div>
            <dt>No.</dt>
            <dd>{q.number}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{fmtDate(q.date)}</dd>
          </div>
          <div>
            <dt>Valid until</dt>
            <dd>{fmtDate(addDays(q.date, q.validityDays))}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

function CustomerQuote({ q, r, s }) {
  let groups = CATEGORIES.map((c) => ({ ...c, lines: r.sellLines.filter((l) => l.category === c.id) })).filter((g) => g.lines.length);
  // Customer copy: mounting and wiring shown as lots (the full list stays on the costing sheet)
  if (q.groupBos !== false) {
    const lot = (ids, key, title) => {
      const ls = r.sellLines.filter((l) => ids.includes(l.category));
      if (!ls.length) return null;
      const total = ls.reduce((a, l) => a + l.sellTotal, 0);
      return { key, qty: 1, unit: 'lot', name: `${title}: ${ls.map((l) => l.name.replace(/\s*\(.*?\)/g, '')).join(', ')}`, sellUnit: total, sellTotal: total };
    };
    const mount = lot(['mounting'], 'lot-mount', 'Mounting system');
    const elec = lot(['dc', 'ac'], 'lot-elec', 'Electrical balance of system');
    groups = groups.filter((g) => !['mounting', 'dc', 'ac'].includes(g.id));
    const bos = [mount, elec].filter(Boolean);
    if (bos.length) groups.push({ id: 'bos', label: 'Mounting & electrical', lines: bos });
  }
  const showPrices = q.showLinePrices;
  return (
    <>
      <Header co={s.company} title="Quotation" q={q} />
      <section className="doc__to">
        <div>
          <span className="doc__label">Prepared for</span>
          <b>{q.customer.name || '—'}</b>
          <span>{q.customer.address}</span>
          <span>
            {q.customer.phone}
            {q.customer.email ? ` · ${q.customer.email}` : ''}
          </span>
        </div>
        <div className="doc__system">
          <span className="doc__label">Proposed system</span>
          <b>{SYS[q.system]}</b>
          <div className="doc__specs">
            <span>
              <strong>{num(r.kWp, 2)} kWp</strong> solar
            </span>
            {r.inverter && (
              <span>
                <strong>{num(r.inverter.specs.acKW * q.inverterQty, 1)} kW</strong> inverter
              </span>
            )}
            {r.batteryKWh > 0 && (
              <span>
                <strong>{num(r.batteryKWh, 2)} kWh</strong> battery
              </span>
            )}
            <span>
              <strong>~{num(r.monthlyKWh)} kWh</strong> per month
            </span>
          </div>
        </div>
      </section>

      <table className="doc__table">
        <thead>
          <tr>
            <th className="w-qty">Qty</th>
            <th>Description</th>
            {showPrices && <th className="num">Unit price</th>}
            {showPrices && <th className="num">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <GroupRows key={g.id} g={g} showPrices={showPrices} />
          ))}
          <tr className="doc__group">
            <td colSpan={showPrices ? 4 : 2}>Services</td>
          </tr>
          <tr>
            <td className="w-qty">1 lot</td>
            <td>
              Installation, transport, electrical plans, permits{q.system !== 'offgrid' ? ', net-metering application' : ''}, testing & commissioning
            </td>
            {showPrices && <td className="num">{peso(r.sellServices)}</td>}
            {showPrices && <td className="num">{peso(r.sellServices)}</td>}
          </tr>
        </tbody>
      </table>

      <section className="doc__bottom">
        <div className="doc__terms">
          {r.savings && (
            <div className="doc__savings">
              <span className="doc__label">Estimated savings</span>
              <p>
                With a monthly bill of about <b>{pesoShort(q.sizing.bill)}</b>, this system is estimated to save about <b>{pesoShort(r.savings.savings)} per month</b> (payback in about{' '}
                <b>{years(r.payback)}</b>). Estimate based on average sunlight and today's electricity rate; actual results vary.
              </p>
            </div>
          )}
          <span className="doc__label">Payment terms</span>
          <p className="pre">{q.paymentTerms}</p>
          <span className="doc__label">Warranty</span>
          <p>{s.warranty}</p>
          {(q.notes || s.quoteNotes) && (
            <>
              <span className="doc__label">Notes</span>
              {q.notes && <p className="pre">{q.notes}</p>}
              {s.quoteNotes && <p>{s.quoteNotes}</p>}
            </>
          )}
        </div>
        <div className="doc__totals">
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{peso(r.price)}</dd>
            </div>
            {r.discount > 0 && (
              <div>
                <dt>Discount</dt>
                <dd>−{peso(r.discount)}</dd>
              </div>
            )}
            {q.vat ? (
              <div>
                <dt>VAT {r.vatRate}%</dt>
                <dd>{peso(r.vat)}</dd>
              </div>
            ) : (
              <div className="muted">
                <dt>VAT</dt>
                <dd>Not applicable</dd>
              </div>
            )}
            <div className="doc__grand">
              <dt>Total</dt>
              <dd>{peso(r.grandTotal)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="doc__sign">
        <div>
          <span className="line" />
          <b>{s.company.preparedBy || s.company.name}</b>
          <span>Prepared by</span>
        </div>
        <div>
          <span className="line" />
          <b>{q.customer.name || 'Customer'}</b>
          <span>Conforme — signature over printed name & date</span>
        </div>
      </section>
    </>
  );
}

function GroupRows({ g, showPrices }) {
  return (
    <>
      <tr className="doc__group">
        <td colSpan={showPrices ? 4 : 2}>{g.label}</td>
      </tr>
      {g.lines.map((l) => (
        <tr key={l.key}>
          <td className="w-qty">
            {num(l.qty, l.qty % 1 ? 2 : 0)} {l.unit}
          </td>
          <td>{l.name}</td>
          {showPrices && <td className="num">{peso(l.sellUnit)}</td>}
          {showPrices && <td className="num">{peso(l.sellTotal)}</td>}
        </tr>
      ))}
    </>
  );
}

function CostingSheet({ q, r, s }) {
  return (
    <>
      <Header co={s.company} title="Costing sheet" q={q} />
      <p className="doc__internal">
        <Icon name="alert" size={16} /> Internal — do not send to the customer
      </p>
      <section className="doc__to">
        <div>
          <span className="doc__label">Customer</span>
          <b>{q.customer.name || '—'}</b>
          <span>{q.customer.address}</span>
        </div>
        <div>
          <span className="doc__label">System</span>
          <b>
            {SYS[q.system]} · {num(r.kWp, 2)} kWp{r.batteryKWh ? ` · ${num(r.batteryKWh, 2)} kWh` : ''}
          </b>
          <span>Strings: {r.layout.strings.join(' + ') || '—'} panels</span>
        </div>
      </section>
      <table className="doc__table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit cost</th>
            <th className="num">Cost</th>
            <th className="num">Price updated</th>
          </tr>
        </thead>
        <tbody>
          {r.lines.map((l) => (
            <tr key={l.key}>
              <td>{l.name}</td>
              <td className="num">
                {num(l.qty, l.qty % 1 ? 2 : 0)} {l.unit}
              </td>
              <td className="num">{peso(l.unitCost)}</td>
              <td className="num">{peso(l.total)}</td>
              <td className="num">{l.updated ? fmtDate(l.updated) : ''}</td>
            </tr>
          ))}
          <tr className="doc__sub">
            <td colSpan={3}>Materials</td>
            <td className="num">{peso(r.materials)}</td>
            <td />
          </tr>
          {r.costs.map((c) => (
            <tr key={c.id}>
              <td>{c.label}</td>
              <td className="num">{c.mode === 'perKWp' ? `${num(r.kWp, 2)} kWp` : c.mode === 'perTrip' || c.mode === 'perUnit' ? num(c.qty) : '1'}</td>
              <td className="num">{peso(c.amount)}</td>
              <td className="num">{peso(c.total)}</td>
              <td />
            </tr>
          ))}
          <tr className="doc__sub">
            <td colSpan={3}>Labor & project costs</td>
            <td className="num">{peso(r.services)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <section className="doc__bottom">
        <div className="doc__terms">
          <span className="doc__label">Design checks</span>
          <ul className="doc__checks">
            {r.checks.map((c, i) => (
              <li key={i} className={`check--${c.level}`}>
                {c.level === 'ok' ? '✓' : '!'} {c.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="doc__totals">
          <dl>
            <div>
              <dt>Subtotal cost</dt>
              <dd>{peso(r.subtotal)}</dd>
            </div>
            <div>
              <dt>Contingency {q.contingencyPct}%</dt>
              <dd>{peso(r.contingency)}</dd>
            </div>
            <div className="doc__strong">
              <dt>Total cost</dt>
              <dd>{peso(r.totalCost)}</dd>
            </div>
            <div>
              <dt>
                Price ({q.pricingMode} {q.pricingPct}%)
              </dt>
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
            <div className="doc__grand">
              <dt>Customer pays</dt>
              <dd>{peso(r.grandTotal)}</dd>
            </div>
            <div className="doc__strong good">
              <dt>Gross profit</dt>
              <dd>
                {peso(r.profit)} · {pct(r.margin)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}

export default function PrintView({ id, view, go }) {
  const { state, settingsWithToday } = useStore();
  const q = state.quotes.find((x) => x.id === id);
  const r = useMemo(() => (q ? buildQuote(q, state.library, settingsWithToday) : null), [q, state.library, settingsWithToday]);
  if (!q) {
    return (
      <div className="page">
        <p>Quote not found.</p>
        <button className="btn" onClick={() => go('quotes')}>
          Back
        </button>
      </div>
    );
  }
  const internal = view === 'internal';
  return (
    <div className="print-page">
      <div className="print-bar">
        <button className="btn btn--ghost btn--sm" onClick={() => go(`quote/${q.id}`)}>
          <Icon name="back" size={18} /> Back to quote
        </button>
        <div className="segmented segmented--sm">
          <button className={!internal ? 'is-on' : ''} onClick={() => go(`print/${q.id}/customer`)}>
            Quotation
          </button>
          <button className={internal ? 'is-on' : ''} onClick={() => go(`print/${q.id}/internal`)}>
            Costing sheet
          </button>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => window.print()}>
          <Icon name="print" size={18} /> Print / Save as PDF
        </button>
      </div>
      {r.errors > 0 && !internal && (
        <p className="print-warn">
          <Icon name="alert" size={16} /> This quote still has {r.errors} design problem{r.errors > 1 ? 's' : ''}. Fix them before sending.
        </p>
      )}
      <article className="doc">
        <DemoWatermark />
        {internal ? <CostingSheet q={q} r={r} s={state.settings} /> : <CustomerQuote q={q} r={r} s={state.settings} />}
      </article>
    </div>
  );
}
