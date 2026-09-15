import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ onMenu }) {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const initials = user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CG';
  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button>
      <div className="topbar-search"><Search size={18} /><input placeholder="Search your health workspace" aria-label="Search" /></div>
      <div className="topbar-actions">
        <button className="icon-btn notification-btn" aria-label="Notifications"><Bell size={19} /><span /></button>
          <div className="profile-wrap"><button className="profile-chip" onClick={() => setMenuOpen((value) => !value)}><span className="avatar">{initials}</span><span className="profile-name"><strong>{user?.name}</strong><small>Personal workspace</small></span><ChevronDown size={15} /></button>{menuOpen && <div className="profile-menu"><Link to="/profile"><UserRound size={15} /> My profile</Link><Link to="/settings"><UserRound size={15} /> Settings</Link><button onClick={logout}><LogOut size={15} /> Log out</button></div>}</div>
      </div>
    </header>
  );
}