// Run with: npm test
import { buildQuote, stringLimits, autoLayout, autoQuantities, suggestPanels, findItem, mpptGroups, costAmount } from '../src/lib/engine.js';
import { seedLibrary } from '../src/data/library.js';
import { defaultSettings, blankQuote } from '../src/lib/defaults.js';
import { parseInquiry } from '../src/lib/inquiry.js';
import { parseCSV, guessMapping, guessCategory, toNumber } from '../src/lib/csv.js';

let fails = 0;
const ok = (name, cond, info = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : '  → ' + info}`);
  if (!cond) fails++;
};
const near = (a, b, t = 0.01) => Math.abs(a - b) <= t;

const lib = seedLibrary;
const settings = { ...defaultSettings, today: '2026-11-26' };
const env = settings.design;
const panel = findItem(lib, 'pnl-620-topcon');
const deye6 = findItem(lib, 'inv-deye-6k-hyb');
const growatt5 = findItem(lib, 'inv-growatt-5k-grid');

// ---- Temperature-corrected voltages ----
const lim = stringLimits(panel, deye6, env);
ok('Voc at 15°C = 53.37 V', near(lim.vocCold, 53.3725), lim.vocCold);
ok('Vmp at 70°C = 37.71 V', near(lim.vmpHot, 37.7129), lim.vmpHot);
ok('Deye 6K: max 9 panels per string', lim.max === 9, lim.max);
ok('Deye 6K: min 4 panels per string', lim.min === 4, lim.min);

// ---- Auto string layout ----
ok('10 panels → 5 + 5', autoLayout(10, panel, deye6, env).strings.join('+') === '5+5');
ok('9 panels → 5 + 4 (one string per MPPT)', autoLayout(9, panel, deye6, env).strings.join('+') === '5+4');
ok('6 panels → 3+3 too short → one string of 6', autoLayout(6, panel, deye6, env).strings.join('+') === '6');
ok('13 panels → 7 + 6', autoLayout(13, panel, deye6, env).strings.join('+') === '7+6');
ok('3 panels → not valid', autoLayout(3, panel, deye6, env).ok === false);
ok('22 panels on Growatt 5K → not valid (2 MPPT × 1 string, max 10)', autoLayout(22, panel, growatt5, env).ok === false);
ok('MPPT grouping', JSON.stringify(mpptGroups([5, 5, 5, 5], 2)) === '[[5,5],[5,5]]');

// ---- Full hybrid quote: 10 × 620W, Deye 6K, 2 × 5.12 kWh ----
const q = {
  ...blankQuote(settings, 'Q-2026-001'),
  system: 'hybrid',
  panelId: 'pnl-620-topcon',
  panelQty: 10,
  inverterId: 'inv-deye-6k-hyb',
  batteryId: 'bat-512-100',
  batteryQty: 2,
  sizing: { bill: 10000, rate: 15.55, dayShare: 0.45, target: 0.8 },
};
const r = buildQuote(q, lib, settings);
ok('kWp 6.2', r.kWp === 6.2, r.kWp);
ok('battery 10.24 kWh', r.batteryKWh === 10.24, r.batteryKWh);
ok('strings 5+5', r.layout.strings.join('+') === '5+5');
ok('no errors', r.errors === 0, JSON.stringify(r.checks.filter((c) => c.level === 'error')));
ok('warns: 14.52 A panel current above 13 A MPPT input (×2)', r.checks.filter((c) => c.level === 'warn' && /input limit/.test(c.text)).length === 2, JSON.stringify(r.checks));
ok('battery voltage ok', r.checks.some((c) => c.level === 'ok' && /matches the inverter/.test(c.text)));

const qty = (role) => r.lines.find((l) => l.role === role)?.qty;
ok('rails 11', qty('rail') === 11, qty('rail'));
ok('L-feet 23', qty('lfoot') === 23, qty('lfoot'));
ok('mid clamps 16', qty('midclamp') === 16, qty('midclamp'));
ok('end clamps 8', qty('endclamp') === 8, qty('endclamp'));
ok('PV cable 80 m', qty('pvcable') === 80, qty('pvcable'));
ok('MC4 6 pairs', qty('mc4') === 6, qty('mc4'));
ok('DC breakers 2 (one per MPPT)', qty('dcbreaker') === 2, qty('dcbreaker'));
ok('AC breakers 2 for hybrid', qty('acbreaker') === 2, qty('acbreaker'));
ok('battery cable set 1', qty('batterycable') === 1);

ok('materials ₱253,490.80', near(r.materials, 253490.8), r.materials);
ok('services ₱92,500', near(r.services, 92500), r.services); // labor 62,000 + transport 6,000 + 10,000 + 8,000 + 5,000 + 1,500
ok('subtotal ₱345,990.80', near(r.subtotal, 345990.8), r.subtotal);
ok('contingency 3% ₱10,379.72', near(r.contingency, 10379.72), r.contingency);
ok('total cost ₱356,370.52', near(r.totalCost, 356370.52), r.totalCost);
ok('price at 25% margin → ₱476,000 (rounded up to ₱1,000)', r.price === 476000, r.price);
ok('VAT off by default', r.vat === 0 && r.grandTotal === 476000);
ok('profit ₱119,629.48', near(r.profit, 119629.48), r.profit);
ok('margin ≈ 25.1%', near(r.margin, 0.2513, 0.001), r.margin);
ok('customer line prices add up to the price', near(r.sellMaterials + r.sellServices, r.price, 0.01), r.sellMaterials + r.sellServices);
ok('savings ₱9,277/month', r.savings.savings === 9277, r.savings.savings);
ok('payback ~4.3 years', near(r.payback, 476000 / (9277 * 12), 0.001), r.payback);

// Markup, VAT and discount
const r2 = buildQuote({ ...q, pricingMode: 'markup', pricingPct: 20 }, lib, settings);
ok('20% markup → ₱428,000', r2.price === 428000, r2.price);
const r3 = buildQuote({ ...q, vat: true }, lib, settings);
ok('VAT 12% → ₱57,120, total ₱533,120', r3.vat === 57120 && r3.grandTotal === 533120, `${r3.vat} ${r3.grandTotal}`);
const r4 = buildQuote({ ...q, discount: 6000 }, lib, settings);
ok('discount → net ₱470,000', r4.net === 470000, r4.net);

// Overrides and extra lines
const r5 = buildQuote({ ...q, overrides: { rail: { qty: 14 }, conduit: { off: true } }, extraLines: [{ id: 'x1', name: 'Scaffolding rental', unit: 'lot', qty: 1, cost: 4000 }] }, lib, settings);
ok('override rail qty 14', r5.lines.find((l) => l.role === 'rail').qty === 14);
ok('conduit turned off', !r5.lines.some((l) => l.role === 'conduit'));
ok('custom line added', r5.lines.some((l) => l.name === 'Scaffolding rental' && l.total === 4000));

// Grid-tie with hybrid-only issues
const g = buildQuote({ ...q, system: 'grid', inverterId: 'inv-growatt-5k-grid', panelQty: 22 }, lib, settings);
ok('grid-tie ignores battery', g.batteryKWh === 0 && !g.lines.some((l) => l.category === 'battery'));
ok('22 panels on 5K grid-tie → errors (strings + PV input)', g.errors >= 2, JSON.stringify(g.checks));
const g2 = buildQuote({ ...q, system: 'hybrid', inverterId: 'inv-growatt-5k-grid' }, lib, settings);
ok('hybrid system with grid-tie inverter → error', g2.checks.some((c) => c.level === 'error' && /cannot charge batteries/.test(c.text)));
const lib12 = [...lib, { id: 'b12', category: 'battery', model: '12.8V', cost: 1, specs: { voltage: 12.8, kwh: 1.28, maxParallel: 4 } }];
const g3 = buildQuote({ ...q, batteryId: 'b12', batteryQty: 2 }, lib12, settings);
ok('12.8 V battery on 48 V inverter → error', g3.checks.some((c) => c.level === 'error' && /needs a 48 V battery/.test(c.text)));
const g4 = buildQuote({ ...q, batteryId: 'b12', batteryQty: 6 }, lib12, settings);
ok('too many batteries in parallel → error', g4.checks.some((c) => /in parallel/.test(c.text)));

// Manual strings
const m = buildQuote({ ...q, layoutMode: 'manual', manualStrings: [6, 3] }, lib, settings);
ok('manual strings mismatch → error', m.checks.some((c) => /add up to 9/.test(c.text)));
const m2 = buildQuote({ ...q, layoutMode: 'manual', manualStrings: [10] }, lib, settings);
ok('manual string of 10 → over max voltage error', m2.checks.some((c) => c.level === 'error' && /above the inverter's 500 V/.test(c.text)));

// Suggestion & cost modes
ok('₱10,000 bill → suggest 8 × 620W', suggestPanels({ bill: 10000, rate: 15.55, target: 0.8 }, panel, env) === 8);
ok('cost per kWp', costAmount({ mode: 'perKWp', amount: 10000 }, 6.2) === 62000);
ok('cost per trip', costAmount({ mode: 'perTrip', amount: 3000, qty: 3 }, 6.2) === 9000);

// Price freshness
const old = buildQuote(q, lib.map((i) => (i.id === 'pnl-620-topcon' ? { ...i, updated: '2026-08-01' } : i)), settings);
ok('stale price flagged after 60 days', old.stale.length === 1 && old.stale[0].itemId === 'pnl-620-topcon');

ok('auto quantities with no panels are zero', autoQuantities({ quote: { panelQty: 0 }, panel, inverter: null, battery: null, layout: { strings: [] } }).midclamp === 0);

// Messenger inquiry from the website
const msg = `☀️ SOLAR INQUIRY — Liwanag Solar

