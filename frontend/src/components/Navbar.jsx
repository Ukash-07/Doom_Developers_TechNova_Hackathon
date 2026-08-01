import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, LogOut, LayoutDashboard, Trophy, ShieldAlert, Cpu, BadgeCheck } from 'lucide-react';

const RESP_BADGE = {
  ps: { label: 'Faculty · PS', color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.12)', border: 'rgba(0, 210, 255, 0.25)', icon: <Cpu size={12} /> },
  hackathon: { label: 'Faculty · Hackathon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: <Trophy size={12} /> },
  certifications: { label: 'Faculty · Certifications', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', icon: <BadgeCheck size={12} /> }
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine role badge appearance
  let roleBadge;
  if (user.role === 'admin') {
    roleBadge = { label: 'Admin', color: 'var(--color-secondary)', bg: 'rgba(121, 40, 202, 0.2)', border: 'rgba(121, 40, 202, 0.4)', icon: <ShieldAlert size={12} /> };
  } else if (user.role === 'faculty' && user.facultyResponsibility) {
    roleBadge = RESP_BADGE[user.facultyResponsibility] || { label: 'Faculty', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', icon: null };
  } else {
    roleBadge = { label: 'Student', color: 'var(--color-primary)', bg: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.3)', icon: null };
  }

  const dashboardIcon = user.role === 'admin'
    ? <ShieldAlert size={18} />
    : user.role === 'faculty'
      ? (RESP_BADGE[user.facultyResponsibility]?.icon || <LayoutDashboard size={18} />)
      : <LayoutDashboard size={18} />;

  const dashboardLabel = user.role === 'admin'
    ? 'Admin Panel'
    : user.role === 'faculty'
      ? 'Faculty Panel'
      : 'Dashboard';

  return (
    <nav style={{
      background: 'var(--bg-navbar)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-glass)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 24px',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Brand logo */}
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        color: 'var(--text-bright)',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '1.4rem',
        fontWeight: 800,
        background: 'linear-gradient(135deg, var(--color-primary), #0088ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        <Award size={28} style={{ stroke: 'url(#brand-grad)' }} />
        <svg width="0" height="0">
          <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="#0088ff" />
          </linearGradient>
        </svg>
        SmartReward
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link 
          to="/" 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isActive('/') ? 'var(--color-primary)' : 'var(--text-muted)',
            textDecoration: 'none',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.95rem',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: '8px',
            background: isActive('/') ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
            border: `1px solid ${isActive('/') ? 'rgba(0, 210, 255, 0.15)' : 'transparent'}`
          }}
        >
          {dashboardIcon}
          {dashboardLabel}
        </Link>

        <Link 
          to="/leaderboard" 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isActive('/leaderboard') ? 'var(--color-primary)' : 'var(--text-muted)',
            textDecoration: 'none',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.95rem',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: '8px',
            background: isActive('/leaderboard') ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
            border: `1px solid ${isActive('/leaderboard') ? 'rgba(0, 210, 255, 0.15)' : 'transparent'}`
          }}
        >
          <Trophy size={18} />
          Leaderboard
        </Link>
      </div>

      {/* Profile info and logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>{user.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
          </div>
          
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: roleBadge.bg,
            border: `1px solid ${roleBadge.border}`,
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: roleBadge.color
          }}>
            {roleBadge.icon}
            {roleBadge.label}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="btn btn-outline"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
