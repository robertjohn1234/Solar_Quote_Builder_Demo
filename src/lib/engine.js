// Quote engine — pure functions (no React), tested with `npm test`.
// Takes a quote + the materials library + settings and returns everything the
// screens and printouts need: string layout, checks, material lines, costs, price.

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n, d = 0) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: d, maximumFractionDigits: d });

export const findItem = (lib, id) => lib.find((i) => i.id === id) || null;
export const itemName = (i) => (i ? [i.brand, i.model].filter(Boolean).join(' ') : '');

// ---------- Panel voltages at temperature ----------
// v × (1 + coefficient% × (T − 25 °C)). Coefficient is negative, so cold → higher voltage.
export const atTemp = (v, tcPct, tC) => v * (1 + (tcPct / 100) * (tC - 25));

export function stringLimits(panel, inv, env) {
  const p = panel.specs;
  const s = inv.specs;
  const vocCold = atTemp(p.voc, p.tcVoc, env.tMinC);
  const vmpHot = atTemp(p.vmp, p.tcVoc, env.tMaxCellC); // Voc coefficient used as an approximation for Vmp
  return {
    vocCold,
    vmpHot,
    max: Math.floor(s.maxDcV / vocCold), // never exceed the inverter's max DC voltage
    min: Math.ceil(Math.max(s.mpptMin, s.startV || 0) / vmpHot), // stay inside the MPPT range when hot
    mpptMax: Math.floor(s.mpptMax / p.vmp), // above this the inverter may clip voltage
  };
}

// Split N panels into strings that fit the inverter. Strings sharing one MPPT must be equal.
export function autoLayout(n, panel, inv, env) {
  const lim = stringLimits(panel, inv, env);
  const s = inv.specs;
  const maxStrings = Math.max(1, (s.mppts || 1) * (s.stringsPerMppt || 1));
  const upper = Math.min(lim.max, Math.max(lim.mpptMax, lim.min)); // prefer staying under MPPT max
  // Prefer one string per MPPT input (better for shading and lower voltage), then fewer, then more
  const mppts = Math.max(1, s.mppts || 1);
  const order = [...new Set([Math.min(mppts, maxStrings), ...Array.from({ length: maxStrings }, (_, i) => i + 1).filter((c) => c < mppts).reverse(), ...Array.from({ length: maxStrings }, (_, i) => i + 1).filter((c) => c > mppts)])];
  for (const count of order) {
    const base = Math.floor(n / count);
    const extra = n % count;
    if (base < lim.min) continue;
    const sizes = Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
    if (sizes.some((x) => x > upper)) continue;
    // more strings than MPPTs → strings must be doubled up and equal per MPPT
    if (count > s.mppts && (extra !== 0 || count % s.mppts !== 0)) continue;
    return { strings: sizes, ok: true, lim };
  }
  return { strings: n ? [n] : [], ok: false, lim };
}

// Group strings onto MPPT inputs (round robin)
export function mpptGroups(strings, mppts) {
  const groups = Array.from({ length: Math.max(1, mppts) }, () => []);
  strings.forEach((len, i) => groups[i % groups.length].push(len));
  return groups.filter((g) => g.length);
}

