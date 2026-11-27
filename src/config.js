// ============================================================
//  BUILD SETTINGS — change before building a copy.
//
//  PUBLIC DEMO (portfolio link):   demoMode: true
//  PAYING CLIENT'S COPY:           demoMode: false
//    → build it only after the down payment, host the built site,
//      and keep the source code repository PRIVATE.
// ============================================================
export const config = {
  demoMode: true,

  // Demo limits
  demoCompanyName: 'Liwanag Solar (Demo)', // locked company name on demo quotations
  demoMaxQuotes: 3, // how many quotes a visitor can keep
  demoContact: '', // e.g. 'Message RJL Web Apps on Facebook' — shown in the demo banner

  // Client copy: start empty (no sample quotes) — set to true for the demo
  startWithSampleData: true,
};

export const isDemo = config.demoMode === true;
