import { useEffect, useState } from 'react';
import { useStore } from './store/store.jsx';
import { Icon, Toaster } from './components/ui.jsx';
import Quotes from './pages/Quotes.jsx';
import QuoteEditor from './pages/QuoteEditor.jsx';
import Library from './pages/Library.jsx';
import Settings from './pages/Settings.jsx';
import PrintView from './pages/PrintView.jsx';
import { DemoBanner } from './components/Demo.jsx';
import { isDemo } from './config.js';

const NAV = [
  { id: 'quotes', label: 'Quotes', icon: 'quote' },
  { id: 'library', label: 'Materials', icon: 'box' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

// Routes: #quotes, #library, #settings, #quote/<id>, #print/<id>/customer|internal
const readRoute = () => {
  const [page = 'quotes', id = '', view = ''] = window.location.hash.replace('#', '').split('/');
  return { page: ['quotes', 'library', 'settings', 'quote', 'print'].includes(page) ? page : 'quotes', id, view };
};

export default function App() {
  const { state } = useStore();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (hash) => {
    if (window.location.hash === `#${hash}`) setRoute(readRoute());
    else window.location.hash = hash;
  };

  if (route.page === 'print') return <PrintView id={route.id} view={route.view} go={go} />;

  const section = route.page === 'quote' ? 'quotes' : route.page;
  const quote = route.page === 'quote' ? state.quotes.find((q) => q.id === route.id) : null;

  return (
    <div className={`app${isDemo ? ' is-demo' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">
            <Icon name="sun" size={20} />
          </span>
          <span>
            <b>{state.settings.company.name}</b>
            <small>Quote builder</small>
          </span>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className={section === n.id ? 'is-active' : ''}>
              <Icon name={n.icon} /> {n.label}
            </a>
          ))}
        </nav>
        <p className="sidebar__note">Saved on this device · works offline</p>
      </aside>

      <main className="main">
        <DemoBanner />
        {route.page === 'quotes' && <Quotes go={go} />}
        {route.page === 'quote' && (quote ? <QuoteEditor key={quote.id} quote={quote} go={go} /> : <Missing go={go} />)}
        {route.page === 'library' && <Library />}
        {route.page === 'settings' && <Settings />}
      </main>

      <nav className="tabbar">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} className={section === n.id ? 'is-active' : ''}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}

function Missing({ go }) {
  return (
    <div className="page">
      <p>That quote was not found.</p>
      <button className="btn" onClick={() => go('quotes')}>
        Back to quotes
      </button>
    </div>
  );
}
