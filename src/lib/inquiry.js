// Reads the Messenger inquiry sent from the solar website and turns it into quote details.
import { toNumber } from './csv.js';

const line = (text, label) => {
  const m = text.match(new RegExp(`^\\s*[•\\-]?\\s*${label}\\s*:\\s*(.+)$`, 'im'));
  return m ? m[1].trim() : '';
};

export function parseInquiry(text) {
  const out = { customer: {}, sizing: {}, notes: '' };
  out.customer.name = line(text, 'Name');
  out.customer.phone = line(text, 'Mobile') || line(text, 'Phone') || line(text, 'Contact');
  out.customer.address = line(text, 'Location') || line(text, 'Address');
  const property = line(text, 'Property');
  const roof = line(text, 'Roof');
  const survey = line(text, 'Preferred site survey');
  const pkg = line(text, 'Interested in');

  const bill = line(text, 'Monthly bill');
  if (bill) {
    const [amount, rate] = bill.split(/\bat\b/i);
    out.sizing.bill = toNumber(amount) || 0;
    const r = rate && rate.match(/\d+(?:\.\d+)?/);
    if (r) out.sizing.rate = Number(r[0]);
  }
  const sys = line(text, 'System');
  if (/hybrid/i.test(sys)) out.system = 'hybrid';
  else if (/off.?grid/i.test(sys)) out.system = 'offgrid';
  else if (/grid/i.test(sys)) out.system = 'grid';
  const panels = sys.match(/\((\d+)\s*[×x]\s*(\d+)\s*W/i);
  if (panels) out.panelQty = Number(panels[1]);

  const usage = line(text, 'Usage');
  if (/night/i.test(usage) && /mostly/i.test(usage)) out.sizing.dayShare = 0.3;
  else if (/daytime/i.test(usage)) out.sizing.dayShare = 0.65;
  else if (usage) out.sizing.dayShare = 0.45;

  const extra = [property && `Property: ${property}`, roof && `Roof: ${roof}`, survey && `Survey: ${survey}`, pkg && `Interested in: ${pkg}`, line(text, 'Notes') && `Notes: ${line(text, 'Notes')}`].filter(Boolean);
  out.notes = extra.join('\n');
  out.found = Boolean(out.customer.name || out.sizing.bill);
  return out;
}