// ---------- Checks ----------
export function runChecks({ quote, panel, inverter, battery, layout, kWp, env }) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  if (!panel) add('error', 'Choose a solar panel.');
  if (!inverter) add('error', 'Choose an inverter.');
  if (!panel || !inverter) return out;

  const p = panel.specs;
  const s = inverter.specs;
  const invQty = Math.max(1, quote.inverterQty || 1);
  const acKW = s.acKW * invQty;
  const lim = layout.lim;

  // Type match
  if (quote.system === 'grid' && s.type !== 'grid' && s.type !== 'hybrid') add('error', 'This inverter cannot be used for a grid-tie system.');
  if (quote.system !== 'grid' && s.type === 'grid') add('error', `A grid-tie inverter cannot charge batteries. Choose a hybrid inverter for a ${quote.system === 'hybrid' ? 'hybrid' : 'off-grid'} system.`);

  // Voltage window per string
  layout.strings.forEach((len, i) => {
    const vocCold = len * lim.vocCold;
    const vmpHot = len * lim.vmpHot;
    const vmp = len * p.vmp;
    const tag = layout.strings.length > 1 ? `String ${i + 1} (${len} panels)` : `String of ${len} panels`;
    if (vocCold > s.maxDcV) add('error', `${tag}: ${num(vocCold, 0)} V on a cold morning is above the inverter's ${s.maxDcV} V maximum. Use fewer panels per string.`);
    else if (vmpHot < s.mpptMin) add('warn', `${tag}: only ${num(vmpHot, 0)} V when hot — below the ${s.mpptMin} V MPPT minimum. Add panels to the string.`);
    else if (vmp > s.mpptMax) add('warn', `${tag}: ${num(vmp, 0)} V operating voltage is above the ${s.mpptMax} V MPPT range — output may be limited.`);
    else add('ok', `${tag}: ${num(vmpHot, 0)}–${num(vocCold, 0)} V, inside ${s.mpptMin}–${s.maxDcV} V.`);
  });

  // Current per MPPT
  mpptGroups(layout.strings, s.mppts * invQty).forEach((g, i) => {
    const amps = g.length * p.imp;
    if (amps > s.maxInputA * 1.0001) add('warn', `MPPT ${i + 1}: ${num(amps, 1)} A is above the ${s.maxInputA} A input limit — some power will be clipped.`);
  });

  // DC/AC ratio and PV input limit
  const ratio = kWp / acKW;
  if (s.maxPvW && kWp * 1000 > s.maxPvW * invQty) add('error', `${num(kWp, 2)} kWp is above the inverter's ${num((s.maxPvW * invQty) / 1000, 1)} kWp maximum PV input.`);
  else if (ratio < 0.8) add('warn', `Panels are only ${num(ratio * 100)}% of inverter size — the inverter is bigger than needed.`);
  else if (ratio > 1.3) add('warn', `Panels are ${num(ratio * 100)}% of inverter size — expect clipping at midday.`);
  else add('ok', `Panel-to-inverter ratio ${num(ratio, 2)} (${num(kWp, 2)} kWp on ${num(acKW, 1)} kW).`);

  if (!layout.ok) add('error', `Could not split ${quote.panelQty} panels into valid strings for this inverter (allowed ${lim.min}–${lim.max} per string). Change the panel count or inverter.`);

  // Battery
  const needsBattery = quote.system !== 'grid';
  if (needsBattery && !battery) add('warn', 'No battery selected for a hybrid/off-grid system.');
  if (battery) {
    const b = battery.specs;
    if (!s.batteryV) add('error', 'This inverter has no battery input — remove the battery or choose a hybrid inverter.');
    else if (Math.abs(b.voltage - s.batteryV) > 8) add('error', `Battery is ${b.voltage} V but the inverter needs a ${s.batteryV} V battery.`);
    else add('ok', `Battery voltage ${b.voltage} V matches the inverter.`);
    if (b.maxParallel && quote.batteryQty > b.maxParallel) add('error', `Only ${b.maxParallel} of this battery can be connected in parallel.`);
    if (s.maxChargeA && s.batteryV) {
      const kwh = b.kwh * quote.batteryQty;
      const hours = kwh / ((s.maxChargeA * invQty * b.voltage) / 1000);
      if (hours < 1.2) add('warn', `Battery bank (${num(kwh, 1)} kWh) can charge faster than the inverter allows — fine, but check the battery's own current limit.`);
      else add('ok', `Battery bank ${num(kwh, 2)} kWh — about ${num(hours, 1)} h to full at the inverter's ${s.maxChargeA} A max charge.`);
    }
  }
  return out;
}

// ---------- Material lines ----------
const pickRole = (lib, role, overrideId) => (overrideId && findItem(lib, overrideId)) || lib.find((i) => i.role === role) || null;

export function autoQuantities({ quote, panel, inverter, battery, layout }) {
  const n = quote.panelQty || 0;
  const widthM = panel ? panel.specs.widthMm / 1000 : 1.134;
  const perRow = Math.max(1, quote.panelsPerRow || 8);
  const rows = n ? Math.ceil(n / perRow) : 0;
  const railTotal = n * widthM * 2 * 1.05; // two rails under each row, 5% allowance
  const strings = layout.strings.length;
  const mpptsUsed = inverter ? Math.min(strings, inverter.specs.mppts * Math.max(1, quote.inverterQty || 1)) : strings;
  const run = Math.max(5, quote.cableRunM || 20);
  return {
    rail: (railLen) => Math.ceil(railTotal / (railLen || 2.2)),
    lfoot: n ? Math.ceil((n * widthM * 2) / 1.2) + rows * 2 : 0,
    midclamp: n ? 2 * (n - rows) : 0,
    endclamp: 4 * rows,
    pvcable: strings ? Math.ceil((strings * 2 * run) / 5) * 5 : 0,
    mc4: strings ? strings * 2 + 2 : 0,
    dcbreaker: mpptsUsed,
    dcspd: n ? Math.max(1, quote.inverterQty || 1) : 0,
    conduit: n ? 1 : 0,
    acbreaker: inverter ? (inverter.specs.type === 'hybrid' ? 2 : 1) * Math.max(1, quote.inverterQty || 1) : 0,
    acspd: inverter ? 1 : 0,
    grounding: n ? 1 : 0,
    batterycable: battery && quote.batteryQty ? 1 : 0,
  };
}

