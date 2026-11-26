// Small reusable UI pieces: icons, modal, confirm dialog, stat, badge, empty state, field, toast.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ---------- Icons (simple line icons) ----------
const paths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.87M16 3.13A3.5 3.5 0 0 1 16 10',
  collect: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  loan: 'M3 7h18v10H3zM3 11h18M7 15h3M17 3l-3 4M7 3l3 4',
  share: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  check: 'M20 6 9 17l-5-5',
  copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  quote: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  panel: 'M3 7h18l-2 10H5L3 7ZM9 7l-1 10M15 7l1 10M4 12h16M12 17v4M8 21h8',
  inverter: 'M5 3h14v18H5zM9 8h6M9 16c1-2 2-2 3 0s2 2 3 0',
  battery: 'M7 6h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM10 3h4M12 10l-2 4h4l-2 4',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  back: 'M19 12H5M11 18l-6-6 6-6',
  paste: 'M9 4h6M9 4a2 2 0 0 0-2 2H5v15h14V6h-2a2 2 0 0 0-2-2M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M8 12h8M8 16h5',
  dup: 'M8 8h12v12H8zM4 16V4h12',
  info: 'M12 16v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  peso: 'M7 21V3h6a5 5 0 0 1 0 10H7M4 7h16M4 10h16',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
};

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

// ---------- Modal ----------
let openModals = 0;

export function Modal({ title, onClose, children, footer, wide = false, closable = true }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Runs once when the modal opens (not on every keystroke)
  useEffect(() => {
    openModals += 1;
    const myLevel = openModals;
    // Escape closes only the top-most modal
    const onKey = (e) => e.key === 'Escape' && closable && myLevel === openModals && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector('input:not([type=checkbox]), select, textarea');
    first?.focus({ preventScroll: true });
    return () => {
      openModals -= 1;
      document.removeEventListener('keydown', onKey);
      if (openModals === 0) document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div className="modal-wrap" onMouseDown={(e) => closable && e.target === e.currentTarget && closeRef.current()}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div className="modal__head">
          <h2>{title}</h2>
          {closable && (
            <button className="icon-btn modal__close" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          )}
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---------- Confirm dialog (replaces the browser's confirm()) ----------
export function Confirm({ title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

// Hook: const [ask, dialog] = useConfirm();  ask({title, message, onConfirm})
export function useConfirm() {
  const [opts, setOpts] = useState(null);
  const dialog = opts ? <Confirm {...opts} onCancel={() => setOpts(null)} /> : null;
  return [setOpts, dialog];
}

// ---------- Small display pieces ----------
export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

const BADGE_TEXT = { draft: 'Draft', sent: 'Sent', won: 'Won', lost: 'Lost', error: 'Fix needed', warn: 'Check', ok: 'OK' };
export function Badge({ status, children }) {
  return <span className={`badge badge--${status}`}>{children || BADGE_TEXT[status] || status}</span>;
}

export function Empty({ icon = 'users', title, text, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`field${error ? ' field--error' : ''} ${className}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

// ---------- Toast ----------
let pushToast = () => {};
export const toast = (message) => pushToast(message);

export function Toaster() {
  const [item, setItem] = useState(null);
  useEffect(() => {
    pushToast = (message) => setItem({ message, id: Date.now() });
    return () => {
      pushToast = () => {};
    };
  }, []);
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => setItem(null), 2400);
    return () => clearTimeout(t);
  }, [item]);
  if (!item) return null;
  return (
    <div className="toast" role="status" key={item.id}>
      <Icon name="check" size={16} /> {item.message}
    </div>
  );
}
