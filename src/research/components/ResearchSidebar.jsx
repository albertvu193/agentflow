import './ResearchSidebar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '=', section: 'Overview' },
  { id: 'papers', label: 'Paper Analysis', icon: 'P', section: 'Tools' },
  { id: 'slr', label: 'Literature Review', icon: 'L', section: 'Tools' },
  { id: 'library', label: 'Research Library', icon: 'R', section: 'Data' },
];

export function ResearchSidebar({ currentPage, onNavigate, onBack }) {
  const sections = {};
  NAV_ITEMS.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  return (
    <aside className="r-sidebar">
      {/* Brand */}
      <div className="r-sidebar__brand">
        <div className="r-sidebar__brand-icon">R</div>
        <div className="r-sidebar__brand-text">
          <span className="r-sidebar__brand-name">Research Hub</span>
          <span className="r-sidebar__brand-sub">Professional Workspace</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="r-sidebar__nav">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="r-sidebar__section">
            <div className="r-sidebar__section-label">{section}</div>
            {items.map(item => (
              <button
                key={item.id}
                className={`r-sidebar__item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="r-sidebar__item-icon">{item.icon}</span>
                <span className="r-sidebar__item-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="r-sidebar__footer">
        <button className="r-sidebar__back-btn" onClick={onBack}>
          <span className="r-sidebar__back-arrow">&larr;</span>
          Back to AgentFlow
        </button>
      </div>
    </aside>
  );
}
