import { useState, useCallback, useEffect, useRef } from 'react';
import { ResearchSidebar } from './components/ResearchSidebar';
import { ResearchDashboard } from './components/ResearchDashboard';
import { PaperAnalysis } from './components/PaperAnalysis';
import { LiteratureReview } from './components/LiteratureReview';
import { ResearchLibrary } from './components/ResearchLibrary';
import { useKristen } from '../hooks/useKristen';
import { useSLR } from '../hooks/useSLR';
import './ResearchApp.css';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  papers: 'Paper Analysis',
  slr: 'Literature Review',
  library: 'Research Library',
};

export function ResearchApp({ onBack }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const kristen = useKristen();
  const slr = useSLR();
  const reconnectTimer = useRef(null);

  // WebSocket connectivity with auto-reconnect
  useEffect(() => {
    let ws = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsHost = isDev ? 'localhost:3001' : window.location.host;
      ws = new WebSocket(`${protocol}//${wsHost}/ws`);

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => setIsConnected(false);
    }

    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws) ws.close();
    };
  }, []);

  const navigateTo = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Keyboard shortcuts: 1=Dashboard, 2=Papers, 3=SLR, 4=Library, Esc=Back
  useEffect(() => {
    const handleKey = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Don't navigate away when a modal is open (modal handlers use stopImmediatePropagation)
      if (document.querySelector('.r-modal-overlay')) return;

      const pages = ['dashboard', 'papers', 'slr', 'library'];
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        setCurrentPage(pages[num - 1]);
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onBack]);

  const renderPage = () => {
    switch (currentPage) {
      case 'papers':
        return <PaperAnalysis kristen={kristen} />;
      case 'slr':
        return <LiteratureReview slr={slr} />;
      case 'library':
        return <ResearchLibrary slr={slr} kristen={kristen} />;
      default:
        return (
          <ResearchDashboard
            onNavigate={navigateTo}
            kristenStatus={kristen.status}
            slrStatus={slr.jobStatus}
            slrProgress={slr.progress}
            slrTotal={slr.total}
            slrResults={slr.results}
            kristenResult={kristen.result}
            kristenFilename={kristen.uploadInfo?.filename}
          />
        );
    }
  };

  return (
    <div className="research-app">
      <ResearchSidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onBack={onBack}
      />

      <div className="research-main">
        <div className="research-topbar">
          <div className="research-topbar__left">
            <div className="research-topbar__breadcrumb">
              <span>Research Hub</span>
              <span>/</span>
              <strong>{PAGE_TITLES[currentPage]}</strong>
            </div>
          </div>
          <div className="research-topbar__right">
            <div className="research-topbar__status">
              <span className={`research-topbar__status-dot ${isConnected ? 'connected' : ''}`} />
              {isConnected ? 'Engine Connected' : 'Reconnecting...'}
            </div>
          </div>
        </div>

        <div className="research-content r-fade-in" key={currentPage}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
