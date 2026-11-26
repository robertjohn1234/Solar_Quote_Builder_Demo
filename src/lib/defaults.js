// Default settings and the blank quote. Edit numbers in the app (Settings), not here.
import { seedCostItems } from '../data/library.js';

export const defaultSettings = {
  company: {
    name: 'Liwanag Solar',
    tagline: 'Rooftop solar for homes and businesses',
    address: 'Unit 1, Sample Building, Your City',
    phone: '0917 000 0000',
    email: 'hello@yourcompany.ph',
    tin: '',
    preparedBy: '',
  },
  quotePrefix: 'Q',
  validityDays: 15,
  paymentTerms: '50% down payment upon signing\n40% upon delivery of materials\n10% after testing and commissioning',
  warranty: 'Panels: 12-year product, 30-year performance · Inverter: 5–10 years · Battery: 5–10 years · Workmanship: 2 years',
  quoteNotes: 'Final design is subject to site survey. Prices are valid for the period stated above.',
  // Pricing defaults for new quotes
  pricingMode: 'margin', // 'margin' = % of selling price, 'markup' = % on top of cost
  pricingPct: 25,
  minMarginPct: 15,
  contingencyPct: 3,
  roundTo: 1000,
  vat: false, // VAT off by default
  vatRate: 12,
  showLinePrices: false,
  staleDays: 60,
  costItems: seedCostItems,
  // Design assumptions
  design: {
    tMinC: 15, // coldest panel temperature (early morning) — for max string voltage
    tMaxCellC: 70, // hottest panel temperature (noon on a metal roof) — for min string voltage
    peakSunHours: 4.5,
    performanceRatio: 0.8,
    exportRate: 6, // net-metering credit ₱/kWh
    defaultRate: 15.55, // Meralco residential, Nov 2026
  },
};

export function blankQuote(settings, number) {
  return {
    number,
    date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    customer: { name: '', phone: '', email: '', address: '' },
    system: 'hybrid',
    sizing: { bill: 0, rate: settings.design.defaultRate, dayShare: 0.45, target: 0.8 },
    panelId: '',
    panelQty: 10,
    inverterId: '',
    inverterQty: 1,
    batteryId: '',
    batteryQty: 2,
    layoutMode: 'auto',
    manualStrings: [],
    panelsPerRow: 8,
    cableRunM: 20,
    overrides: {},
    extraLines: [],
    costs: settings.costItems.map((c) => ({ ...c, on: true })),
    contingencyPct: settings.contingencyPct,
    pricingMode: settings.pricingMode,
    pricingPct: settings.pricingPct,
    roundTo: settings.roundTo,
    discount: 0,
    vat: settings.vat,
    vatRate: settings.vatRate,
    showLinePrices: settings.showLinePrices,
    groupBos: true,
    validityDays: settings.validityDays,
    paymentTerms: settings.paymentTerms,
    notes: '',
  };
}