const ROLE_ORDER = ['rail', 'lfoot', 'midclamp', 'endclamp', 'pvcable', 'mc4', 'dcbreaker', 'dcspd', 'conduit', 'acbreaker', 'acspd', 'grounding', 'batterycable'];

export function materialLines(ctx, lib) {
  const { quote, panel, inverter, battery } = ctx;
  const lines = [];
  const push = (key, item, qty, auto, extra = {}) => {
    if (!item) return;
    lines.push({ key, itemId: item.id, category: item.category, name: itemName(item), unit: item.unit, qty, unitCost: Number(item.cost) || 0, auto, updated: item.updated, ...extra });
  };
  if (panel) push('panel', panel, quote.panelQty, false);
  if (inverter) push('inverter', inverter, Math.max(1, quote.inverterQty || 1), false);
  if (battery && quote.batteryQty) push('battery', battery, quote.batteryQty, false);

  const auto = autoQuantities(ctx);
  const ov = quote.overrides || {};
  ROLE_ORDER.forEach((role) => {
    const o = ov[role] || {};
    if (o.off) return;
    const item = pickRole(lib, role, o.itemId);
    if (!item) return;
    const autoQty = role === 'rail' ? auto.rail(item.specs?.lengthM) : auto[role];
    const qty = o.qty != null && o.qty !== '' ? Number(o.qty) : autoQty;
    if (!qty) return;
    push(`role:${role}`, item, qty, o.qty == null || o.qty === '', { role, autoQty });
  });

  (quote.extraLines || []).forEach((x) => {
    const item = x.itemId ? findItem(lib, x.itemId) : null;
    lines.push({
      key: `extra:${x.id}`,
      itemId: x.itemId || null,
      category: item?.category || 'misc',
      name: item ? itemName(item) : x.name || 'Item',
      unit: item?.unit || x.unit || 'lot',
      qty: Number(x.qty) || 0,
      unitCost: item ? Number(item.cost) || 0 : Number(x.cost) || 0,
      auto: false,
      extraId: x.id,
      updated: item?.updated,
    });
  });
  return lines.map((l) => ({ ...l, total: r2(l.qty * l.unitCost) }));
}

// ---------- Project costs ----------
export function costAmount(c, kWp) {
  if (c.mode === 'perKWp') return r2((Number(c.amount) || 0) * kWp);
  if (c.mode === 'perTrip' || c.mode === 'perUnit') return r2((Number(c.amount) || 0) * (Number(c.qty) || 0));
  return r2(Number(c.amount) || 0);
}

// ---------- Savings (same method as the public calculator) ----------
export function savingsFor({ kWp, batteryKWh, bill, rate, dayShare, system, netMetering = true }, env) {
  if (!bill || !rate) return null;
  const monthly = bill / rate;
  const produced = kWp * env.peakSunHours * env.performanceRatio * 30;
  const dayLoad = monthly * dayShare;
  const direct = Math.min(produced, dayLoad);
  let surplus = produced - direct;
  let fromBattery = 0;
  if (batteryKWh > 0) {
    fromBattery = Math.min(surplus * 0.92, batteryKWh * 0.9 * 30, monthly - dayLoad);
    surplus -= fromBattery / 0.92;
  }
  const exported = netMetering && system !== 'offgrid' ? surplus : 0;
  const savings = Math.min(bill, (direct + fromBattery) * rate + exported * env.exportRate);
  return { monthlyKWh: monthly, produced, savings: Math.round(savings), newBill: Math.round(bill - savings), solarShare: (direct + fromBattery) / monthly };
}

// ---------- Suggested size from the customer's bill ----------
export function suggestPanels({ bill, rate, target = 0.8, system }, panel, env) {
  if (!bill || !rate || !panel) return 0;
  const daily = bill / rate / 30;
  const kwp = ((system === 'offgrid' ? 1.2 : target) * daily) / (env.peakSunHours * env.performanceRatio);
  return Math.max(2, Math.ceil((kwp * 1000) / panel.specs.watts));
}

