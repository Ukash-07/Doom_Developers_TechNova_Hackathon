import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import {
  ShieldCheck, BookOpen, Users, MessageSquare, Plus, Award,
  Send, Edit, CheckCircle, Clock, Cpu, Trophy, BadgeCheck, FileCheck, ExternalLink, Check, X, Search, Filter, Download, FileText
} from 'lucide-react';

// Map responsibility to display labels and theme color
const RESP_CONFIG = {
  ps: {
    label: 'PS Assessment Completion',
    icon: <Cpu size={22} />,
    color: '#00d2ff',
    colorSecondary: '#0088ff',
    description: 'You manage Problem Solving (PS) assessment completions, evaluations, and point awards for students.',
    activityPlaceholder: 'e.g. PS1 Slot Completion - Problem Statement A',
    descPlaceholder: 'Description of the PS task, deadline, and completion criteria...',
    badge: 'PS Faculty'
  },
  hackathon: {
    label: 'Hackathons, Contests & Competitions',
    icon: <Trophy size={22} />,
    color: '#f59e0b',
    colorSecondary: '#ef4444',
    description: 'You manage hackathons, coding contests, technical competitions, and associated reward point allocations.',
    activityPlaceholder: 'e.g. National Level Hackathon 2026 – Top 10 Finish',
    descPlaceholder: 'Competition name, date, position criteria, and eligibility details...',
    badge: 'Hackathon Faculty'
  },
  certifications: {
    label: 'Internships, Certifications & NPTEL',
    icon: <BadgeCheck size={22} />,
    color: '#10b981',
    colorSecondary: '#6366f1',
    description: 'You manage internship completions, industry certifications, and NPTEL course certifications.',
    activityPlaceholder: 'e.g. NPTEL "Cloud Computing" Course Completion',
    descPlaceholder: 'Certification name, platform, duration, and verification requirements...',
    badge: 'Certifications Faculty'
  }
};

