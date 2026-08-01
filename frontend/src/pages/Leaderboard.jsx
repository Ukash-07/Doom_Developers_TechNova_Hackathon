import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { Trophy, Award, Sparkles, Medal } from 'lucide-react';

export default function Leaderboard() {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [averageRp, setAverageRp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
  };

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/rp/leaderboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard);
          setAverageRp(data.averageRp);
        } else {
          showToast('Failed to load standings', 'error');
        }
      } catch (err) {
        showToast('Network error loading leaderboard', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Aligning class rankings...
        </p>
      </div>
    );
  }

  // Segment podium participants
  const firstPlace = leaderboard.find(s => s.rank === 1);
  const secondPlace = leaderboard.find(s => s.rank === 2);
  const thirdPlace = leaderboard.find(s => s.rank === 3);
  const remainder = leaderboard.filter(s => s.rank > 3);

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '20px',
          color: 'var(--color-warning)',
          fontSize: '0.88rem',
          fontWeight: 600,
          gap: '8px',
          marginBottom: '16px'
        }}>
          <Sparkles size={16} />
          <span>Reward Point Standings</span>
        </div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '8px' }}>Hall of Fame</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Celebrate top performers! Ranks are calculated based on overall accumulated Reward Points (RP). Class average is <strong style={{ color: '#fff' }}>{averageRp} RP</strong>.
        </p>
      </div>

      {/* Podium Showcase */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '50px',
        minHeight: '380px',
        padding: '0 20px',
        flexWrap: 'wrap' // handle wrapping on smaller widths
      }}>
        
        {/* 2nd Place Podium */}
        {secondPlace && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '200px',
            animation: 'fadeInUp 0.6s ease-out 0.1s forwards',
            opacity: 0
          }}>
            <Medal size={42} style={{ color: '#9ca3af', filter: 'drop-shadow(0 0 6px rgba(156, 163, 175, 0.4))', marginBottom: '8px' }} />
            <div className="glass-panel" style={{
              width: '100%',
              padding: '16px',
              textAlign: 'center',
              borderBottom: 'none',
              borderRadius: '16px 16px 0 0',
              background: 'rgba(156, 163, 175, 0.05)',
              border: '1px solid rgba(156, 163, 175, 0.2)'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secondPlace.name}</h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>{secondPlace.currentBalance} RP</p>
            </div>
            
            {/* Pedestal block */}
            <div style={{
              width: '100%',
              height: '140px',
              background: 'linear-gradient(180deg, rgba(156, 163, 175, 0.15) 0%, rgba(156, 163, 175, 0.02) 100%)',
              border: '1px solid rgba(156, 163, 175, 0.2)',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: 'rgba(156, 163, 175, 0.4)' }}>2</span>
            </div>
          </div>
        )}

        {/* 1st Place Podium */}
        {firstPlace && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '220px',
            animation: 'fadeInUp 0.6s ease-out forwards',
            opacity: 0,
            zIndex: 2
          }}>
            <Trophy size={54} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))', marginBottom: '8px' }} />
            <div className="glass-panel" style={{
              width: '100%',
              padding: '20px',
              textAlign: 'center',
              borderBottom: 'none',
              borderRadius: '16px 16px 0 0',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              boxShadow: 'var(--shadow-glow-cyan)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstPlace.name}</h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.3rem', marginTop: '4px' }}>{firstPlace.currentBalance} RP</p>
            </div>
            
            {/* Pedestal block */}
            <div style={{
              width: '100%',
              height: '180px',
              background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0.03) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)'
            }}>
              <span style={{ fontSize: '4.5rem', fontWeight: 900, color: 'rgba(251, 191, 36, 0.4)' }}>1</span>
            </div>
          </div>
        )}

        {/* 3rd Place Podium */}
        {thirdPlace && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '200px',
            animation: 'fadeInUp 0.6s ease-out 0.2s forwards',
            opacity: 0
          }}>
            <Medal size={42} style={{ color: '#d97706', filter: 'drop-shadow(0 0 6px rgba(217, 119, 6, 0.4))', marginBottom: '8px' }} />
            <div className="glass-panel" style={{
              width: '100%',
              padding: '16px',
              textAlign: 'center',
              borderBottom: 'none',
              borderRadius: '16px 16px 0 0',
              background: 'rgba(217, 119, 6, 0.05)',
              border: '1px solid rgba(217, 119, 6, 0.2)'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thirdPlace.name}</h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '4px' }}>{thirdPlace.currentBalance} RP</p>
            </div>
            
            {/* Pedestal block */}
            <div style={{
              width: '100%',
              height: '110px',
              background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.02) 100%)',
              border: '1px solid rgba(217, 119, 6, 0.2)',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(217, 119, 6, 0.4)' }}>3</span>
            </div>
          </div>
        )}

      </div>

      {/* Roster list table */}
      <div className="glass-panel">
        <h3 style={{ fontSize: '1.4rem', marginBottom: '18px' }}>Roster Standings</h3>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Student</th>
                <th>Year</th>
                <th style={{ textAlign: 'right' }}>Points Balance</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(student => (
                <tr key={student.studentId} style={{
                  background: student.rank <= 3 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                }}>
                  <td style={{ fontWeight: 800, color: student.rank <= 3 ? 'var(--color-primary)' : 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {student.rank}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {student.year}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right' }}>
                    {student.currentBalance} RP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal podium styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
