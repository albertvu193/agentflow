import { StrictMode, useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ResearchApp } from './research/ResearchApp.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

function Root() {
  const [view, setView] = useState(() => {
    return window.location.hash === '#research' ? 'research' : 'main';
  });

  // Sync with browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      setView(window.location.hash === '#research' ? 'research' : 'main');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openResearch = useCallback(() => {
    window.location.hash = 'research';
    setView('research');
  }, []);

  const openMain = useCallback(() => {
    window.location.hash = '';
    setView('main');
  }, []);

  if (view === 'research') {
    return (
      <ErrorBoundary>
        <ResearchApp onBack={openMain} />
      </ErrorBoundary>
    );
  }

  return <App onOpenResearch={openResearch} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
