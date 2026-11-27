import { useState } from 'react';
import { config, isDemo } from '../config.js';
import { Icon, Modal } from './ui.jsx';

export const DEMO_STAMP = 'DEMO — NOT A VALID QUOTATION';

// Thin strip at the top of every screen
export function DemoBanner() {
  const [open, setOpen] = useState(false);
  if (!isDemo) return null;
  return (
    <>
      <div className="demo-banner" role="note">
        <Icon name="alert" size={16} />
        <span>
          <b>Demo version</b>
          <span className="hide-sm"> — quotations are watermarked, max {config.demoMaxQuotes} quotes, import & backup are off.</span>
        </span>
        <button type="button" onClick={() => setOpen(true)}>
          Details
        </button>
      </div>
      {open && <DemoInfo onClose={() => setOpen(false)} />}
    </>
  );
}

export function DemoInfo({ onClose, reason }) {
  return (
    <Modal
      title={reason ? 'Not available in the demo' : 'About this demo'}
      onClose={onClose}
      footer={
        <button className="btn btn--primary" onClick={onClose}>
          OK
        </button>
      }
    >
      {reason && <p className="notice notice--warn">{reason}</p>}
      <p>This is a demonstration of the solar quotation builder. You can try every screen, but:</p>
      <ul className="demo-list">
        <li>Printed quotations and costing sheets carry a <b>"{DEMO_STAMP}"</b> watermark.</li>
        <li>The company name is fixed to <b>{config.demoCompanyName}</b>.</li>
        <li>
          Only <b>{config.demoMaxQuotes} quotes</b> can be kept at a time.
        </li>
        <li>Importing supplier price lists and backup / restore are turned off.</li>
        <li>Prices in the library are sample public listings, not a supplier's actual prices.</li>
      </ul>
      <p className="notice">
        <Icon name="info" size={16} />
        <span>
          The full version is set up with your company name, your suppliers and your pricing.{' '}
          {config.demoContact ? <b>{config.demoContact}.</b> : 'Contact the developer to get your own copy.'}
        </span>
      </p>
    </Modal>
  );
}

// Watermark over printed documents
export function DemoWatermark() {
  if (!isDemo) return null;
  return (
    <div className="watermark" aria-hidden="true">
      <span>{DEMO_STAMP}</span>
      <span>{DEMO_STAMP}</span>
      <span>{DEMO_STAMP}</span>
    </div>
  );
}
