import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { Mail, Lock, User, ShieldAlert, Award } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password);
        showToast('Registered successfully!', 'success');
      } else {
        await login(email, password);
        showToast('Welcome back!', 'success');
      }
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err) {
      showToast(err.message || 'An error occurred during authentication', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 100px)',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center',
        padding: '40px'
      }}>
        {/* Header Logo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          boxShadow: 'var(--shadow-glow-cyan)',
          marginBottom: '20px',
          color: '#ffffff'
        }}>
          <Award size={36} />
        </div>

        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px' }}>
          {isRegister ? 'Sign up to start tracking your reward points' : 'Sign in to access your rewards dashboard'}
        </p>

        {/* Demo credentials hint */}
        {!isRegister && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-glass)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '0.82rem',
            textAlign: 'left'
          }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Demo Logins:</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span>🛡️ Admin: <code>admin@college.edu</code></span>
              <span>PW: <code>admin123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'rgba(0,210,255,0.8)' }}>
              <span>🔬 PS Faculty: <code>faculty.ps@college.edu</code></span>
              <span>PW: <code>faculty123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'rgba(245,158,11,0.85)' }}>
              <span>🏆 Hackathon: <code>faculty.hackathon@college.edu</code></span>
              <span>PW: <code>faculty123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'rgba(16,185,129,0.85)' }}>
              <span>📜 Cert Faculty: <code>faculty.cert@college.edu</code></span>
              <span>PW: <code>faculty123</code></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>🎓 Students: <code>s1@college.edu</code> ... <code>s10@college.edu</code></span>
              <span>PW: <code>student123</code></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '48px' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@college.edu" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: '20px' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isRegister ? 'Already have an account?' : "Don't have a student account yet?"}{' '}
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setToast(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'inherit',
              padding: 0
            }}
          >
            {isRegister ? 'Sign In' : 'Register now'}
          </button>
        </p>
      </div>

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
