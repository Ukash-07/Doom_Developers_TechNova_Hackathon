import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircle className="toast-icon success" size={20} />,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      shadowColor: 'rgba(16, 185, 129, 0.2)',
      bg: 'rgba(6, 32, 23, 0.85)'
    },
    error: {
      icon: <AlertTriangle className="toast-icon error" size={20} />,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      shadowColor: 'rgba(239, 68, 68, 0.2)',
      bg: 'rgba(30, 10, 10, 0.85)'
    },
    info: {
      icon: <Info className="toast-icon info" size={20} />,
      borderColor: 'rgba(0, 210, 255, 0.3)',
      shadowColor: 'rgba(0, 210, 255, 0.2)',
      bg: 'rgba(10, 24, 40, 0.85)'
    }
  };

  const style = config[type] || config.info;

  return (
    <div 
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: style.bg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${style.borderColor}`,
        borderRadius: '12px',
        boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5), ${style.shadowColor} 0px 4px 20px`,
        color: '#ffffff',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        maxWidth: '350px'
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%) translateY(0); }
          to { opacity: 1; transform: translateX(0) translateY(0); }
        }
        .toast-icon.success { color: #10b981; }
        .toast-icon.error { color: #ef4444; }
        .toast-icon.info { color: #00d2ff; }
      `}</style>
      <div>{style.icon}</div>
      <div style={{ flex: 1, fontSize: '0.92rem', fontFamily: 'Inter, sans-serif' }}>{message}</div>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          borderRadius: '4px'
        }}
        onMouseEnter={(e) => e.target.style.color = '#fff'}
        onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.5)'}
      >
        <X size={16} />
      </button>
    </div>
  );
}
