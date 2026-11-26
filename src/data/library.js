// ============================================================
//  STARTING MATERIALS LIBRARY
//  Prices are PUBLIC 2026 PHILIPPINE REFERENCES gathered on 2026-11-26.
//  They are a starting point only — each installer should replace them
//  with their own supplier's price list (Library → Import).
//  `specs` marked "typical" are representative values: check the datasheet.
// ============================================================

export const CATEGORIES = [
  { id: 'panel', label: 'Solar panels' },
  { id: 'inverter', label: 'Inverters' },
  { id: 'battery', label: 'Batteries' },
  { id: 'mounting', label: 'Mounting' },
  { id: 'dc', label: 'DC wiring & protection' },
  { id: 'ac', label: 'AC side & grounding' },
  { id: 'misc', label: 'Other materials' },
];

// Roles let the app fill in mounting & wiring automatically.
export const ROLES = [
  { id: '', label: '— none —' },
  { id: 'rail', label: 'Mounting rail', category: 'mounting' },
  { id: 'lfoot', label: 'L-foot / roof hook', category: 'mounting' },
  { id: 'midclamp', label: 'Mid clamp', category: 'mounting' },
  { id: 'endclamp', label: 'End clamp', category: 'mounting' },
  { id: 'pvcable', label: 'PV cable (per meter)', category: 'dc' },
  { id: 'mc4', label: 'MC4 connector pair', category: 'dc' },
  { id: 'dcbreaker', label: 'DC breaker (per MPPT)', category: 'dc' },
  { id: 'dcspd', label: 'DC surge protector', category: 'dc' },
  { id: 'conduit', label: 'Conduit & fittings (lot)', category: 'dc' },
  { id: 'acbreaker', label: 'AC breaker', category: 'ac' },
  { id: 'acspd', label: 'AC surge protector', category: 'ac' },
  { id: 'grounding', label: 'Grounding kit (lot)', category: 'ac' },
  { id: 'batterycable', label: 'Battery cable set', category: 'ac' },
];

const S = {
  jfl: { name: 'JFL Solar — installer price list', url: 'https://www.jflsolar.com/products/inverters/hybrid' },
  abc: { name: 'ABC Solar Electronics', url: 'https://abcsolarelectronics.com/product/lifepo4-lithium-powerwall-48volts-100ah/' },
  leyte: { name: 'SolarLeyte 20kW parts build-up (Reflections Solar, ABC Solar prices)', url: 'https://solarleyte.com/posts/20kw-solar-system-price-philippines' },
  bom: { name: 'FilipinoEngineer — 5.5 kWp bill of materials (Apr 2026)', url: 'https://filipinoengineer.com/blog/2026/04/bill-of-materials-and-installed-cost-estimate-5-5-kwp-rooftop-solar-pv-system.html' },
  stream: { name: 'SolarStream PH — panel price list 2026', url: 'https://solarstreamph.com/solar-installation-philippines/solar-panel-price-list-philippines/' },
  pinas: { name: 'Pinas.Solar — inverter price matrix 2026', url: 'https://www.pinas.solar/solar-guides/best-solar-inverters-philippines/' },
  carousell: { name: 'Carousell PH listing (51.2V 314Ah)', url: 'https://www.carousell.ph/lifepo4-battery/q/' },
  deye: { name: 'Deye SUN-3/3.6/5/6K-SG04LP1 datasheet', url: 'https://www.deyeinverter.com/deyeinverter/2023/06/27/datasheet_sun-(3-6)k-sg04lp1_230626_en.pdf' },
  growatt: { name: 'Growatt MIN 2500–6000TL-X datasheet', url: 'https://www.scribd.com/document/508653610/FICHA-TLX-2-5-6-0' },
  ledvance: { name: '620W TOPCon bifacial datasheet values', url: 'https://www.ledvance.com/en/product-datasheet/286296/364915' },
  est: { name: 'Estimate — no public listing found, please verify', url: '' },
};

const D = '2026-11-26';

