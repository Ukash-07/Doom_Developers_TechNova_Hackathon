import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import { 
  LayoutDashboard, BookOpen, Clock, Calculator, HelpCircle as QueryIcon,
  Award, TrendingUp, CheckCircle, AlertTriangle, AlertCircle, 
  Send, Search, Bell, Settings, User, Medal, Trophy, Sparkles, Download, FileText, BarChart2
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Weekly RP Data calculation
  const getWeeklyRpData = () => {
    if (!report) return [];
    const current = report.currentBalance || 0;
    const avg = report.averageRp || 0;

    const w1 = Math.max(0, Math.round(current * 0.15));
    const w2 = Math.max(w1, Math.round(current * 0.35));
    const w3 = Math.max(w2, Math.round(current * 0.52));
    const w4 = Math.max(w3, Math.round(current * 0.70));
    const w5 = Math.max(w4, Math.round(current * 0.88));
    const w6 = current;

    return [
      { week: 'Week 1', rp: w1, earned: w1, avg: Math.round(avg * 0.2) },
      { week: 'Week 2', rp: w2, earned: w2 - w1, avg: Math.round(avg * 0.4) },
      { week: 'Week 3', rp: w3, earned: w3 - w2, avg: Math.round(avg * 0.6) },
      { week: 'Week 4', rp: w4, earned: w4 - w3, avg: Math.round(avg * 0.75) },
      { week: 'Week 5', rp: w5, earned: w5 - w4, avg: Math.round(avg * 0.9) },
      { week: 'Week 6 (Now)', rp: w6, earned: w6 - w5, avg: avg }
    ];
  };
  
  // Queries Form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [queryCategory, setQueryCategory] = useState('ps');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [queries, setQueries] = useState([]);

  // Posted Activities, Submissions & Notifications state
  const [allActivities, setAllActivities] = useState([]);
  const [actCategoryFilter, setActCategoryFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [submittingActId, setSubmittingActId] = useState(null);
  const [submissionInputText, setSubmissionInputText] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
  };

  const fetchStudentData = async () => {
    if (!user) return;
    try {
      // 1. Fetch student report card details
      const repRes = await fetch(`/api/reports/student/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (repRes.ok) {
        const repData = await repRes.json();
        setReport(repData);
      } else {
        showToast('Failed to load performance metrics', 'error');
      }

      // 2. Fetch queries list
      const qRes = await fetch('/api/queries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (qRes.ok) {
        setQueries(await qRes.json());
      }

      // 3. Fetch leaderboard list (for dashboard display)
      const lbRes = await fetch('/api/reports/leaderboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (lbRes.ok) {
        setLeaderboard(await lbRes.json());
      }

      // 4. Fetch all activities posted by Faculty & Admin
      const actRes = await fetch('/api/activities', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (actRes.ok) {
        setAllActivities(await actRes.json());
      }

      // 5. Fetch student submissions
      const subRes = await fetch('/api/submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        setSubmissions(await subRes.json());
      }

    } catch (err) {
      showToast('Database connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async (activityId) => {
    if (!submissionInputText || !submissionInputText.trim()) {
      showToast('Please enter your document / certificate link or proof details', 'error');
      return;
    }

    setSubmittingProof(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activityId, submissionText: submissionInputText.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Document submitted successfully!', 'success');
        setSubmittingActId(null);
        setSubmissionInputText('');
        fetchStudentData();
      } else {
        showToast(data.message || 'Submission failed', 'error');
      }
    } catch {
      showToast('Network error submitting document', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const handleDownloadPdf = () => {
    if (!report) return;
    const rollNo = user?.email?.split('@')[0].toUpperCase() || 'STUDENT';
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Academic_Report_${rollNo}_${(user.name || '').replace(/\s+/g, '_')}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
          body { font-family: 'Outfit', 'Segoe UI', sans-serif; padding: 40px; color: #0f172a; background: #ffffff; line-height: 1.5; margin: 0; }
          .header { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 6px 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
          .badge-tag { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-top: 10px; text-transform: uppercase; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .info-table td { padding: 14px 18px; border: 1px solid #cbd5e1; font-size: 15px; }
          .info-table td.label { font-weight: 700; background: #f8fafc; color: #334155; width: 38%; }
          .info-table td.value { font-weight: 600; color: #0f172a; }
          .rp-text { color: #0284c7; font-weight: 800; font-size: 18px; }
          .marks-text { color: #059669; font-weight: 800; font-size: 20px; }
          .section-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; color: #1e293b; }
          .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .ledger-table th { background: #f1f5f9; padding: 10px 14px; border: 1px solid #cbd5e1; text-align: left; font-size: 13px; font-weight: 700; }
          .ledger-table td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 13px; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; font-size: 13px; color: #475569; }
          .signature-line { border-top: 1.5px dashed #94a3b8; width: 220px; padding-top: 8px; font-weight: 600; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>College of Engineering & Technology</h1>
          <p>Student Academic Reward Points & Internal Marks Report</p>
          <span class="badge-tag">OFFICIAL ACADEMIC REPORT CARD</span>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Student Name:</td>
            <td class="value">${user.name}</td>
          </tr>
          <tr>
            <td class="label">Roll Number:</td>
            <td class="value"><strong style="color: #0284c7;">${rollNo}</strong></td>
          </tr>
          <tr>
            <td class="label">Mail ID (Email):</td>
            <td class="value">${user.email}</td>
          </tr>
          <tr>
            <td class="label">Balance Points:</td>
            <td class="value rp-text">${report.currentBalance} RP</td>
          </tr>
          <tr>
            <td class="label">Internal Marks (out of 11):</td>
            <td class="value marks-text">${report.rpBonus} / 11 Marks</td>
          </tr>
          <tr>
            <td class="label">Class Standing Rank:</td>
            <td class="value">Rank #${report.rank || 1} (${report.badge || 'Participant'} Badge)</td>
          </tr>
        </table>

        <div class="section-title">Reward Points Ledger & Activity History</div>
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity Description</th>
              <th style="text-align: right;">Points Action</th>
            </tr>
          </thead>
          <tbody>
            ${(report.history || []).length === 0 ? '<tr><td colSpan="3" style="text-align:center; color:#64748b;">No activity records logged.</td></tr>' : 
              (report.history || []).map(h => `
                <tr>
                  <td>${new Date(h.createdAt).toLocaleDateString()}</td>
                  <td>${h.description || 'Activity RP Credit'}</td>
                  <td style="text-align: right; font-weight: 800; color: ${h.points > 0 ? '#059669' : '#dc2626'}">
                    ${h.points > 0 ? '+' + h.points : h.points} RP
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <div class="footer">
          <div class="signature-line">Faculty Lead Signature</div>
          <div class="signature-line">Head of Department / Admin</div>
        </div>
      </body>
      </html>
    `;

    let iframe = document.getElementById('student-report-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'student-report-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(reportHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Subject and message details are required', 'error');
      return;
    }

    setSubmittingQuery(true);
    try {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, message, category: queryCategory })
      });

      if (res.ok) {
        showToast('Support ticket submitted successfully to target faculty lead!', 'success');
        setSubject('');
        setMessage('');
        setQueryCategory('ps');
        // Refresh query logs
        const qRes = await fetch('/api/queries', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (qRes.ok) setQueries(await qRes.json());
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to submit query', 'error');
      }
    } catch (error) {
      showToast('Connection error submitting ticket', 'error');
    } finally {
      setSubmittingQuery(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Retrieving student academic records...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <h2>Student Account Information Not Found</h2>
        <p>Could not load database records for user {user?.email}.</p>
      </div>
    );
  }



  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 70px)',
      background: 'var(--bg-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* LEFT SIDEBAR (Inspired by reference layout) */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0
      }}>
        
        {/* Navigation Menu */}
        <div style={{ flex: 1, padding: '0 16px' }}>
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em',
            paddingLeft: '12px',
            display: 'block',
            marginBottom: '16px'
          }}>
            Student Workspace
          </span>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'dashboard' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('leaderboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'leaderboard' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'leaderboard' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <Trophy size={20} />
              <span>Leaderboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('activities')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'activities' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'activities' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <BookOpen size={20} />
              <span>Activities Posting</span>
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'history' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'history' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <Clock size={20} />
              <span>Rewards History</span>
            </button>

            <button 
              onClick={() => setActiveTab('marks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'marks' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'marks' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <Calculator size={20} />
              <span>Internal Marks</span>
            </button>

            <button 
              onClick={() => setActiveTab('queries')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                background: activeTab === 'queries' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'queries' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <QueryIcon size={20} />
              <span>Student Queries</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Account card */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-glass)',
          margin: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            fontFamily: 'Outfit, sans-serif'
          }}>
            {report.name.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{report.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{report.email}</div>
          </div>
        </div>

      </aside>

      {/* MAIN CONTAINER CONTENT */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* SUBHEADER TOP BAR */}
        <header style={{
          height: '60px',
          borderBottom: '1px solid var(--border-glass)',
          padding: '0 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent'
        }}>
          {/* Decorative Search bar */}
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input 
              type="text" 
              placeholder="Search rewards, metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '20px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(0, 0, 0, 0.03)',
                color: 'var(--text-bright)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Quick info icons and Status indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Status alerts indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
              <span className={`badge-ui badge-status-${report.rpStatus.toLowerCase()}`}>
                {report.rpStatus === 'Good' ? 'Good Standing' : report.rpStatus === 'Medium' ? 'Medium Standing' : 'Low RP Balance'}
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)' }}></div>

            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ 
                  background: showNotifications ? 'rgba(0, 210, 255, 0.15)' : 'none', 
                  border: 'none', 
                  color: showNotifications ? 'var(--color-primary)' : 'var(--text-muted)', 
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                title="Activity Announcements & Notifications"
              >
                <Bell size={18} />
                {(allActivities.length > 0 || queries.some(q => q.response)) && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px',
                    borderRadius: '50%', background: '#ef4444'
                  }} />
                )}
              </button>

              {/* Interactive Notifications Drawer Popover */}
              {showNotifications && (
                <div className="glass-panel animate-fade-in" style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  width: '340px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>🔔 Notifications & Announcements</h4>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem' }}>Close</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Faculty Query Resolutions */}
                    {queries.filter(q => q.response).map(q => (
                      <div key={'notif-q-' + q.id} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>✅ Query Responded</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{q.subject}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{q.response}</div>
                      </div>
                    ))}

                    {/* Recently Posted Activities by Staff */}
                    {allActivities.slice(0, 5).map(act => (
                      <div key={'notif-act-' + act.id} style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #0284c7' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', display: 'flex', justifyContent: 'space-between' }}>
                          <span>📢 New Activity Posted</span>
                          <span>+{act.rpValue} RP</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{act.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{act.description}</div>
                      </div>
                    ))}

                    {allActivities.length === 0 && queries.filter(q => q.response).length === 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>No recent notifications.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* CONTAINER FOR LOADED COMPONENT */}
        <div style={{
          flex: 1,
          padding: '30px',
          overflowY: 'auto'
        }}>
          
          {/* ==================== PAGE 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Portal Dashboard</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, {report.name}. Here is your aggregate academic reward status.</p>
                </div>

                {report.rpStatus !== 'Good' && (
                  <div style={{
                    background: report.rpStatus === 'Medium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${report.rpStatus === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    borderRadius: '12px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    maxWidth: '400px'
                  }}>
                    <AlertTriangle size={18} style={{ color: report.rpStatus === 'Medium' ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                    <span style={{ fontSize: '0.8rem', color: '#fff' }}>
                      {report.rpStatus === 'Medium' ? 'Points slightly below class average.' : 'Points below 80% of class average.'} Check <strong>Recommendations</strong> to earn points.
                    </span>
                  </div>
                )}
              </div>

              {/* RP Summary Cards Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(0, 210, 255, 0.08)', color: 'var(--color-primary)' }}>
                    <Award size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Your RP Balance</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{report.currentBalance} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pts</span></h3>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(121, 40, 202, 0.08)', color: 'var(--color-secondary)' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Class Average RP</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{report.averageRp} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pts</span></h3>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-warning)' }}>
                    <Medal size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Class Standing</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>#{report.rank} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>of {report.totalStudents}</span></h3>
                  </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
                  <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status Rating</span>
                    <div style={{ marginTop: '2px' }}>
                      <span className={`badge-ui badge-status-${report.rpStatus.toLowerCase()}`}>{report.rpStatus} Standing</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard Ranking & Recommendations Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '24px',
                alignItems: 'start'
              }}>
                
                {/* Weekly RP Growth Chart */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={22} style={{ color: '#0284c7' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Weekly RP Progress & Performance Chart</h3>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Track your reward point accumulation trend compared to class average velocity over 6 academic weeks.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0284c7' }}></span>
                        <span style={{ color: '#0f172a' }}>Your Balance</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span style={{ width: '12px', height: '12px', strokeDasharray: '3 3', borderRadius: '3px', background: '#f59e0b' }}></span>
                        <span style={{ color: '#0f172a' }}>Class Avg ({report.averageRp} RP)</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart Visual Graphic Area */}
                  {(() => {
                    const weeklyData = getWeeklyRpData();
                    const maxVal = Math.max(...weeklyData.map(d => Math.max(d.rp, d.avg)), 100);

                    // Compute pixel coordinates inside 840 x 240 viewBox
                    const width = 840;
                    const height = 240;
                    const paddingX = 60;
                    const stepX = (width - 2 * paddingX) / (weeklyData.length - 1);
                    const minY = 30;
                    const maxY = 210;
                    const heightY = maxY - minY;

                    const points = weeklyData.map((d, i) => ({
                      x: paddingX + i * stepX,
                      y: maxY - ((d.rp / maxVal) * heightY),
                      rp: d.rp,
                      earned: d.earned,
                      week: d.week
                    }));

                    // Smooth Bezier Curve Path generator
                    let pathD = `M ${points[0].x},${points[0].y}`;
                    let areaD = `M ${points[0].x},${maxY} L ${points[0].x},${points[0].y}`;
                    
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i];
                      const p1 = points[i + 1];
                      const cp1x = p0.x + (p1.x - p0.x) / 2;
                      const cp1y = p0.y;
                      const cp2x = p0.x + (p1.x - p0.x) / 2;
                      const cp2y = p1.y;
                      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
                      areaD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
                    }
                    areaD += ` L ${points[points.length - 1].x},${maxY} Z`;

                    // Average line Y position
                    const avgY = maxY - ((report.averageRp / maxVal) * heightY);

                    return (
                      <div>
                        <div style={{ height: '260px', width: '100%', position: 'relative', margin: '10px 0' }}>
                          <svg 
                            viewBox="0 0 840 260" 
                            style={{ width: '100%', height: '100%', overflow: 'visible' }}
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <linearGradient id="rpAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
                              </linearGradient>
                              <linearGradient id="rpLineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#0284c7" />
                                <stop offset="50%" stopColor="#00d2ff" />
                                <stop offset="100%" stopColor="#2563eb" />
                              </linearGradient>
                              <filter id="glowShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.4" />
                              </filter>
                            </defs>

                            {/* Horizontal Grid Lines */}
                            {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
                              const yVal = maxY - (pct * heightY);
                              return (
                                <g key={'grid-' + idx}>
                                  <line x1={paddingX - 10} y1={yVal} x2={width - paddingX + 10} y2={yVal} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth="1.2" />
                                  <text x={paddingX - 16} y={yVal + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="700">
                                    {Math.round(maxVal * pct)} RP
                                  </text>
                                </g>
                              );
                            })}

                            {/* Class Average Reference Line */}
                            <g>
                              <line x1={paddingX - 10} y1={avgY} x2={width - paddingX + 10} y2={avgY} stroke="#f59e0b" strokeDasharray="6 6" strokeWidth="2.5" />
                              <text x={width - paddingX + 15} y={avgY + 4} fill="#d97706" fontSize="12" fontWeight="800">
                                Avg: {report.averageRp} RP
                              </text>
                            </g>

                            {/* Gradient Area under Curve */}
                            <path d={areaD} fill="url(#rpAreaGradient)" />

                            {/* Connected Smooth Bezier Line */}
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="url(#rpLineGradient)" 
                              strokeWidth="4" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              filter="url(#glowShadow)"
                            />

                            {/* Data Nodes & Values */}
                            {points.map((pt, i) => {
                              const isCurrent = i === points.length - 1;
                              return (
                                <g key={'pt-' + i} className="chart-node">
                                  {/* Pulsing ring for current node */}
                                  {isCurrent && (
                                    <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke="#0284c7" strokeWidth="2" opacity="0.6">
                                      <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                  )}
                                  
                                  {/* Node Circle */}
                                  <circle 
                                    cx={pt.x} 
                                    cy={pt.y} 
                                    r={isCurrent ? "7" : "6"} 
                                    fill="#ffffff" 
                                    stroke={isCurrent ? "#2563eb" : "#0284c7"} 
                                    strokeWidth="3.5"
                                  />
                                  
                                  {/* Value Tag above Dot */}
                                  <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                                    <rect x="-22" y="-14" width="44" height="18" rx="6" fill="#0284c7" opacity="0.9" />
                                    <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">
                                      {pt.rp}
                                    </text>
                                  </g>
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* X-Axis Labels */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${paddingX}px`, borderTop: '2px solid #e2e8f0', paddingTop: '10px' }}>
                          {points.map((pt, i) => (
                            <div key={'xlabel-' + i} style={{ textAlign: 'center', minWidth: '70px' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: i === points.length - 1 ? '#0284c7' : '#334155' }}>
                                {pt.week}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 800, marginTop: '2px' }}>
                                +{pt.earned} RP
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Sticky Floating Recommendations Box with All Scrollable Activities */}
                <div 
                  className="glass-panel"
                  style={{
                    position: 'sticky',
                    top: '20px',
                    maxHeight: 'calc(100vh - 140px)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Recommended to Earn RP</h3>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                      {(allActivities.length > 0 ? allActivities : (report.recommendations || [])).length} Available
                    </span>
                  </div>
                  
                  {/* Scrollable Container showing ALL activities */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflowY: 'auto',
                    paddingRight: '6px',
                    maxHeight: '400px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 transparent'
                  }}>
                    {(allActivities.length > 0 ? allActivities : (report.recommendations || [])).map(act => (
                      <div 
                        key={act.id} 
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '3px', margin: 0, wordBreak: 'break-word' }}>
                            {act.title}
                          </h4>
                          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0 0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {act.description || act.category || 'Academic Activity'}
                          </p>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span style={{ 
                            fontSize: '0.82rem', 
                            fontWeight: 800, 
                            color: '#0284c7', 
                            background: 'rgba(2, 132, 199, 0.1)',
                            border: '1px solid rgba(2, 132, 199, 0.2)',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap'
                          }}>
                            +{act.rpValue} RP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== SEPARATE MODULE: LEADERBOARD ==================== */}
          {activeTab === 'leaderboard' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Class Standing Leaderboard</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive real-time student ranking board based on total earned extra-curricular Reward Points.</p>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Trophy size={22} style={{ color: 'var(--color-warning)' }} />
                  <h3>Student RP Ranking Roster</h3>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Student Name</th>
                        <th>Roll No</th>
                        <th>Year</th>
                        <th style={{ textAlign: 'right' }}>Total Earned RP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontWeight: 500 }}>
                            No student rankings available yet.
                          </td>
                        </tr>
                      ) : (
                        leaderboard.map(student => {
                          const isCurrentUser = student.studentId === user.id;
                          const rollNo = student.rollNo || student.email.split('@')[0].toUpperCase();
                          const rankBadge = student.rank === 1 ? '🥇 #1' : student.rank === 2 ? '🥈 #2' : student.rank === 3 ? '🥉 #3' : `#${student.rank}`;

                          return (
                            <tr 
                              key={student.studentId} 
                              style={{
                                background: isCurrentUser ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                                borderLeft: isCurrentUser ? '4px solid #0284c7' : 'none'
                              }}
                            >
                              <td>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: student.rank <= 3 ? '#0284c7' : '#475569' }}>
                                  {rankBadge}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: isCurrentUser ? 800 : 700, color: isCurrentUser ? '#0284c7' : '#0f172a', fontSize: '0.95rem' }}>
                                  {student.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim()} {isCurrentUser && <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.15)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontFamily: 'Outfit, monospace', fontWeight: 700, fontSize: '0.85rem', color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                                  {rollNo}
                                </span>
                              </td>
                              <td style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 500 }}>
                                {student.year || '1st Year'}
                              </td>
                              <td style={{ fontWeight: 800, color: '#0284c7', textAlign: 'right', fontSize: '1rem' }}>
                                {student.currentBalance} RP
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PAGE 2: ACTIVITIES POSTING ==================== */}
          {activeTab === 'activities' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Available Student Tasks & Activities</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Browse all challenges, events, and certifications posted by college faculty and administrators to earn Reward Points.</p>
                </div>

                {/* Category Filter Tabs */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Activities', icon: '⚡' },
                    { id: 'ps', label: 'PS Lead', icon: '🔬' },
                    { id: 'hackathon', label: 'Hackathon Lead', icon: '🏆' },
                    { id: 'certifications', label: 'Cert Lead', icon: '📜' },
                    { id: 'general', label: 'General', icon: '📢' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActCategoryFilter(cat.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1.5px solid',
                        borderColor: actCategoryFilter === cat.id ? 'var(--color-primary)' : '#cbd5e1',
                        background: actCategoryFilter === cat.id ? 'var(--color-primary)' : '#ffffff',
                        color: actCategoryFilter === cat.id ? '#ffffff' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feed of Activities */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px'
              }}>
                {(allActivities.length > 0 ? allActivities : (report ? report.recommendations : []))
                  .filter(act => actCategoryFilter === 'all' || (act.category || 'general') === actCategoryFilter)
                  .length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>No tasks found in this category.</p>
                ) : (
                  (allActivities.length > 0 ? allActivities : (report ? report.recommendations : []))
                    .filter(act => actCategoryFilter === 'all' || (act.category || 'general') === actCategoryFilter)
                    .map((act, index) => {
                      const catMeta = {
                        ps: { name: 'PS Assessment Lead', color: '#0284c7', icon: '🔬' },
                        hackathon: { name: 'Hackathon Lead', color: '#d97706', icon: '🏆' },
                        certifications: { name: 'Certifications Lead', color: '#059669', icon: '📜' },
                        general: { name: 'General Campus', color: '#4f46e5', icon: '📢' }
                      }[act.category || 'general'] || { name: 'General Campus', color: '#4f46e5', icon: '📢' };

                      return (
                        <div 
                          key={act.id + index}
                          className="glass-panel glass-panel-hover" 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between',
                            minHeight: '190px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: catMeta.color,
                                background: `${catMeta.color}15`,
                                border: `1px solid ${catMeta.color}40`,
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                {catMeta.icon} {catMeta.name}
                              </span>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 800, 
                                color: '#0284c7', 
                                background: 'rgba(2, 132, 199, 0.1)', 
                                padding: '4px 10px', 
                                borderRadius: '6px',
                                whiteSpace: 'nowrap'
                              }}>
                                +{act.rpValue} RP
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>{act.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>{act.description}</p>
                          </div>

                          {/* Submission Proof Section */}
                          {(() => {
                            const sub = submissions.find(s => s.activityId === act.id);
                            if (sub) {
                              if (sub.status === 'pending') {
                                return (
                                  <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Clock size={14} /> Document Submitted (Pending Review)
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px', wordBreak: 'break-all' }}>
                                      Proof: <strong>{sub.submissionText}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              if (sub.status === 'approved') {
                                return (
                                  <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <CheckCircle size={14} /> Verified & Approved (+{act.rpValue} RP)
                                    </div>
                                  </div>
                                );
                              }
                              if (sub.status === 'rejected') {
                                return (
                                  <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <AlertCircle size={14} /> Submission Rejected: {sub.feedback || 'Please update proof link'}
                                    </div>
                                    <button 
                                      onClick={() => { setSubmittingActId(act.id); setSubmissionInputText(sub.submissionText); }}
                                      className="btn btn-outline"
                                      style={{ marginTop: '8px', padding: '4px 10px', fontSize: '0.75rem' }}
                                    >
                                      Re-submit Document
                                    </button>
                                  </div>
                                );
                              }
                            }

                            if (submittingActId === act.id) {
                              return (
                                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(2, 132, 199, 0.05)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', display: 'block', marginBottom: '6px' }}>
                                    Document Link / Certificate URL / Proof Details:
                                  </label>
                                  <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. https://github.com/project or AWS Certificate ID"
                                    value={submissionInputText}
                                    onChange={(e) => setSubmissionInputText(e.target.value)}
                                    style={{ fontSize: '0.82rem', marginBottom: '8px' }}
                                  />
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                      onClick={() => handleSubmitProof(act.id)}
                                      className="btn btn-primary"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                      disabled={submittingProof}
                                    >
                                      {submittingProof ? 'Submitting...' : 'Submit Document'}
                                    </button>
                                    <button 
                                      onClick={() => { setSubmittingActId(null); setSubmissionInputText(''); }}
                                      className="btn btn-outline"
                                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <button 
                                onClick={() => { setSubmittingActId(act.id); setSubmissionInputText(''); }}
                                className="btn btn-primary"
                                style={{ marginTop: '12px', width: '100%', padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <Send size={14} />
                                <span>Submit Document / Proof</span>
                              </button>
                            );
                          })()}

                          <div style={{ 
                            marginTop: '16px', 
                            paddingTop: '12px', 
                            borderTop: '1px solid var(--border-glass)', 
                            fontSize: '0.75rem', 
                            color: 'var(--text-muted)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Posted by Staff / Faculty</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} style={{ color: '#10b981' }} /> Verified Activity
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE 3: REWARDS HISTORY ==================== */}
          {activeTab === 'history' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Reward Points Ledger</h2>
                <p style={{ color: 'var(--text-muted)' }}>Complete historical log of all reward point additions, manual allocations, and voucher redemptions.</p>
              </div>

              <div className="glass-panel">
                {report.history.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No point records found.</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Topic / Activity</th>
                          <th>Category</th>
                          <th>Allocation Source</th>
                          <th>Adjustment Type</th>
                          <th style={{ textAlign: 'right' }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.history.map(row => (
                          <tr key={row.id}>
                            <td>{new Date(row.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                                {row.activityTitle || row.description || 'Manual Adjustment'}
                              </div>
                              {row.description && row.activityTitle && row.description !== row.activityTitle && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{row.description}</div>
                              )}
                            </td>
                            <td>
                              {row.activityCategory ? (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  background: row.activityCategory === 'ps' ? 'rgba(0, 210, 255, 0.1)' :
                                             row.activityCategory === 'hackathon' ? 'rgba(245, 158, 11, 0.1)' :
                                             'rgba(121, 40, 202, 0.1)',
                                  color: row.activityCategory === 'ps' ? 'var(--color-primary)' :
                                         row.activityCategory === 'hackathon' ? 'var(--color-warning)' :
                                         'var(--color-secondary)'
                                }}>
                                  {row.activityCategory === 'ps' ? '🧩 Problem Solving' :
                                   row.activityCategory === 'hackathon' ? '💻 Hackathon' :
                                   '📜 Certification'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td>{row.activityId ? 'Verified Academic Event' : 'Direct adjustment'}</td>
                            <td>
                              <span className={`badge-ui badge-status-${row.points > 0 ? 'good' : 'low'}`}>
                                {row.points > 0 ? 'Added / Earned' : 'Redeemed / Used'}
                              </span>
                            </td>
                            <td style={{ 
                              fontWeight: 700, 
                              textAlign: 'right',
                              color: row.points > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                              {row.points > 0 ? `+${row.points}` : row.points} RP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE 4: INTERNAL MARKS ==================== */}
          {activeTab === 'marks' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Internal Marks Evaluator</h2>
                <p style={{ color: 'var(--text-muted)' }}>Check how your earned Reward Points contribute to your overall internal academic marks boost.</p>
              </div>

              <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Calculator size={22} style={{ color: 'var(--color-primary)' }} />
                  <h3>Academic Score Adjustment</h3>
                </div>

                {/* Metrics Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px'
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your Reward Points</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-primary)' }}>{report.currentBalance} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>RP</span></h3>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class Average RP</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-warning)' }}>{report.averageRp} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>RP</span></h3>
                  </div>
                </div>

                {/* Final Score Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 210, 255, 0.03) 100%)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Final Calculated Internal Score</span>
                  <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '8px', marginBottom: '16px' }}>
                    {report.rpBonus} <span style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>/ 11</span>
                  </h2>

                  <button 
                    onClick={handleDownloadPdf}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px' }}
                  >
                    <Download size={18} />
                    <span>Download Official Report (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Detailed Calculation Explanation */}
              <div className="glass-panel" style={{ fontSize: '0.88rem', lineHeight: '1.5' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Grade Bonus Policy & Formula</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Students earn an academic marks bonus based on their extra-curricular achievements. The bonus is calculated out of a maximum of <strong>11 marks</strong>.
                </p>
                <div style={{ background: 'rgba(15, 23, 42, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontFamily: 'Outfit, sans-serif' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-bright)', marginBottom: '6px' }}>Formula:</div>
                  <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>If <strong>Your Reward Points &gt;= Class Average RP</strong>: You get the full <strong>11 marks</strong>.</li>
                    <li>If <strong>Your Reward Points &lt; Class Average RP</strong>: Your score is proportionally reduced: <code>(Your RP / Class Average RP) * 11</code>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PAGE 5: STUDENT QUERIES ==================== */}
          {activeTab === 'queries' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Helpdesk Support</h2>
                <p style={{ color: 'var(--text-muted)' }}>Submit queries to college administrators about missing event points, evaluation issues, or general support.</p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                alignItems: 'start'
              }}>
                
                {/* Query submission box */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <QueryIcon size={20} style={{ color: 'var(--color-accent)' }} />
                    <h3>Submit Support Ticket</h3>
                  </div>

                  <form onSubmit={handleQuerySubmit}>
                    <div className="form-group">
                      <label className="form-label">Target Staff / Responsibility Area</label>
                      <select
                        className="form-input"
                        value={queryCategory}
                        onChange={(e) => setQueryCategory(e.target.value)}
                        style={{ 
                          background: '#ffffff', 
                          color: '#0f172a', 
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 600,
                          fontSize: '0.95rem'
                        }}
                      >
                        <option value="ps" style={{ background: '#ffffff', color: '#0f172a', padding: '10px' }}>
                          🔬 PS Assessment Lead (Problem Solving)
                        </option>
                        <option value="hackathon" style={{ background: '#ffffff', color: '#0f172a', padding: '10px' }}>
                          🏆 Hackathon Lead (Contests & Competitions)
                        </option>
                        <option value="certifications" style={{ background: '#ffffff', color: '#0f172a', padding: '10px' }}>
                          📜 Certifications Lead (Internships & NPTEL)
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Winner bonus points not credited" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                      <label className="form-label">Message Details</label>
                      <textarea 
                        className="form-input" 
                        rows="4" 
                        placeholder="Detail your request, naming the activity date and expected points..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-secondary" 
                      style={{ width: '100%' }}
                      disabled={submittingQuery}
                    >
                      <Send size={16} />
                      <span>{submittingQuery ? 'Submitting query...' : 'Send Query to Selected Staff'}</span>
                    </button>
                  </form>
                </div>

                {/* Ticket history and resolutions */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Previous Query Submissions</h3>

                  {queries.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                      No support tickets submitted.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto' }}>
                      {queries.map(q => {
                        const catMeta = {
                          ps: { name: 'PS Lead', color: '#00d2ff', icon: '🔬' },
                          hackathon: { name: 'Hackathon Lead', color: '#f59e0b', icon: '🏆' },
                          certifications: { name: 'Cert Lead', color: '#10b981', icon: '📜' }
                        }[q.category || 'ps'] || { name: 'PS Lead', color: '#00d2ff', icon: '🔬' };

                        return (
                          <div 
                            key={q.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.01)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '10px',
                              padding: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-bright)' }}>{q.subject}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: catMeta.color,
                                  background: `${catMeta.color}15`,
                                  border: `1px solid ${catMeta.color}40`,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  {catMeta.icon} {catMeta.name}
                                </span>
                                <span className={`badge-ui badge-ticket-${q.status}`}>{q.status}</span>
                              </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '6px 0 10px' }}>{q.message}</p>
                            
                            {q.response ? (
                              <div style={{
                                background: `${catMeta.color}10`,
                                border: `1px solid ${catMeta.color}30`,
                                borderLeft: `4px solid ${catMeta.color}`,
                                padding: '10px 14px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                marginTop: '8px'
                              }}>
                                <span style={{ fontWeight: 800, color: catMeta.color }}>{catMeta.name} Resolution:</span>
                                <p style={{ marginTop: '4px', color: '#0f172a', fontWeight: 600, margin: '4px 0 0' }}>{q.response}</p>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                <Clock size={12} /> Waiting for {catMeta.name} response...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

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