// ---------- Everything together ----------
export function buildQuote(quote, lib, settings) {
  const env = settings.design;
  const panel = findItem(lib, quote.panelId);
  const inverter = findItem(lib, quote.inverterId);
  const battery = quote.system === 'grid' ? null : findItem(lib, quote.batteryId);
  const kWp = panel ? r2((quote.panelQty * panel.specs.watts) / 1000) : 0;
  const batteryKWh = battery ? r2(battery.specs.kwh * (quote.batteryQty || 0)) : 0;

  let layout = { strings: [], ok: false, lim: null };
  if (panel && inverter && quote.panelQty > 0) {
    const auto = autoLayout(quote.panelQty, panel, inverter, env);
    if (quote.layoutMode === 'manual' && quote.manualStrings?.length) {
      layout = { strings: quote.manualStrings.map(Number).filter((x) => x > 0), ok: true, lim: auto.lim, manual: true };
      const sum = layout.strings.reduce((a, b) => a + b, 0);
      if (sum !== quote.panelQty) layout.mismatch = sum;
    } else layout = auto;
  }

  const ctx = { quote: { ...quote, batteryQty: battery ? quote.batteryQty : 0 }, panel, inverter, battery, layout, kWp, env };
  const checks = runChecks(ctx);
  if (layout.mismatch != null) checks.unshift({ level: 'error', text: `Strings add up to ${layout.mismatch} panels but the quote has ${quote.panelQty}.` });

  const lines = materialLines(ctx, lib);
  const materials = r2(lines.reduce((a, l) => a + l.total, 0));

  const costs = (quote.costs || [])
    .filter((c) => c.on !== false)
    .map((c) => ({ ...c, total: costAmount(c, kWp) }));
  const services = r2(costs.reduce((a, c) => a + c.total, 0));

  const subtotal = r2(materials + services);
  const contingency = r2((subtotal * (Number(quote.contingencyPct) || 0)) / 100);
  const totalCost = r2(subtotal + contingency);

  const pct = (Number(quote.pricingPct) || 0) / 100;
  let price = quote.pricingMode === 'markup' ? totalCost * (1 + pct) : pct < 0.95 ? totalCost / (1 - pct) : totalCost * 20;
  const roundTo = Number(quote.roundTo) || 1;
  price = Math.ceil(price / roundTo - 1e-9) * roundTo;
  const discount = Math.min(price, Number(quote.discount) || 0);
  const net = r2(price - discount);
  const vatRate = Number(quote.vatRate) || 12;
  const vat = quote.vat ? r2((net * vatRate) / 100) : 0;
  const grandTotal = r2(net + vat);
  const profit = r2(net - totalCost);
  const margin = net > 0 ? profit / net : 0;
  const markup = totalCost > 0 ? profit / totalCost : 0;

  // Prices shown to the customer per line (cost × same factor), services as one line
  // (scaled so materials + services = price before discount)
  const factor = subtotal > 0 ? price / subtotal : 1;
  const sellLines = lines.map((l) => ({ ...l, sellUnit: r2(l.unitCost * factor) }));
  sellLines.forEach((l) => (l.sellTotal = r2(l.sellUnit * l.qty)));
  const sellMaterials = r2(sellLines.reduce((a, l) => a + l.sellTotal, 0));
  const sellServices = r2(price - sellMaterials);

  const savings = savingsFor({ kWp, batteryKWh, bill: quote.sizing?.bill, rate: quote.sizing?.rate, dayShare: quote.sizing?.dayShare ?? 0.45, system: quote.system, netMetering: quote.system !== 'offgrid' }, env);
  const payback = savings && savings.savings > 0 ? grandTotal / (savings.savings * 12) : null;

  const stale = lines.filter((l) => l.updated && daysSince(l.updated, settings.today) > (settings.staleDays || 60));

  return {
    panel, inverter, battery, kWp, batteryKWh, layout, checks, lines, materials, costs, services,
    subtotal, contingency, totalCost, price, discount, net, vat, vatRate, grandTotal, profit, margin, markup,
    sellLines, sellMaterials, sellServices, savings, payback, stale,
    errors: checks.filter((c) => c.level === 'error').length,
    warnings: checks.filter((c) => c.level === 'warn').length,
    roofM2: panel ? Math.ceil(quote.panelQty * (panel.specs.lengthMm / 1000) * (panel.specs.widthMm / 1000) * 1.1) : 0,
    monthlyKWh: r2(kWp * env.peakSunHours * env.performanceRatio * 30),
  };
}

export function daysSince(iso, todayIso) {
  if (!iso) return 0;
  const a = new Date(iso + 'T00:00:00');
  const b = todayIso ? new Date(todayIso + 'T00:00:00') : new Date();
  return Math.floor((b - a) / 86400000);
}