export default function FacultyDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('activities');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [queries, setQueries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
  const [editingMarksId, setEditingMarksId] = useState(null);
  const [newBaseMarks, setNewBaseMarks] = useState('');

  // Roster Filter & Search States
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rpFilterMode, setRpFilterMode] = useState('all'); // 'all' | 'lessThan' | 'greaterThan'
  const [maxRpThreshold, setMaxRpThreshold] = useState('');

  // Activity form
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [actRp, setActRp] = useState('');
  const [creatingAct, setCreatingAct] = useState(false);

  // RP form
  const [rpStudentId, setRpStudentId] = useState('');
  const [rpActivityId, setRpActivityId] = useState('');
  const [rpType, setRpType] = useState('allocate');
  const [rpPoints, setRpPoints] = useState('');
  const [rpDesc, setRpDesc] = useState('');
  const [submittingRp, setSubmittingRp] = useState(false);

  // Query
  const [activeQueryId, setActiveQueryId] = useState(null);
  const [queryResponse, setQueryResponse] = useState('');
  const [respondingQuery, setRespondingQuery] = useState(false);

  const responsibility = user?.facultyResponsibility || 'ps';
  const cfg = RESP_CONFIG[responsibility] || RESP_CONFIG.ps;

  const showToast = (msg, type = 'info') => setToast({ message: msg, type });

  const fetchData = async () => {
    try {
      const [studRes, actRes, qRes, subRes] = await Promise.all([
        fetch('/api/reports/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/activities', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/queries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/submissions', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (studRes.ok) setStudents(await studRes.json());
      if (actRes.ok) {
        const acts = await actRes.json();
        // Filter activities to this faculty's category
        setActivities(acts.filter(a => a.category === responsibility || a.category === 'general'));
      }
      if (qRes.ok) setQueries(await qRes.json());
      if (subRes.ok) setSubmissions(await subRes.json());
    } catch (err) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmission = async (subId, status, feedback = '') => {
    try {
      const res = await fetch(`/api/submissions/${subId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, feedback })
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || `Submission marked as ${status}!`, 'success');
        fetchData();
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error reviewing submission', 'error');
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!actTitle || !actDesc || !actRp) {
      showToast('Please fill in all activity fields', 'error');
      return;
    }
    setCreatingAct(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: actTitle, description: actDesc, rpValue: actRp, category: responsibility })
      });
      if (res.ok) {
        showToast('Activity posted successfully!', 'success');
        setActTitle(''); setActDesc(''); setActRp('');
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed to create activity', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setCreatingAct(false); }
  };

  const handleRpTransaction = async (e) => {
    e.preventDefault();
    if (!rpStudentId || !rpPoints) {
      showToast('Please select a student and enter points', 'error');
      return;
    }
    setSubmittingRp(true);
    try {
      const url = rpType === 'allocate' ? '/api/rp/allocate' : '/api/rp/deduct';
      const body = { studentId: rpStudentId, points: rpPoints, description: rpDesc };
      if (rpType === 'allocate' && rpActivityId) body.activityId = rpActivityId;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message || 'Transaction applied!', 'success');
        setRpPoints(''); setRpDesc(''); setRpActivityId('');
        fetchData();
      } else showToast(d.message || 'Transaction failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setSubmittingRp(false); }
  };

  const handleViewStudent = async (studentId) => {
    try {
      const res = await fetch(`/api/reports/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data);
        setSelectedStudentHistory(data.history || []);
      } else {
        showToast('Failed to load student details', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDownloadPdf = (student, history = []) => {
    if (!student) return;
    const rollNo = student.rollNo || student.email.split('@')[0].toUpperCase();
    const rpBonus = student.rpBonus !== undefined ? student.rpBonus : (student.currentBalance > 0 ? Number(((student.currentBalance / 450) * 11).toFixed(1)) : 0);
    const rankVal = student.rank || 1;
    const badgeVal = student.badge || 'Participant';

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Academic_Report_${rollNo}_${student.name.replace(/\s+/g, '_')}</title>
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
            <td class="value">${student.name}</td>
          </tr>
          <tr>
            <td class="label">Roll Number:</td>
            <td class="value"><strong style="color: #0284c7;">${rollNo}</strong></td>
          </tr>
          <tr>
            <td class="label">Mail ID (Email):</td>
            <td class="value">${student.email}</td>
          </tr>
          <tr>
            <td class="label">Balance Points:</td>
            <td class="value rp-text">${student.currentBalance} RP</td>
          </tr>
          <tr>
            <td class="label">Internal Marks (out of 11):</td>
            <td class="value marks-text">${rpBonus} / 11 Marks</td>
          </tr>
          <tr>
            <td class="label">Class Standing Rank:</td>
            <td class="value">Rank #${rankVal} (${badgeVal} Badge)</td>
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
            ${history.length === 0 ? '<tr><td colSpan="3" style="text-align:center; color:#64748b;">No activity records logged.</td></tr>' : 
              history.map(h => `
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

    let iframe = document.getElementById('faculty-report-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'faculty-report-print-iframe';
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

  const handleSaveMarks = async (studentId) => {
    if (newBaseMarks === '' || isNaN(newBaseMarks)) {
      showToast('Enter a valid numeric mark', 'error'); return;
    }
    try {
      const res = await fetch(`/api/reports/student/${studentId}/marks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ internalMarks: newBaseMarks })
      });
      if (res.ok) {
        showToast('Marks updated!', 'success');
        setEditingMarksId(null);
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed to update marks', 'error');
      }
    } catch { showToast('Network error', 'error'); }
  };

  const handleRespondQuery = async (queryId) => {
    if (!queryResponse.trim()) { showToast('Response cannot be empty', 'error'); return; }
    setRespondingQuery(true);
    try {
      const res = await fetch(`/api/queries/${queryId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response: queryResponse })
      });
      if (res.ok) {
        showToast('Response sent!', 'success');
        setQueryResponse(''); setActiveQueryId(null);
        fetchData();
      } else {
        const d = await res.json();
        showToast(d.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setRespondingQuery(false); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Loading faculty workspace...
        </p>
      </div>
    );
  }

  const navBtn = (id, icon, label) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
        padding: '12px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 500, textAlign: 'left',
        background: activeTab === id ? `linear-gradient(135deg, ${cfg.color}, ${cfg.colorSecondary})` : 'transparent',
        color: activeTab === id ? '#ffffff' : 'var(--text-main)', transition: 'all 0.25s ease'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '260px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-glass)',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0
      }}>
        <div style={{ flex: 1, padding: '0 16px' }}>
          {/* Domain badge */}
          <div style={{
            margin: '0 0 20px 0', padding: '14px',
            background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.colorSecondary}12)`,
            border: `1px solid ${cfg.color}33`, borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cfg.color, marginBottom: '6px' }}>
              {cfg.icon}
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cfg.badge}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              {cfg.label}
            </p>
          </div>

          <span style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '12px', display: 'block', marginBottom: '16px'
          }}>
            Faculty Workspace
          </span>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navBtn('activities', <BookOpen size={20} />, 'Activity Posting')}
            {navBtn('rp-posting', <Award size={20} />, 'RP Allocation')}
            {navBtn('submissions', <FileCheck size={20} />, 'Document Submissions')}
            {navBtn('reports', <Users size={20} />, 'Students Report')}
            {navBtn('queries', <MessageSquare size={20} />, 'Query View')}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div style={{
          padding: '16px', borderTop: '1px solid var(--border-glass)', margin: '0 16px',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.colorSecondary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif', flexShrink: 0
          }}>
            F
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: '60px', borderBottom: '1px solid var(--border-glass)',
          padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: cfg.color }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>
              Faculty Control Panel — {cfg.label}
            </span>
          </div>
          <span className="badge-ui" style={{
            background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}33`
          }}>
            {cfg.badge}
          </span>
        </header>

        <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>

          {/* ====== MODULE 1: ACTIVITY POSTING MODULE ====== */}
          {activeTab === 'activities' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Activity Setup Module</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Create and manage academic tasks, hackathons, and certifications for <strong style={{ color: cfg.color }}>{cfg.label}</strong>.
                </p>
              </div>

              {/* Domain info banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
                background: `linear-gradient(135deg, ${cfg.color}12, ${cfg.colorSecondary}08)`,
                border: `1px solid ${cfg.color}25`, borderRadius: '12px', marginBottom: '24px'
              }}>
                <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{cfg.description}</p>
              </div>

              {/* Create Activity Form */}
              <div className="glass-panel" style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Plus size={20} style={{ color: cfg.color }} />
                  <h3>Create New Activity</h3>
                </div>
                <form onSubmit={handleCreateActivity}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Activity Title</label>
                      <input type="text" className="form-input" placeholder={cfg.activityPlaceholder}
                        value={actTitle} onChange={e => setActTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reward Points Value (RP)</label>
                      <input type="number" className="form-input" placeholder="e.g. 100"
                        value={actRp} onChange={e => setActRp(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description / Instructions</label>
                    <textarea className="form-input" rows="3" placeholder={cfg.descPlaceholder}
                      value={actDesc} onChange={e => setActDesc(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}33`
                      }}>
                        Category: {responsibility.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-assigned to your domain responsibility</span>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{
                      padding: '10px 28px',
                      background: `linear-gradient(135deg, ${cfg.color}, ${cfg.colorSecondary})`
                    }} disabled={creatingAct}>
                      <span>{creatingAct ? 'Posting...' : 'Post New Activity'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Posted Activities List */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                    Active Posted Activities — <span style={{ color: cfg.color }}>{cfg.label}</span>
                  </h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {activities.length} Posted
                  </span>
                </div>
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activities posted in your domain yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {activities.map(a => (
                      <div key={a.id} style={{
                        background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-glass)',
                        borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-bright)' }}>{a.title}</h4>
                            <span style={{
                              fontSize: '0.8rem', fontWeight: 800, color: cfg.color,
                              background: `${cfg.color}12`, padding: '2px 6px', borderRadius: '4px'
                            }}>+{a.rpValue} RP</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{a.description}</p>
                        </div>
                        <div style={{
                          fontSize: '0.72rem', color: 'var(--text-muted)',
                          borderTop: '1px solid rgba(0,0,0,0.04)', marginTop: '12px', paddingTop: '8px',
                          display: 'flex', justifyContent: 'space-between'
                        }}>
                          <span>Posted: {new Date(a.createdAt).toLocaleDateString()}</span>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                            textTransform: 'uppercase', background: `${cfg.color}15`, color: cfg.color
                          }}>{a.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== MODULE 2: RP ALLOCATION MODULE ====== */}
          {activeTab === 'rp-posting' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student RP Allocation & Points Management</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Credit reward points or issue RP deductions directly for student profiles in <strong style={{ color: cfg.color }}>{cfg.label}</strong>.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Allocate / Deduct RP Form Card */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Award size={20} style={{ color: cfg.colorSecondary }} />
                    <h3>Allocate Points to Student Profile</h3>
                  </div>
                  <form onSubmit={handleRpTransaction}>
                    <div style={{
                      display: 'flex', gap: '16px', padding: '4px',
                      background: 'rgba(0,0,0,0.02)', borderRadius: '8px',
                      border: '1px solid var(--border-glass)', marginBottom: '20px'
                    }}>
                      <button type="button" onClick={() => { setRpType('allocate'); setRpDesc(''); }} style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        background: rpType === 'allocate' ? cfg.color : 'transparent',
                        color: rpType === 'allocate' ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}>
                        Allocate Points (+)
                      </button>
                      <button type="button" onClick={() => { setRpType('deduct'); setRpActivityId(''); }} style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        background: rpType === 'deduct' ? 'var(--color-danger)' : 'transparent',
                        color: rpType === 'deduct' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}>
                        Redeem / Deduct (-)
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Student Name</label>
                      <select className="form-select" value={rpStudentId} onChange={e => setRpStudentId(e.target.value)}>
                        <option value="" style={{ background: '#ffffff', color: '#0f172a' }}>-- Select Student --</option>
                        {students.map(s => (
                          <option key={s.studentId} value={s.studentId} style={{ background: '#ffffff', color: '#0f172a' }}>{s.name} ({s.email})</option>
                        ))}
                      </select>
                    </div>

                    {rpType === 'allocate' && (
                      <div className="form-group">
                        <label className="form-label">Linked Activity</label>
                        <select className="form-select" value={rpActivityId} onChange={e => setRpActivityId(e.target.value)}>
                          <option value="" style={{ background: '#ffffff', color: '#0f172a' }}>-- Custom Manual Allocation --</option>
                          {activities.map(a => (
                            <option key={a.id} value={a.id} style={{ background: '#ffffff', color: '#0f172a' }}>{a.title} (+{a.rpValue} RP)</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Points</label>
                        <input type="number" className="form-input" placeholder="e.g. 50"
                          value={rpPoints} onChange={e => setRpPoints(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description / Memo</label>
                        <input type="text" className="form-input"
                          placeholder={rpType === 'allocate' ? 'e.g. Completed task' : 'Reason for deduction'}
                          value={rpDesc} onChange={e => setRpDesc(e.target.value)} />
                      </div>
                    </div>

                    <button type="submit" className={`btn ${rpType === 'allocate' ? 'btn-primary' : 'btn-danger'}`}
                      style={{
                        width: '100%', marginTop: '8px',
                        background: rpType === 'allocate' ? `linear-gradient(135deg, ${cfg.color}, ${cfg.colorSecondary})` : undefined
                      }}
                      disabled={submittingRp}>
                      <span>{submittingRp ? 'Applying...' : rpType === 'allocate' ? 'Allocate Points' : 'Deduct Points'}</span>
                    </button>
                  </form>
                </div>

                {/* Quick Student Reference Roster Card */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Users size={20} style={{ color: '#0284c7' }} />
                    <h3>Student Balance Roster</h3>
                  </div>
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th style={{ textAlign: 'right' }}>RP Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <tr key={s.studentId}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.85rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                              {s.currentBalance} RP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====== REPORTS TAB ====== */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Roster & Reports</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Overview of all registered students, overall points standing, and baseline exam marks. Click any student profile to open their full report.
                </p>
              </div>

              {/* Roster list */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Users size={22} style={{ color: 'var(--color-primary)' }} />
                  <h3>Registered Students</h3>
                </div>

                {/* Search and Filter Control Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'center',
                  justify: 'space-between',
                  marginBottom: '20px',
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  {/* Left: Search input for Name / Roll No */}
                  <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <Search size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '12px' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by Name, Roll No, or Email..."
                      value={rosterSearchQuery}
                      onChange={e => setRosterSearchQuery(e.target.value)}
                      style={{ paddingLeft: '38px', fontSize: '0.88rem', width: '100%' }}
                    />
                  </div>

                  {/* Right: RP Filter Dropdown & Threshold Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        RP Filter:
                      </label>
                      <select
                        className="form-select"
                        value={rpFilterMode}
                        onChange={e => setRpFilterMode(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '8px 12px', width: 'auto', background: '#ffffff', color: '#0f172a' }}
                      >
                        <option value="all">All Students</option>
                        <option value="lessThan">Reward Points Less Than (&lt;)</option>
                        <option value="greaterThan">Reward Points &ge;</option>
                      </select>
                    </div>

                    {rpFilterMode !== 'all' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          Limit:
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="e.g. 50"
                          value={maxRpThreshold}
                          onChange={e => setMaxRpThreshold(e.target.value)}
                          style={{ width: '90px', padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>RP</span>
                      </div>
                    )}

                    {(rosterSearchQuery || rpFilterMode !== 'all' || maxRpThreshold !== '') && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setRosterSearchQuery(''); setRpFilterMode('all'); setMaxRpThreshold(''); }}
                        style={{ padding: '7px 12px', fontSize: '0.78rem', border: '1px solid #cbd5e1' }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Rank</th>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>RP Balance</th>
                        <th>Internal Marks (out of 11)</th>
                        <th style={{ textAlign: 'right' }}>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(s => {
                        const rollCode = s.rollNo || s.email.split('@')[0].toUpperCase();
                        const studentName = s.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim();
                        const q = rosterSearchQuery.toLowerCase().trim();

                        const matchesSearch = !q || 
                          studentName.toLowerCase().includes(q) || 
                          s.email.toLowerCase().includes(q) || 
                          rollCode.toLowerCase().includes(q);

                        let matchesRp = true;
                        if (rpFilterMode === 'lessThan' && maxRpThreshold !== '') {
                          matchesRp = Number(s.currentBalance) < Number(maxRpThreshold);
                        } else if (rpFilterMode === 'greaterThan' && maxRpThreshold !== '') {
                          matchesRp = Number(s.currentBalance) >= Number(maxRpThreshold);
                        }

                        return matchesSearch && matchesRp;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No student records match the selected search criteria or RP filter threshold.
                          </td>
                        </tr>
                      ) : (
                        students.filter(s => {
                          const rollCode = s.rollNo || s.email.split('@')[0].toUpperCase();
                          const studentName = s.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim();
                          const q = rosterSearchQuery.toLowerCase().trim();

                          const matchesSearch = !q || 
                            studentName.toLowerCase().includes(q) || 
                            s.email.toLowerCase().includes(q) || 
                            rollCode.toLowerCase().includes(q);

                          let matchesRp = true;
                          if (rpFilterMode === 'lessThan' && maxRpThreshold !== '') {
                            matchesRp = Number(s.currentBalance) < Number(maxRpThreshold);
                          } else if (rpFilterMode === 'greaterThan' && maxRpThreshold !== '') {
                            matchesRp = Number(s.currentBalance) >= Number(maxRpThreshold);
                          }

                          return matchesSearch && matchesRp;
                        }).map(s => {
                          const rollCode = s.rollNo || s.email.split('@')[0].toUpperCase();

                          return (
                            <tr key={s.studentId}>
                              <td>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: s.rank <= 3 ? '#0284c7' : 'var(--text-bright)' }}>
                                  #{s.rank}
                                </span>
                              </td>
                              <td>
                                <span style={{ 
                                  fontFamily: 'Outfit, monospace', 
                                  fontWeight: 700, 
                                  fontSize: '0.85rem', 
                                  color: '#0284c7', 
                                  background: 'rgba(2, 132, 199, 0.08)', 
                                  border: '1px solid rgba(2, 132, 199, 0.2)',
                                  padding: '3px 8px', 
                                  borderRadius: '6px' 
                                }}>
                                  {rollCode}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.95rem' }}>
                                  {s.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim()}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.95rem' }}>
                                  {s.currentBalance} RP
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <strong style={{ fontSize: '1.05rem', color: '#059669', fontWeight: 800 }}>
                                    {s.rpBonus !== undefined ? s.rpBonus : (s.currentBalance > 0 ? 11 : 0)} / 11
                                  </strong>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button 
                                    className="btn btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    onClick={() => handleViewStudent(s.studentId)}
                                  >
                                    View Report
                                  </button>
                                </div>
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

          {/* ====== QUERIES TAB ====== */}
          {activeTab === 'queries' && (
            <div className="animate-fade-in" style={{ maxWidth: '900px' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Query Helpdesk & Support</h2>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: cfg.color,
                    background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`,
                    padding: '4px 10px', borderRadius: '20px'
                  }}>
                    Assigned Domain: {cfg.badge}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                  Student queries submitted specifically to your responsibility area (<strong>{cfg.badge}</strong>).
                </p>
              </div>
              <div className="glass-panel">
                {queries.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student support queries assigned to {cfg.badge} domain yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {queries.map(q => (
                      <div key={q.id} style={{
                        border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden'
                      }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 18px',
                          background: q.status === 'pending' ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.04)',
                          borderBottom: '1px solid var(--border-glass)'
                        }}>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.95rem' }}>{q.subject}</span>
                            {q.studentName && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                                by {q.studentName}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {q.status === 'pending'
                              ? <Clock size={14} style={{ color: '#f59e0b' }} />
                              : <CheckCircle size={14} style={{ color: '#10b981' }} />}
                            <span className="badge-ui" style={{
                              background: q.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                              color: q.status === 'pending' ? '#f59e0b' : '#10b981',
                              border: `1px solid ${q.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`
                            }}>
                              {q.status}
                            </span>
                          </div>
                        </div>
                        <div style={{ padding: '14px 18px' }}>
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.5 }}>{q.message}</p>
                          {q.response && (
                            <div style={{
                              padding: '10px 14px', borderRadius: '8px',
                              background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)',
                              fontSize: '0.85rem', color: 'var(--text-bright)', marginBottom: '10px'
                            }}>
                              <strong style={{ color: '#10b981' }}>Response: </strong>{q.response}
                            </div>
                          )}
                          {q.status === 'pending' && (
                            activeQueryId === q.id ? (
                              <div>
                                <textarea className="form-input" rows="3" placeholder="Type your resolution..."
                                  value={queryResponse} onChange={e => setQueryResponse(e.target.value)}
                                  style={{ resize: 'vertical', marginBottom: '10px' }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    onClick={() => handleRespondQuery(q.id)} disabled={respondingQuery}>
                                    <Send size={14} />
                                    <span>{respondingQuery ? 'Sending...' : 'Send Response'}</span>
                                  </button>
                                  <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    onClick={() => { setActiveQueryId(null); setQueryResponse(''); }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button className="btn btn-outline" style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                                onClick={() => { setActiveQueryId(q.id); setQueryResponse(''); }}>
                                Respond to Query
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE 4: DOCUMENT SUBMISSIONS ==================== */}
          {activeTab === 'submissions' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Document & Proof Submissions</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Review student certificate URLs, hackathon repos, and internship proofs submitted for your domain (<strong>{cfg.badge}</strong>). Approving automatically credits reward points to the student.</p>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <FileCheck size={22} style={{ color: cfg.color }} />
                  <h3>Submitted Proofs & Verification Requests</h3>
                </div>

                {submissions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student document submissions received yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {submissions.map(s => {
                      const isUrl = s.submissionText.startsWith('http://') || s.submissionText.startsWith('https://');

                      return (
                        <div 
                          key={s.id} 
                          style={{
                            border: '1px solid var(--border-glass)',
                            borderRadius: '12px',
                            padding: '18px',
                            background: s.status === 'pending' ? 'rgba(245,158,11,0.03)' : s.status === 'approved' ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '1rem' }}>{s.studentName}</span>
                                <span style={{ fontFamily: 'Outfit, monospace', fontSize: '0.78rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>{s.rollNo}</span>
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Submitted for: <strong style={{ color: 'var(--text-bright)' }}>{s.activityTitle}</strong> (+{s.rpValue} RP)
                              </div>
                            </div>

                            <span className="badge-ui" style={{
                              background: s.status === 'pending' ? 'rgba(245,158,11,0.15)' : s.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: s.status === 'pending' ? '#f59e0b' : s.status === 'approved' ? '#10b981' : '#ef4444',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              fontSize: '0.75rem'
                            }}>
                              {s.status}
                            </span>
                          </div>

                          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Submission Link / Proof Text:</span>
                            {isUrl ? (
                              <a href={s.submissionText} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'underline', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {s.submissionText} <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span style={{ color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>{s.submissionText}</span>
                            )}
                          </div>

                          {s.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleReviewSubmission(s.id, 'approved', 'Approved by Faculty')}
                                style={{ padding: '8px 16px', fontSize: '0.82rem', background: '#059669', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Check size={16} />
                                <span>Approve & Award +{s.rpValue} RP</span>
                              </button>
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleReviewSubmission(s.id, 'rejected', 'Invalid proof / link')}
                                style={{ padding: '8px 16px', fontSize: '0.82rem', background: '#dc2626', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <X size={16} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              Reviewed: {s.feedback || s.status} on {new Date(s.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STUDENT REPORT OVERLAY MODAL (Full Report popup) */}
      {selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '720px',
            maxHeight: '88vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            padding: '28px',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileText size={22} style={{ color: '#0284c7' }} />
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Official Academic Report</h2>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Individual Performance Card & Points History</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownloadPdf(selectedStudent, selectedStudentHistory)}
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={16} />
                  <span>Download Report (PDF)</span>
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={() => setSelectedStudent(null)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Profile Statistics Table Grid */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Student Name:</span>
                  <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{selectedStudent.name}</strong>
                </div>

                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Roll Number:</span>
                  <strong style={{ color: '#0284c7', fontSize: '1rem' }}>{selectedStudent.rollNo || selectedStudent.email.split('@')[0].toUpperCase()}</strong>
                </div>

                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Mail ID (Email):</span>
                  <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{selectedStudent.email}</strong>
                </div>

                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Balance Points:</span>
                  <strong style={{ color: '#0284c7', fontSize: '1.05rem' }}>{selectedStudent.currentBalance} RP</strong>
                </div>

                <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(5, 150, 105, 0.06)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700 }}>Internal Marks (out of 11):</span>
                  <strong style={{ fontSize: '1.2rem', color: '#059669', fontWeight: 800 }}>
                    {selectedStudent.rpBonus !== undefined ? selectedStudent.rpBonus : (selectedStudent.currentBalance > 0 ? 11 : 0)} / 11 Marks
                  </strong>
                </div>
              </div>
            </div>

            {/* Ledger logs */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Points History & Activity Logs</h3>
            {(!selectedStudentHistory || selectedStudentHistory.length === 0) ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem', padding: '10px 0', textAlign: 'center' }}>No points transactions found for this student.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedStudentHistory.map(h => (
                  <div 
                    key={h.id} 
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{h.description || 'Activity RP Credit'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: h.points > 0 ? '#059669' : '#dc2626' }}>
                      {h.points > 0 ? `+${h.points}` : h.points} RP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
