import { StrictMode, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ResearchApp } from './research/ResearchApp.jsx'

function Root() {
  const [view, setView] = useState(() => {
    return window.location.hash === '#research' ? 'research' : 'main';
  });

  const openResearch = useCallback(() => {
    window.location.hash = 'research';
    setView('research');
  }, []);

  const openMain = useCallback(() => {
    window.location.hash = '';
    setView('main');
  }, []);

  if (view === 'research') {
    return <ResearchApp onBack={openMain} />;
  }

  return <App onOpenResearch={openResearch} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