Name: Juan Dela Cruz
Mobile: 0917 123 4567
Location: Brgy. San Isidro, Lipa City
Property: House
Roof: Metal / GI sheet

MY CALCULATOR ESTIMATE:
• Monthly bill: ₱12,500 at ₱15.55/kWh (~804 kWh)
• System: Hybrid, 6.20 kWp (10 × 620W panels), 5 kW inverter, 10.24 kWh battery
• Usage: Mostly at night, net metering yes
• Est. savings: ₱8,023/month (bill ~₱4,477)`;
const inq = parseInquiry(msg);
ok('inquiry: name/phone/location', inq.customer.name === 'Juan Dela Cruz' && inq.customer.phone === '0917 123 4567' && /Lipa/.test(inq.customer.address));
ok('inquiry: bill and rate', inq.sizing.bill === 12500 && inq.sizing.rate === 15.55, JSON.stringify(inq.sizing));
ok('inquiry: hybrid, 10 panels, night use', inq.system === 'hybrid' && inq.panelQty === 10 && inq.sizing.dayShare === 0.3);
ok('inquiry: roof in notes', /Metal/.test(inq.notes));

// Supplier CSV
const rows = parseCSV('Item Description;Brand;Installer Price;Unit\n"Hybrid Inverter 6kW";Deye;"₱53,000.00";pc\nMono Panel 620W;Jinko;7,450;pc\n');
ok('CSV with semicolons + quotes', rows.length === 3 && rows[1][0] === 'Hybrid Inverter 6kW' && rows[1][2] === '₱53,000.00', JSON.stringify(rows));
const map = guessMapping(rows[0]);
ok('column guess: model, brand, cost, unit', map.model === 0 && map.brand === 1 && map.cost === 2 && map.unit === 3, JSON.stringify(map));
ok('price text → number', toNumber('₱53,000.00') === 53000 && toNumber('7,450') === 7450);
ok('category guess', guessCategory('Hybrid Inverter 6kW') === 'inverter' && guessCategory('Mono Panel 620W') === 'panel' && guessCategory('LiFePO4 51.2V 100Ah') === 'battery' && guessCategory('Mid clamp 35mm') === 'mounting');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