export const seedLibrary = [
  // ---------- Panels ----------
  {
    id: 'pnl-620-topcon',
    category: 'panel',
    brand: 'Tier-1 (generic)',
    model: '620W N-type TOPCon bifacial',
    unit: 'pc',
    cost: 7500,
    supplier: 'Sample price',
    updated: D,
    source: S.stream,
    notes: 'Public 2026 range for 550–610W Tier-1 panels: ₱5,500–8,000 each. Specs from a 620W TOPCon datasheet.',
    specs: { watts: 620, voc: 52.02, vmp: 42.71, isc: 15.17, imp: 14.52, tcVoc: -0.26, lengthMm: 2382, widthMm: 1134 },
  },
  {
    id: 'pnl-550-mono',
    category: 'panel',
    brand: 'AE Solar',
    model: '550W mono PERC',
    unit: 'pc',
    cost: 6700,
    supplier: 'ABC Solar Electronics',
    updated: D,
    source: S.leyte,
    notes: 'Specs are typical for 144-cell 550W PERC — check the datasheet.',
    specs: { watts: 550, voc: 49.9, vmp: 41.9, isc: 13.98, imp: 13.13, tcVoc: -0.27, lengthMm: 2278, widthMm: 1134 },
  },

  // ---------- Inverters ----------
  {
    id: 'inv-deye-5k-hyb',
    category: 'inverter',
    brand: 'Deye',
    model: 'SUN-5K-SG04LP1 hybrid (1-phase)',
    unit: 'pc',
    cost: 51000,
    supplier: 'JFL Solar (installer price)',
    updated: D,
    source: S.jfl,
    notes: 'Specs: Deye SG04LP1 datasheet (MPPT 150–425 V, 500 V max, 2 × 13 A).',
    specs: { type: 'hybrid', acKW: 5, maxDcV: 500, mpptMin: 150, mpptMax: 425, startV: 125, mppts: 2, stringsPerMppt: 1, maxInputA: 13, maxPvW: 6500, batteryV: 48, maxChargeA: 120 },
  },
  {
    id: 'inv-deye-6k-hyb',
    category: 'inverter',
    brand: 'Deye',
    model: 'SUN-6K-SG04LP1 hybrid (1-phase)',
    unit: 'pc',
    cost: 53000,
    supplier: 'JFL Solar (installer price)',
    updated: D,
    source: S.jfl,
    notes: 'Specs: Deye SG04LP1 datasheet.',
    specs: { type: 'hybrid', acKW: 6, maxDcV: 500, mpptMin: 150, mpptMax: 425, startV: 125, mppts: 2, stringsPerMppt: 1, maxInputA: 13, maxPvW: 7800, batteryV: 48, maxChargeA: 135 },
  },
  {
    id: 'inv-deye-8k-hyb',
    category: 'inverter',
    brand: 'Deye',
    model: '8kW hybrid (1-phase)',
    unit: 'pc',
    cost: 85000,
    supplier: 'JFL Solar (installer price)',
    updated: D,
    source: S.jfl,
    notes: 'Specs are typical for Deye 8kW single-phase hybrids — check the datasheet of the exact model.',
    specs: { type: 'hybrid', acKW: 8, maxDcV: 500, mpptMin: 150, mpptMax: 425, startV: 125, mppts: 2, stringsPerMppt: 2, maxInputA: 26, maxPvW: 10400, batteryV: 48, maxChargeA: 190 },
  },
  {
    id: 'inv-growatt-5k-grid',
    category: 'inverter',
    brand: 'Growatt',
    model: 'MIN 5000TL-X grid-tie',
    unit: 'pc',
    cost: 35000,
    supplier: 'Sample price',
    updated: D,
    source: S.pinas,
    notes: 'Public 2026 range for 5kW grid-tie: ₱28,000–42,000. Specs: Growatt MIN TL-X datasheet.',
    specs: { type: 'grid', acKW: 5, maxDcV: 550, mpptMin: 80, mpptMax: 550, startV: 100, mppts: 2, stringsPerMppt: 1, maxInputA: 13.5, maxPvW: 7000, batteryV: 0, maxChargeA: 0 },
  },
  {
    id: 'inv-growatt-6k-grid',
    category: 'inverter',
    brand: 'Growatt',
    model: 'MIN 6000TL-X grid-tie',
    unit: 'pc',
    cost: 42000,
    supplier: 'Sample price',
    updated: D,
    source: S.est,
    notes: 'Estimate. Specs: Growatt MIN TL-X datasheet.',
    specs: { type: 'grid', acKW: 6, maxDcV: 550, mpptMin: 80, mpptMax: 550, startV: 100, mppts: 2, stringsPerMppt: 1, maxInputA: 13.5, maxPvW: 8100, batteryV: 0, maxChargeA: 0 },
  },

  // ---------- Batteries ----------
  {
    id: 'bat-512-100',
    category: 'battery',
    brand: 'LVTOPSUN',
    model: '51.2V 100Ah LiFePO4 (5.12 kWh)',
    unit: 'pc',
    cost: 45000,
    supplier: 'ABC Solar Electronics',
    updated: D,
    source: S.abc,
    notes: 'Public 2026 range for 51.2V 100Ah: ₱35,000–55,000.',
    specs: { voltage: 51.2, ah: 100, kwh: 5.12, maxParallel: 16 },
  },
  {
    id: 'bat-512-314',
    category: 'battery',
    brand: 'Generic',
    model: '51.2V 314Ah LiFePO4 (16.07 kWh)',
    unit: 'pc',
    cost: 90000,
    supplier: 'Sample price',
    updated: D,
    source: S.carousell,
    notes: 'Marketplace listings ₱90,000–100,000. Parallel limit varies by brand.',
    specs: { voltage: 51.2, ah: 314, kwh: 16.07, maxParallel: 8 },
  },

  // ---------- Mounting ----------
  { id: 'mnt-rail', category: 'mounting', role: 'rail', brand: '', model: 'Aluminium rail 2.2 m', unit: 'pc', cost: 550, supplier: 'Reflections Solar Solutions', updated: D, source: S.leyte, notes: '', specs: { lengthM: 2.2 } },
  { id: 'mnt-lfoot', category: 'mounting', role: 'lfoot', brand: '', model: 'L-foot (metal roof)', unit: 'pc', cost: 89.6, supplier: 'Reflections Solar Solutions', updated: D, source: S.leyte, notes: '', specs: {} },
  { id: 'mnt-mid', category: 'mounting', role: 'midclamp', brand: '', model: 'Mid clamp', unit: 'pc', cost: 50, supplier: 'Reflections Solar Solutions', updated: D, source: S.leyte, notes: '', specs: {} },
  { id: 'mnt-end', category: 'mounting', role: 'endclamp', brand: '', model: 'End clamp', unit: 'pc', cost: 100, supplier: 'Reflections Solar Solutions', updated: D, source: S.leyte, notes: '', specs: {} },

  // ---------- DC side ----------
  { id: 'dc-cable4', category: 'dc', role: 'pvcable', brand: '', model: 'PV cable 4 mm² (UV-rated)', unit: 'm', cost: 120, supplier: 'Sample price', updated: D, source: S.bom, notes: '', specs: {} },
  { id: 'dc-mc4', category: 'dc', role: 'mc4', brand: '', model: 'MC4 connector pair', unit: 'pair', cost: 80, supplier: 'Sample price', updated: D, source: S.est, notes: 'Estimate.', specs: {} },
  { id: 'dc-mcb', category: 'dc', role: 'dcbreaker', brand: '', model: 'DC MCB 2P 20A 1000VDC', unit: 'pc', cost: 900, supplier: 'Sample price', updated: D, source: S.bom, notes: '', specs: {} },
  { id: 'dc-spd', category: 'dc', role: 'dcspd', brand: '', model: 'DC SPD Class II 1000VDC 40kA', unit: 'pc', cost: 2800, supplier: 'Sample price', updated: D, source: S.bom, notes: '', specs: {} },
  { id: 'dc-conduit', category: 'dc', role: 'conduit', brand: '', model: 'Conduit, fittings & cable ties', unit: 'lot', cost: 2000, supplier: 'Sample price', updated: D, source: S.bom, notes: '', specs: {} },

  // ---------- AC side ----------
  { id: 'ac-mcb', category: 'ac', role: 'acbreaker', brand: '', model: 'AC MCB 2P 40A', unit: 'pc', cost: 650, supplier: 'Sample price', updated: D, source: S.est, notes: 'Estimate — size per inverter output.', specs: {} },
  { id: 'ac-spd', category: 'ac', role: 'acspd', brand: '', model: 'AC SPD Type II', unit: 'pc', cost: 1800, supplier: 'Sample price', updated: D, source: S.est, notes: 'Estimate.', specs: {} },
  { id: 'ac-ground', category: 'ac', role: 'grounding', brand: '', model: 'Grounding kit (rod, wire, clamps)', unit: 'lot', cost: 2500, supplier: 'Sample price', updated: D, source: S.est, notes: 'Estimate.', specs: {} },
  { id: 'ac-batcable', category: 'ac', role: 'batterycable', brand: '', model: 'Battery cable set + DC breaker', unit: 'set', cost: 3500, supplier: 'Sample price', updated: D, source: S.est, notes: 'Estimate. One set per battery bank.', specs: {} },
];

// Standard project costs (Settings → Project costs). Amounts are starting points.
export const seedCostItems = [
  { id: 'labor', label: 'Installation labor', mode: 'perKWp', amount: 10000, note: 'About ₱10,000 per kW on metal roofs (Solar Calculator Philippines)' },
  { id: 'transport', label: 'Transportation / delivery', mode: 'perTrip', amount: 3000, qty: 2, note: 'Per trip — set trips per project' },
  { id: 'engineering', label: 'Electrical plans & signing (PEE)', mode: 'fixed', amount: 10000, note: 'Estimate' },
  { id: 'permits', label: 'LGU permits & processing', mode: 'fixed', amount: 8000, note: 'Estimate — varies by LGU' },
  { id: 'netmeter', label: 'Net-metering application & bi-directional meter', mode: 'fixed', amount: 5000, note: 'Residential meter cap ~₱3,000 + processing (estimate)', gridOnly: true },
  { id: 'misc', label: 'Consumables & misc. (labels, tape, bolts)', mode: 'fixed', amount: 1500, note: '' },
];
