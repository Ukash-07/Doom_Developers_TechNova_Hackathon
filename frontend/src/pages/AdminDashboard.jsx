import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import * as XLSX from 'xlsx';
import { 
  ShieldAlert, BookOpen, Users, MessageSquare, Plus, Award, 
  Send, Bell, Settings, Edit, UserCheck, Clock, CheckCircle, UserPlus, Cpu, Trophy, BadgeCheck, Download, FileText, FileCheck, ExternalLink, Check, X, UploadCloud, FileSpreadsheet, Trash2, UserX, Search, Filter
} from 'lucide-react';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('activities'); // 'activities' | 'rp' | 'reports' | 'submissions' | 'queries' | 'users'
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Roster Filter & Search States
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rpFilterMode, setRpFilterMode] = useState('all'); // 'all' | 'lessThan' | 'greaterThan'
  const [maxRpThreshold, setMaxRpThreshold] = useState('');

  // Data lists
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [queries, setQueries] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Modal / Selected Student view
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState([]);
  const [editingMarksId, setEditingMarksId] = useState(null);
  const [newBaseMarks, setNewBaseMarks] = useState('');

  // Forms
  // 1. Create Activity
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [actRp, setActRp] = useState('');
  const [actCategory, setActCategory] = useState('general');
  const [creatingAct, setCreatingAct] = useState(false);

  // 2. Allocate/Deduct RP
  const [rpStudentId, setRpStudentId] = useState('');
  const [rpActivityId, setRpActivityId] = useState('');
  const [rpType, setRpType] = useState('allocate'); // 'allocate' | 'deduct'
  const [rpPoints, setRpPoints] = useState('');
  const [rpDesc, setRpDesc] = useState('');
  const [submittingTransaction, setSubmittingTransaction] = useState(false);

  // Excel Bulk Upload State
  const [excelFile, setExcelFile] = useState(null);
  const [excelParsedData, setExcelParsedData] = useState([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  const handleExcelFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsed = rawJson.map(row => {
          const email = row['Email'] || row['Mail'] || row['email'] || row['Mail ID'] || row['Student Mail'] || '';
          const purpose = row['Purpose of adding RP'] || row['Purpose'] || row['purpose'] || row['Reason'] || row['Event'] || row['Description'] || '';
          const points = row['RP to Add'] || row['RP Points'] || row['RP'] || row['points'] || row['Points'] || '';

          return {
            email: String(email).trim(),
            purpose: String(purpose).trim(),
            points: Number(points) || 0
          };
        }).filter(r => r.email || r.points);

        setExcelParsedData(parsed);
        if (parsed.length === 0) {
          showToast('No valid student rows found in uploaded spreadsheet', 'error');
        } else {
          showToast(`Successfully parsed ${parsed.length} student records from Excel file!`, 'success');
        }
      } catch (err) {
        console.error('Excel parse error:', err);
        showToast('Failed to parse file. Please ensure it is a valid .xlsx, .xls or .csv file.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleTemplate = () => {
    const csvContent = "Email,Purpose of adding RP,RP to Add\ns10@college.edu,National Hackathon Winner 1st Place,150\ns2@college.edu,NPTEL Cloud Computing Certification,80\ns4@college.edu,Paper Presentation 2nd Runner Up,60";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Sample_Student_RP_Bulk_Allocation_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitBulkExcelAllocations = async () => {
    if (excelParsedData.length === 0) {
      showToast('Please select an Excel/CSV file with student RP records first', 'error');
      return;
    }

    setUploadingExcel(true);
    try {
      const res = await fetch('/api/rp/bulk-allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: excelParsedData })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Successfully allocated RP for ${data.successCount} students!`, 'success');
        setExcelFile(null);
        setExcelParsedData([]);
        fetchAdminData();
      } else {
        showToast(data.message || 'Bulk allocation failed', 'error');
      }
    } catch (err) {
      showToast('Network error during bulk Excel allocation', 'error');
    } finally {
      setUploadingExcel(false);
    }
  };

  // 3. Respond to Query
  const [activeQueryId, setActiveQueryId] = useState(null);
  const [queryResponseText, setQueryResponseText] = useState('');

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

    let iframe = document.getElementById('admin-report-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'admin-report-print-iframe';
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

  const [respondingToQuery, setRespondingToQuery] = useState(false);

  // 4. User Management (create/remove faculty/student)
  const [faculties, setFaculties] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('faculty');
  const [newUserYear, setNewUserYear] = useState('1st Year');
  const [newUserResponsibility, setNewUserResponsibility] = useState('ps');
  const [creatingUser, setCreatingUser] = useState(false);

  // Deletion modal state
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [userMgmtTab, setUserMgmtTab] = useState('faculty'); // 'faculty' | 'student'
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/auth/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User account removed successfully!', 'success');
        setUserToDelete(null);
        fetchAdminData();
      } else {
        showToast(data.message || 'Failed to remove user account', 'error');
      }
    } catch (err) {
      showToast('Network error while removing user account', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
  };

  const fetchAdminData = async () => {
    try {
      // 1. Fetch students performance reports
      const studRes = await fetch('/api/reports/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studRes.ok) setStudents(await studRes.json());

      // 2. Fetch activities
      const actRes = await fetch('/api/activities', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (actRes.ok) setActivities(await actRes.json());

      // 3. Fetch all queries
      const qRes = await fetch('/api/queries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (qRes.ok) setQueries(await qRes.json());

      // 4. Fetch faculty list
      const fRes = await fetch('/api/auth/faculties', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (fRes.ok) setFaculties(await fRes.json());

      // 5. Fetch all document submissions
      const subRes = await fetch('/api/submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) setSubmissions(await subRes.json());

    } catch (error) {
      console.error('Error fetching admin workspace data:', error);
      showToast('Connection failed. Some data could not be fetched.', 'error');
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
        fetchAdminData();
      } else {
        showToast(d.message || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error reviewing submission', 'error');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Create Activity Submit
  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!actTitle || !actDesc || !actRp) {
      showToast('Please fill in all activity details', 'error');
      return;
    }

    setCreatingAct(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: actTitle, description: actDesc, rpValue: actRp, category: actCategory })
      });

      if (res.ok) {
        showToast('Activity posted successfully!', 'success');
        setActTitle('');
        setActDesc('');
        setActRp('');
        setActCategory('general');
        // Refresh activities list
        const actRes = await fetch('/api/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (actRes.ok) setActivities(await actRes.json());
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to create activity', 'error');
      }
    } catch (err) {
      showToast('Network error creating activity', 'error');
    } finally {
      setCreatingAct(false);
    }
  };

  // Submit RP allocation / deduction
  const handleRpTransaction = async (e) => {
    e.preventDefault();
    if (!rpStudentId || !rpPoints) {
      showToast('Please select a student and specify points', 'error');
      return;
    }

    setSubmittingTransaction(true);
    try {
      const url = rpType === 'allocate' ? '/api/rp/allocate' : '/api/rp/deduct';
      const body = {
        studentId: rpStudentId,
        points: rpPoints,
        description: rpDesc
      };

      if (rpType === 'allocate' && rpActivityId) {
        body.activityId = rpActivityId;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Transaction applied successfully!', 'success');
        setRpPoints('');
        setRpDesc('');
        setRpActivityId('');
        
        // Refresh report lists
        fetchAdminData();
      } else {
        showToast(data.message || 'Transaction failed', 'error');
      }
    } catch (err) {
      showToast('Network error while applying transaction', 'error');
    } finally {
      setSubmittingTransaction(false);
    }
  };

  // Save marks modification
  const handleSaveMarks = async (studentId) => {
    if (newBaseMarks === '' || isNaN(newBaseMarks)) {
      showToast('Please specify a valid numeric mark', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/reports/student/${studentId}/marks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ internalMarks: newBaseMarks })
      });

      if (res.ok) {
        showToast('Baseline marks updated successfully', 'success');
        setEditingMarksId(null);
        // Refresh reports
        fetchAdminData();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to update marks', 'error');
      }
    } catch (err) {
      showToast('Network error updating marks', 'error');
    }
  };

  // Submit Query Response
  const handleRespondToQuery = async (queryId) => {
    if (!queryResponseText.trim()) {
      showToast('Please write a response message', 'error');
      return;
    }

    setRespondingToQuery(true);
    try {
      const res = await fetch(`/api/queries/${queryId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response: queryResponseText })
      });

      if (res.ok) {
        showToast('Resolution sent to student successfully', 'success');
        setQueryResponseText('');
        setActiveQueryId(null);
        // Refresh query logs
        const qRes = await fetch('/api/queries', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (qRes.ok) setQueries(await qRes.json());
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to send query reply', 'error');
      }
    } catch (err) {
      showToast('Network error replying to query', 'error');
    } finally {
      setRespondingToQuery(false);
    }
  };

  // View Student details history in details modal (Clicks student shows full report)
  const handleViewStudentDetails = async (studentId) => {
    try {
      const res = await fetch(`/api/reports/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data);
        setSelectedStudentHistory(data.history);
      } else {
        showToast('Failed to load detailed profile log', 'error');
      }
    } catch (err) {
      showToast('Error opening student profile details', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          Loading administrative console data...
        </p>
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
      
      {/* LEFT SIDEBAR - Admin Workspace Options */}
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
            Faculty Admin Control
          </span>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                background: (activeTab === 'activities' || activeTab === 'posting') ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: (activeTab === 'activities' || activeTab === 'posting') ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <BookOpen size={20} />
              <span>Activity Posting</span>
            </button>

            <button 
              onClick={() => setActiveTab('rp')}
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
                background: activeTab === 'rp' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'rp' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <Award size={20} />
              <span>RP Point Allocation</span>
            </button>

            <button 
              onClick={() => setActiveTab('excel-upload')}
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
                background: activeTab === 'excel-upload' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'excel-upload' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <FileSpreadsheet size={20} />
              <span>Excel Bulk RP Import</span>
            </button>

            <button 
              onClick={() => setActiveTab('reports')}
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
                background: activeTab === 'reports' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'reports' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <Users size={20} />
              <span>Students Report</span>
            </button>

            <button 
              onClick={() => setActiveTab('submissions')}
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
                background: activeTab === 'submissions' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'submissions' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <FileCheck size={20} />
              <span>Document Submissions</span>
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
              <MessageSquare size={20} />
              <span>Query View</span>
            </button>

            <button 
              onClick={() => setActiveTab('users')}
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
                background: activeTab === 'users' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                color: activeTab === 'users' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.25s ease'
              }}
            >
              <UserPlus size={20} />
              <span>User Management</span>
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
            background: 'linear-gradient(135deg, var(--color-secondary), #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            fontFamily: 'Outfit, sans-serif'
          }}>
            A
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Faculty Admin</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.email}</div>
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
          {/* Dashboard Context Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>Administrative Control Panel</span>
          </div>

          {/* User icons status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role:</span>
              <span className="badge-ui" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-secondary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                Faculty Desk
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)' }}></div>

            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Bell size={18} />
            </button>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* CONTAINER FOR ACTIVE ADMIN COMPONENT */}
        <div style={{
          flex: 1,
          padding: '30px',
          overflowY: 'auto'
        }}>
          
          {/* ==================== PAGE 1: ACTIVITY POSTING MODULE ==================== */}
          {(activeTab === 'activities' || activeTab === 'posting') && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Activity Setup & Announcement</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create student activities, hackathons, and certification tasks with standard RP reward values.</p>
              </div>

              {/* Create New Activity Form */}
              <div className="glass-panel" style={{ maxWidth: '680px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Plus size={20} style={{ color: 'var(--color-primary)' }} />
                  <h3>Create New Student Activity</h3>
                </div>

                <form onSubmit={handleCreateActivity}>
                  <div className="form-group">
                    <label className="form-label">Activity Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Android App Development Workshop" 
                      value={actTitle}
                      onChange={(e) => setActTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Instructions</label>
                    <textarea 
                      className="form-input" 
                      rows="3"
                      placeholder="Prerequisites, schedule details, and completion metrics..." 
                      value={actDesc}
                      onChange={(e) => setActDesc(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reward Points Value (RP)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 100" 
                      value={actRp}
                      onChange={(e) => setActRp(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">Category / Responsibility Domain</label>
                    <select 
                      className="form-input"
                      value={actCategory}
                      onChange={(e) => setActCategory(e.target.value)}
                      style={{ background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                    >
                      <option value="general">📢 General Campus Activity</option>
                      <option value="ps">🔬 PS Assessment Lead</option>
                      <option value="hackathon">🏆 Hackathon Lead</option>
                      <option value="certifications">📜 Certifications Lead</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    disabled={creatingAct}
                  >
                    <span>{creatingAct ? 'Posting...' : 'Post New Activity'}</span>
                  </button>
                </form>
              </div>

              {/* List of Posted Activities */}
              <div className="glass-panel">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Currently Active Posted Activities</h3>
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activities posted yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {activities.map(a => {
                      const catMeta = {
                        ps: { name: 'PS Lead', color: '#0284c7', icon: '🔬' },
                        hackathon: { name: 'Hackathon Lead', color: '#d97706', icon: '🏆' },
                        certifications: { name: 'Cert Lead', color: '#059669', icon: '📜' },
                        general: { name: 'General Campus', color: '#4f46e5', icon: '📢' }
                      }[a.category || 'general'] || { name: 'General Campus', color: '#4f46e5', icon: '📢' };

                      return (
                        <div 
                          key={a.id} 
                          style={{
                            background: 'rgba(0, 0, 0, 0.015)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: catMeta.color, background: `${catMeta.color}15`, padding: '2px 8px', borderRadius: '6px' }}>
                                {catMeta.icon} {catMeta.name}
                              </span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                +{a.rpValue} RP
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '4px' }}>{a.title}</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{a.description}</p>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop: '12px', paddingTop: '8px' }}>
                            Posted: {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE 2: RP POINT ALLOCATION MODULE ==================== */}
          {activeTab === 'rp' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Reward Points Allocation & Management</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Directly assign earned RP points or deduct redeemed points for students based on activity completion.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', alignItems: 'start' }}>
                
                {/* RP Allocation Form */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Award size={20} style={{ color: 'var(--color-secondary)' }} />
                    <h3>Allocate / Deduct Points by Student Name</h3>
                  </div>

                  <form onSubmit={handleRpTransaction}>
                    <div style={{
                      display: 'flex', 
                      gap: '16px', 
                      padding: '4px', 
                      background: 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-glass)',
                      marginBottom: '20px'
                    }}>
                      <button 
                        type="button"
                        onClick={() => { setRpType('allocate'); setRpDesc(''); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: rpType === 'allocate' ? 'var(--color-primary)' : 'transparent',
                          color: rpType === 'allocate' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        Allocate Points (+)
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setRpType('deduct'); setRpActivityId(''); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: rpType === 'deduct' ? 'var(--color-danger)' : 'transparent',
                          color: rpType === 'deduct' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        Redeem / Deduct (-)
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Student Name</label>
                      <select 
                        className="form-select"
                        value={rpStudentId}
                        onChange={(e) => setRpStudentId(e.target.value)}
                      >
                        <option value="" style={{ background: '#ffffff', color: '#0f172a' }}>-- Select Student Profile --</option>
                        {students.map(s => (
                          <option key={s.studentId} value={s.studentId} style={{ background: '#ffffff', color: '#0f172a' }}>{s.name} ({s.email})</option>
                        ))}
                      </select>
                    </div>

                    {rpType === 'allocate' && (
                      <div className="form-group">
                        <label className="form-label">Linked Activity (Completion Source)</label>
                        <select 
                          className="form-select"
                          value={rpActivityId}
                          onChange={(e) => setRpActivityId(e.target.value)}
                        >
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
                        <input 
                          type="number" 
                          className="form-input" 
                          placeholder="e.g. 50" 
                          value={rpPoints}
                          onChange={(e) => setRpPoints(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Completion Memo / Description</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder={rpType === 'allocate' ? 'e.g. Completed hackathon project' : 'Reason for deduction'}
                          value={rpDesc}
                          onChange={(e) => setRpDesc(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className={`btn ${rpType === 'allocate' ? 'btn-primary' : 'btn-danger'}`}
                      style={{ width: '100%', marginTop: '8px' }}
                      disabled={submittingTransaction}
                    >
                      <span>{submittingTransaction ? 'Applying...' : rpType === 'allocate' ? 'Allocate Points' : 'Deduct Points'}</span>
                    </button>
                  </form>
                </div>

                {/* Quick Student Balance Roster List */}
                <div className="glass-panel">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Student RP Standings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                    {students.map(s => (
                      <div key={'rp-bal-' + s.studentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-bright)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.email}</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                          {s.currentBalance} RP
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Excel / CSV Bulk Allocation Card */}
              <div className="glass-panel" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={22} style={{ color: '#0284c7' }} />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Bulk Excel / CSV RP Allocation Upload</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Upload an Excel (`.xlsx`, `.xls`) or `.csv` document containing Student Email, Purpose of adding RP, and RP to Add.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={handleDownloadSampleTemplate}
                    style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={15} />
                    <span>Download Sample Template (.csv)</span>
                  </button>
                </div>

                {/* Upload Input Area */}
                <div style={{
                  border: '2px dashed #0284c7',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(2, 132, 199, 0.03)',
                  marginBottom: '20px'
                }}>
                  <UploadCloud size={38} style={{ color: '#0284c7', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px' }}>
                    {excelFile ? `Selected File: ${excelFile.name}` : 'Upload Excel / CSV Document for Batch RP Addition'}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                    Required Columns: <strong>Email, Purpose of adding RP, RP to Add</strong>
                  </p>
                  
                  <label 
                    className="btn btn-primary" 
                    style={{ padding: '8px 20px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>{excelFile ? 'Change Excel File' : 'Browse Excel File...'}</span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleExcelFileUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                {/* Excel Parsed Records Preview Table */}
                {excelParsedData.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        Parsed Spreadsheet Records ({excelParsedData.length} Student Rows Ready)
                      </h4>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmitBulkExcelAllocations}
                        disabled={uploadingExcel}
                        style={{ padding: '8px 18px', fontSize: '0.85rem', background: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={16} />
                        <span>{uploadingExcel ? 'Allocating RP...' : `Confirm & Add RP directly (${excelParsedData.length} Students)`}</span>
                      </button>
                    </div>

                    <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>#</th>
                            <th>Student Email (Mail ID)</th>
                            <th>Purpose of Adding RP</th>
                            <th style={{ textAlign: 'right' }}>RP to Add</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelParsedData.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 700, color: '#0284c7' }}>{row.email || '-'}</td>
                              <td style={{ color: '#334155', fontWeight: 500 }}>{row.purpose || 'Excel Batch RP Allocation'}</td>
                              <td style={{ fontWeight: 800, color: '#059669', textAlign: 'right' }}>+{row.points} RP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE EXCEL-UPLOAD: DEDICATED EXCEL BULK ALLOCATION TAB ==================== */}
          {activeTab === 'excel-upload' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Excel / CSV Bulk RP Import Module</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload an Excel document with student Email, Purpose of adding RP, and RP to Add directly in batch.</p>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={22} style={{ color: '#0284c7' }} />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Spreadsheet Batch RP Allocation</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Required Excel Columns: <strong>Email, Purpose of adding RP, RP to Add</strong>
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={handleDownloadSampleTemplate}
                    style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={15} />
                    <span>Download Sample Template (.csv)</span>
                  </button>
                </div>

                {/* Upload Input Area */}
                <div style={{
                  border: '2px dashed #0284c7',
                  borderRadius: '12px',
                  padding: '30px',
                  textAlign: 'center',
                  background: 'rgba(2, 132, 199, 0.03)',
                  marginBottom: '20px'
                }}>
                  <UploadCloud size={44} style={{ color: '#0284c7', marginBottom: '10px' }} />
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginBottom: '6px' }}>
                    {excelFile ? `Selected File: ${excelFile.name}` : 'Drop Excel / CSV File Here or Click to Browse'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                    Required Columns: <strong>Email, Purpose of adding RP, RP to Add</strong>
                  </p>
                  
                  <label 
                    className="btn btn-primary" 
                    style={{ padding: '10px 24px', fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileSpreadsheet size={18} />
                    <span>{excelFile ? 'Change Excel File' : 'Select Excel Document...'}</span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleExcelFileUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

                {/* Excel Parsed Records Preview Table */}
                {excelParsedData.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        Parsed Spreadsheet Records ({excelParsedData.length} Student Rows Ready)
                      </h4>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmitBulkExcelAllocations}
                        disabled={uploadingExcel}
                        style={{ padding: '10px 22px', fontSize: '0.9rem', background: '#059669', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <CheckCircle size={18} />
                        <span>{uploadingExcel ? 'Allocating RP...' : `Confirm & Allocate RP Directly (${excelParsedData.length} Students)`}</span>
                      </button>
                    </div>

                    <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>#</th>
                            <th>Student Email (Mail ID)</th>
                            <th>Purpose of Adding RP</th>
                            <th style={{ textAlign: 'right' }}>RP to Add</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelParsedData.map((row, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 700, color: '#0284c7' }}>{row.email || '-'}</td>
                              <td style={{ color: '#334155', fontWeight: 500 }}>{row.purpose || 'Excel Batch RP Allocation'}</td>
                              <td style={{ fontWeight: 800, color: '#059669', textAlign: 'right', fontSize: '0.95rem' }}>+{row.points} RP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== PAGE 2: STUDENTS REPORT ==================== */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Roster & Reports</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Overview of all registered students, overall points standing, and baseline exam marks. Click any student profile to open their full report.</p>
              </div>

              {/* Roster list (3.1. Clicks any student shows their full report) */}
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
                                    onClick={() => handleViewStudentDetails(s.studentId)}
                                  >
                                    View Report
                                  </button>
                                  <button 
                                    className="btn"
                                    style={{ 
                                      padding: '6px 10px', 
                                      fontSize: '0.8rem', 
                                      background: 'rgba(239, 68, 68, 0.08)', 
                                      color: '#ef4444', 
                                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                                      borderRadius: '6px', 
                                      cursor: 'pointer', 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      fontWeight: 700 
                                    }}
                                    onClick={() => setUserToDelete({ id: s.studentId || s.id, name: s.name, email: s.email, role: 'student' })}
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
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

          {/* ==================== TAB 4: DOCUMENT SUBMISSIONS ==================== */}
          {activeTab === 'submissions' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Document & Proof Submissions</h2>
                <p style={{ color: 'var(--text-muted)' }}>Review document links, hackathon repos, and certificate URLs submitted by students. Approving automatically awards reward points.</p>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <FileCheck size={22} style={{ color: 'var(--color-primary)' }} />
                  <h3>All Incoming Document Verification Requests</h3>
                </div>

                {submissions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student document submissions found.</p>
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
                                Submitted for: <strong style={{ color: 'var(--text-bright)' }}>{s.activityTitle}</strong> (+{s.rpValue} RP) • Category: <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#0284c7' }}>{s.activityCategory}</span>
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
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Submission Link / Proof Details:</span>
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
                                onClick={() => handleReviewSubmission(s.id, 'approved', 'Approved by Admin')}
                                style={{ padding: '8px 16px', fontSize: '0.82rem', background: '#059669', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Check size={16} />
                                <span>Approve & Award +{s.rpValue} RP</span>
                              </button>
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleReviewSubmission(s.id, 'rejected', 'Invalid document / link')}
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

          {/* ==================== TAB 5: QUERY REVIEW AUDIT LOG ==================== */}
          {activeTab === 'queries' && (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Student Query Audit Log & Resolution Stream</h2>
                <p style={{ color: 'var(--text-muted)' }}>Complete audit log tracking who raised each support query at what time, and who responded at what time.</p>
              </div>

              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={22} style={{ color: 'var(--color-primary)' }} />
                    <h3 style={{ margin: 0 }}>Query Activity Audit History ({queries.length} Logged Entries)</h3>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem' }}>
                    <span className="badge-ui" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '4px 10px' }}>
                      Pending: {queries.filter(q => q.status === 'pending').length}
                    </span>
                    <span className="badge-ui" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px' }}>
                      Resolved: {queries.filter(q => q.status === 'resolved').length}
                    </span>
                  </div>
                </div>

                {queries.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student support query log entries registered yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {queries.map(q => {
                      const catMeta = {
                        ps: { name: 'PS Assessment Lead', color: '#0284c7', icon: '🔬' },
                        hackathon: { name: 'Hackathon Lead', color: '#d97706', icon: '🏆' },
                        certifications: { name: 'Certifications Lead', color: '#059669', icon: '📜' },
                        general: { name: 'General Campus', color: '#4f46e5', icon: '📢' }
                      }[q.category || 'ps'] || { name: 'PS Assessment Lead', color: '#0284c7', icon: '🔬' };

                      const raisedTime = q.createdAt ? new Date(q.createdAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                      const respondedTime = q.updatedAt && q.status === 'resolved' ? new Date(q.updatedAt).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null;

                      return (
                        <div 
                          key={q.id} 
                          style={{
                            border: '1px solid var(--border-glass)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Query Header Metadata */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                            padding: '14px 18px',
                            background: q.status === 'pending' ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.04)',
                            borderBottom: '1px solid var(--border-glass)'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: '1.02rem' }}>{q.subject}</span>
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
                              </div>
                            </div>

                            <span className="badge-ui" style={{
                              background: q.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                              color: q.status === 'pending' ? '#f59e0b' : '#10b981',
                              border: `1px solid ${q.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                              fontWeight: 800
                            }}>
                              {q.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Audit Timeline Rows */}
                          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                            {/* 1. Raised By Student + Timestamp */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} />
                                <span>RAISED BY STUDENT & TIMESTAMP</span>
                              </div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                {q.studentName || 'Student'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                Mail ID: <strong>{q.studentEmail || '-'}</strong> {q.studentRollNo && `• Roll: ${q.studentRollNo}`}
                              </div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                                🕒 Raised at: {raisedTime}
                              </div>
                            </div>

                            {/* 2. Responded By Staff + Timestamp */}
                            <div style={{ background: q.status === 'resolved' ? '#f0fdf4' : '#fffbe6', border: `1px solid ${q.status === 'resolved' ? '#bbf7d0' : '#fef08a'}`, padding: '12px 14px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: q.status === 'resolved' ? '#059669' : '#d97706', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={14} />
                                <span>RESPONDED BY STAFF & TIMESTAMP</span>
                              </div>
                              {q.status === 'resolved' ? (
                                <>
                                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                    {q.responderName || 'Faculty/Admin Staff'}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                                    🕒 Responded at: {respondedTime}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 600, fontStyle: 'italic', marginTop: '4px' }}>
                                  ⏳ Awaiting Faculty or Admin Response...
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Query Content & Resolution Details */}
                          <div style={{ padding: '16px 18px', background: '#ffffff' }}>
                            <div style={{ marginBottom: '12px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Student Query Message:</span>
                              <p style={{ fontSize: '0.88rem', color: '#1e293b', margin: 0, lineHeight: 1.5, fontWeight: 500, background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                {q.message}
                              </p>
                            </div>

                            {q.response && (
                              <div style={{ marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '4px' }}>Official Resolution Reply:</span>
                                <div style={{
                                  padding: '10px 12px', borderRadius: '6px',
                                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                  fontSize: '0.88rem', color: '#064e3b', fontWeight: 600
                                }}>
                                  {q.response}
                                </div>
                              </div>
                            )}

                            {activeQueryId === q.id ? (
                              <div style={{ marginTop: '12px' }}>
                                <textarea 
                                  className="form-input" 
                                  rows="3" 
                                  placeholder="Type official admin resolution message for the student..."
                                  value={queryResponseText} 
                                  onChange={e => setQueryResponseText(e.target.value)}
                                  style={{ resize: 'vertical', marginBottom: '10px' }} 
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    onClick={() => handleRespondToQuery(q.id)} 
                                    disabled={respondingToQuery}
                                  >
                                    <Send size={14} />
                                    <span>{respondingToQuery ? 'Saving Log...' : 'Submit Resolution'}</span>
                                  </button>
                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                    onClick={() => { setActiveQueryId(null); setQueryResponseText(''); }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '6px 14px', fontSize: '0.8rem', marginTop: '4px' }}
                                onClick={() => { setActiveQueryId(q.id); setQueryResponseText(''); }}
                              >
                                {q.response ? 'Update Resolution Log' : 'Respond to Query'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }} className="animate-fade-in">
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Faculty & User Management</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Create new Faculty accounts with specific domain responsibilities, or add new Student accounts.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
              {/* Create User Form */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <UserPlus size={20} style={{ color: 'var(--color-secondary)' }} />
                  <h3>Create New User Account</h3>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole) {
                    showToast('Please fill in all required fields', 'error'); return;
                  }
                  setCreatingUser(true);
                  try {
                    const body = { name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole };
                    if (newUserRole === 'faculty') body.facultyResponsibility = newUserResponsibility;
                    if (newUserRole === 'student') body.year = newUserYear;
                    const res = await fetch('/api/auth/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(body)
                    });
                    const d = await res.json();
                    if (res.ok) {
                      showToast(d.message || 'User created successfully!', 'success');
                      setNewUserName(''); setNewUserEmail(''); setNewUserPassword('');
                      setNewUserRole('faculty'); setNewUserResponsibility('ps');
                      fetchAdminData();
                    } else showToast(d.message || 'Failed to create user', 'error');
                  } catch { showToast('Network error', 'error'); }
                  finally { setCreatingUser(false); }
                }}>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Dr. Anand Kumar"
                      value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" placeholder="e.g. faculty@college.edu"
                      value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password (min. 6 characters)</label>
                    <input type="password" className="form-input" placeholder="Set a secure password"
                      value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {[['faculty', 'Faculty'], ['student', 'Student']].map(([val, label]) => (
                        <button key={val} type="button"
                          onClick={() => setNewUserRole(val)}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: newUserRole === val
                              ? (val === 'faculty' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, var(--color-primary), #0088ff)')
                              : 'rgba(0,0,0,0.04)',
                            color: newUserRole === val ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                            border: `1px solid ${newUserRole === val ? 'transparent' : 'var(--border-glass)'}`
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newUserRole === 'faculty' && (
                    <div className="form-group">
                      <label className="form-label">Faculty Responsibility Domain</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { val: 'ps', label: 'PS Assessment Completion', icon: <Cpu size={16} />, color: '#00d2ff' },
                          { val: 'hackathon', label: 'Hackathons, Contests & Competitions', icon: <Trophy size={16} />, color: '#f59e0b' },
                          { val: 'certifications', label: 'Internships, Certifications & NPTEL', icon: <BadgeCheck size={16} />, color: '#10b981' }
                        ].map(({ val, label, icon, color }) => (
                          <button key={val} type="button"
                            onClick={() => setNewUserResponsibility(val)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                              background: newUserResponsibility === val ? `${color}18` : 'rgba(0,0,0,0.03)',
                              border: `1px solid ${newUserResponsibility === val ? color + '40' : 'var(--border-glass)'}`,
                              color: newUserResponsibility === val ? color : 'var(--text-muted)',
                              fontWeight: newUserResponsibility === val ? 700 : 400,
                              fontSize: '0.85rem', textAlign: 'left'
                            }}>
                            <span style={{ color }}>{icon}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {newUserRole === 'student' && (
                    <div className="form-group">
                      <label className="form-label">Year of Study</label>
                      <select className="form-select" value={newUserYear} onChange={e => setNewUserYear(e.target.value)}>
                        {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => (
                          <option key={y} value={y} style={{ background: '#ffffff', color: '#0f172a' }}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary"
                    style={{
                      width: '100%', marginTop: '8px',
                      background: newUserRole === 'faculty' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : undefined
                    }}
                    disabled={creatingUser}>
                    <UserPlus size={16} />
                    <span>{creatingUser ? 'Creating...' : `Create ${newUserRole === 'faculty' ? 'Faculty' : 'Student'} Account`}</span>
                  </button>
                </form>
              </div>

              {/* Managed User Accounts List */}
              <div className="glass-panel">
                {/* Header & Sub-Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} style={{ color: userMgmtTab === 'faculty' ? '#8b5cf6' : '#0284c7' }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registered User Accounts</h3>
                  </div>

                  {/* Sub-tabs for Faculty vs Student */}
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-glass)' }}>
                    <button
                      type="button"
                      onClick={() => setUserMgmtTab('faculty')}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        background: userMgmtTab === 'faculty' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent',
                        color: userMgmtTab === 'faculty' ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Faculty ({faculties.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserMgmtTab('student')}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        background: userMgmtTab === 'student' ? 'linear-gradient(135deg, var(--color-primary), #0088ff)' : 'transparent',
                        color: userMgmtTab === 'student' ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Students ({students.length})
                    </button>
                  </div>
                </div>

                {/* Filter / Search Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Filter ${userMgmtTab === 'faculty' ? 'faculty members' : 'students'} by name or email...`}
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  />
                </div>

                {/* Faculty List View */}
                {userMgmtTab === 'faculty' && (
                  <>
                    {faculties.filter(f => !userSearchQuery || f.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || f.email.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No matching faculty accounts found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                        {faculties.filter(f => !userSearchQuery || f.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || f.email.toLowerCase().includes(userSearchQuery.toLowerCase())).map(f => {
                          const respColors = { ps: '#00d2ff', hackathon: '#f59e0b', certifications: '#10b981' };
                          const respLabels = { ps: 'PS Assessment', hackathon: 'Hackathons & Contests', certifications: 'Certifications & NPTEL' };
                          const respIcons = { ps: <Cpu size={14} />, hackathon: <Trophy size={14} />, certifications: <BadgeCheck size={14} /> };
                          const c = respColors[f.facultyResponsibility] || '#aaa';
                          return (
                            <div key={f.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 14px', borderRadius: '10px',
                              background: `${c}08`, border: `1px solid ${c}25`,
                              gap: '12px', flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                  background: `${c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, fontWeight: 700
                                }}>
                                  {f.name[0]}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.9rem' }}>{f.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 10px', borderRadius: '6px', background: `${c}18`, color: c,
                                  border: `1px solid ${c}33`, fontSize: '0.75rem', fontWeight: 700
                                }}>
                                  <span style={{ color: c }}>{respIcons[f.facultyResponsibility]}</span>
                                  {respLabels[f.facultyResponsibility] || f.facultyResponsibility}
                                </div>

                                <button
                                  type="button"
                                  title="Remove Faculty Account"
                                  onClick={() => setUserToDelete({ id: f.id, name: f.name, email: f.email, role: 'faculty' })}
                                  style={{
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Student List View */}
                {userMgmtTab === 'student' && (
                  <>
                    {students.filter(s => !userSearchQuery || s.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || s.email.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>No matching student accounts found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                        {students.filter(s => !userSearchQuery || s.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || s.email.toLowerCase().includes(userSearchQuery.toLowerCase())).map(s => {
                          const studentDisplayName = s.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim();
                          return (
                            <div key={s.studentId || s.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 14px', borderRadius: '10px',
                              background: 'rgba(2, 132, 199, 0.04)', border: '1px solid rgba(2, 132, 199, 0.15)',
                              gap: '12px', flexWrap: 'wrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                  background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 700
                                }}>
                                  {studentDisplayName[0] || 'S'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.9rem' }}>{studentDisplayName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  padding: '4px 10px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.1)',
                                  color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.2)', fontSize: '0.75rem', fontWeight: 800
                                }}>
                                  {s.currentBalance} RP
                                </div>

                                <button
                                  type="button"
                                  title="Remove Student Account"
                                  onClick={() => setUserToDelete({ id: s.studentId || s.id, name: studentDisplayName, email: s.email, role: 'student' })}
                                  style={{
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        </div>
      </div>



      {/* CONFIRMATION OVERLAY MODAL FOR USER DELETION */}
      {userToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '480px', background: '#ffffff',
            border: '1.5px solid #fca5a5', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.2)',
            padding: '28px', borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserX size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Remove User Account</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>Confirm deletion of {userToDelete.role === 'faculty' ? 'Faculty' : 'Student'} record</p>
              </div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#991b1b', margin: 0, fontWeight: 600 }}>
                Are you sure you want to remove <span style={{ textDecoration: 'underline', fontWeight: 800 }}>{userToDelete.name}</span> ({userToDelete.email})?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '6px', marginBottom: 0 }}>
                This will permanently delete their account profile, login access, and associated data from the system.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleConfirmDeleteUser}
                disabled={deletingUser}
                style={{ padding: '9px 20px', borderRadius: '8px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
                <span>{deletingUser ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}



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
            {selectedStudentHistory.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem', padding: '10px 0', textAlign: 'center' }}>No points transactions found for this student.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedStudentHistory.map(h => (
                  <div 
                    key={h.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
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
