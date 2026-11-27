# Liwanag Quote — solar quotation builder (owner's app)

An offline app for a solar installer to build quotations: pick panels, inverter and battery from a **supplier price library**, let the app **check the design** and **fill in mounting and wiring automatically**, add **labor, transport and other project costs**, set the **margin**, and print a professional **quotation** plus an internal **costing sheet**.

Built with **Vite + React**. Data is saved in the browser on the owner's device (no server, works offline). Pairs with the Liwanag Solar website: paste the customer's Messenger inquiry to start a quote.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 64 checks on the quote engine
npm run build    # production files in dist/
```

Deploy on Render as a Static Site: build `npm install && npm run build`, publish `dist`.

## Screens

| Screen | What it does |
|---|---|
| **Quotes** | All quotes with status (draft / sent / won / lost), totals, margin, win rate. *New quote* or *Paste inquiry* (from the website's Messenger message). |
| **Quote editor** | Customer · bill-based size suggestion · system type · panel / inverter / battery from the library · automatic string layout · design checks · material lines (auto quantities, editable) · project costs · pricing (margin or markup, contingency, rounding, discount, VAT) · terms. Live total, profit and margin. |
| **Quotation / Costing sheet** | A4 printable pages. *Print / Save as PDF*. The costing sheet is internal (costs, profit, checks). |
| **Materials** | Supplier price library: add/edit items with datasheet specs, **import a supplier CSV** (any column layout — match columns on screen), export, bulk % price change, old-price warnings. |
| **Settings** | Company details, payment terms, warranty, pricing defaults (**VAT off by default**), standard project costs, design temperatures, backup & restore. |

## How it computes

- **Strings** — max panels per string = inverter max DC voltage ÷ panel Voc at the coldest temperature (default 15 °C); min = MPPT minimum ÷ panel Vmp at the hottest panel temperature (default 70 °C). Prefers one string per MPPT input.
- **Checks** — string voltage window, current per MPPT, panel-to-inverter ratio (0.8–1.3), max PV input, inverter type vs system type, battery voltage match, batteries in parallel, battery charge time. These are **guides**; the final design must be done/signed by a licensed electrical engineer.
- **Auto quantities** — rails (2 per row, 5% allowance), L-feet (~1 per 1.2 m), mid/end clamps by rows, PV cable = strings × 2 × cable run, MC4 pairs, DC breaker per MPPT used, SPDs, AC breakers (2 for hybrid), grounding, battery cable set. Any quantity can be overridden.
- **Price** — materials + project costs → contingency % → total cost → price = cost ÷ (1 − margin) or cost × (1 + markup) → rounded up → − discount → + VAT (if on). Line prices shown to the customer are scaled so they add up to the price.
- **Savings & payback** — same method as the website calculator (sun hours × efficiency, daytime use, battery, net-metering credit).

## Starting price library (Nov 2026)

Pre-filled from **public Philippine listings** — each item shows its source in the app. Examples: Deye 5/6/8 kW hybrid at JFL Solar installer prices (₱51,000 / ₱53,000 / ₱85,000); 51.2 V 100 Ah LiFePO4 at ABC Solar (₱45,000); rails, L-feet and clamps from Reflections Solar via a published parts build-up; PV cable, DC breaker and SPD from a published 5.5 kWp bill of materials. Items marked *Estimate* had no public price. **Distributors usually share full price lists only on request — import the installer's own list.**

Datasheet specs: Deye SG04LP1 and Growatt MIN TL-X datasheets; a 620 W TOPCon datasheet for the generic panel. Items marked *typical* should be checked against the exact model.

## Supplier price lists

Ask the supplier for their dealer/installer list (Excel/PDF). For Excel: **File → Save As → CSV**. In the app: **Materials → Import price list** → match the columns (description, price, unit, brand…) → choose category or let the app detect it → import. Add the datasheet specs for panels, inverters and batteries so the design checks work.

## Demo vs client copies (`src/config.js`)

| | Public demo (`demoMode: true`) | Paying client (`demoMode: false`) |
|---|---|---|
| Quotations & costing sheets | **"DEMO — NOT A VALID QUOTATION"** watermark | Clean |
| Company name | Locked to `demoCompanyName` | Client's own name (Settings) |
| Quotes | Max `demoMaxQuotes` (3) | Unlimited |
| Supplier CSV import, backup & restore | Off | On |
| Banner | "Demo version" strip on every screen | None |

### Delivering to a paying client (keep the full version protected)

1. Keep this source code in a **private** GitHub repo. Only built sites go online.
2. After the **down payment**, make the client's copy: in `src/config.js` set `demoMode: false` and `startWithSampleData: false`.
3. Build and host it **under your account** on Render (a separate Static Site per client, e.g. `client-name-quotes.onrender.com`), or a private repo you create for them.
4. Set up their company name, pricing and suppliers in Settings, save a backup, and send the link only to the client.
5. Your public portfolio link always stays on the **demo** build.

> A browser app can still be copied by a determined programmer — the demo limits, private repo and your written terms are the protection. Real enforcement (logins, subscription) comes with the online version.
