import { NavLink, Link } from 'react-router-dom';
import { Activity, BarChart3, ClipboardList, FileText, History, Lightbulb, PanelLeftClose, X } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Overview', icon: BarChart3 },
  { to: '/assessment', label: 'Assessment', icon: ClipboardList },
  { to: '/simulator', label: 'What-if lab', icon: Activity },
  { to: '/history', label: 'Health history', icon: History },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar({ open, onClose, onToggle }) {
  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-head">
        <Link to="/dashboard" className="brand-mark" onClick={onClose}>
          <span className="brand-icon"><Activity size={19} strokeWidth={2.5} /></span>
          <span className="brand-copy"><strong>Cardio<span>Guard</span></strong><small>AI health intelligence</small></span>
        </Link>
        <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Icon size={19} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note">
        <span className="note-dot" />
        <div><strong>Private by design</strong><p>Your assessment stays on this device.</p></div>
      </div>
      <button className="collapse-btn" onClick={onToggle}><PanelLeftClose size={18} /><span>Collapse sidebar</span></button>
    </aside>
  );
}