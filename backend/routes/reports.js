const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly, adminOrFaculty } = require('../middleware/auth');

// Calculation constants
const MAX_BONUS_MARKS = 11;

// Fast single-pass compilation of all student standings
async function compileAllStudentReports() {
  const allUsers = await db.getUsers();
  const students = allUsers.filter(u => u.role === 'student');
  const rpHistory = await db.getRpHistory();
  const studentMarks = await db.getStudentMarks();

  const historyByStudent = {};
  rpHistory.forEach(h => {
    if (!historyByStudent[h.studentId]) historyByStudent[h.studentId] = [];
    historyByStudent[h.studentId].push(h);
  });

  const marksMap = {};
  studentMarks.forEach(m => {
    marksMap[m.studentId] = m.internalMarks;
  });

  const list = students.map(s => {
    const history = historyByStudent[s.id] || [];
    const totalEarned = history.filter(h => Number(h.points) > 0).reduce((sum, h) => sum + Number(h.points), 0);
    const totalUsed = history.filter(h => Number(h.points) < 0).reduce((sum, h) => sum + Math.abs(Number(h.points)), 0);
    const currentBalance = totalEarned - totalUsed;
    const baseMarks = marksMap[s.id] !== undefined ? marksMap[s.id] : 75;
    return {
      studentId: s.id,
      name: s.name,
      email: s.email,
      rollNo: s.rollNo || s.email.split('@')[0].toUpperCase(),
      year: s.year || '1st Year',
      totalEarned,
      totalUsed,
      currentBalance,
      baseMarks
    };
  });

  list.sort((a, b) => {
    if (b.currentBalance !== a.currentBalance) return b.currentBalance - a.currentBalance;
    if (b.totalEarned !== a.totalEarned) return b.totalEarned - a.totalEarned;
    return a.name.localeCompare(b.name);
  });

  const totalClassBalance = list.reduce((sum, b) => sum + b.currentBalance, 0);
  const averageRp = list.length > 0 ? Number((totalClassBalance / list.length).toFixed(1)) : 0;
  const maxClassRp = Math.max(...list.map(b => b.currentBalance), 1);

  return list.map((b, idx) => {
    const rank = idx + 1;
    let badge = 'Participant';
    if (rank === 1) badge = 'Gold';
    else if (rank === 2) badge = 'Silver';
    else if (rank === 3) badge = 'Bronze';

    let rpStatus = 'Low';
    if (b.currentBalance >= averageRp) rpStatus = 'Good';
    else if (b.currentBalance >= 0.8 * averageRp) rpStatus = 'Medium';

    let rpBonus = 0;
    if (maxClassRp > 0 && b.currentBalance > 0) {
      rpBonus = Number(((b.currentBalance / maxClassRp) * MAX_BONUS_MARKS).toFixed(1));
    }

    const finalMarks = Math.min(100, Number((b.baseMarks + rpBonus).toFixed(2)));

    return {
      studentId: b.studentId,
      name: b.name,
      email: b.email,
      rollNo: b.rollNo,
      year: b.year,
      totalEarned: b.totalEarned,
      currentBalance: b.currentBalance,
      rank,
      totalStudents: list.length,
      averageRp,
      rpStatus,
      baseMarks: b.baseMarks,
      rpBonus: Number(rpBonus.toFixed(2)),
      finalMarks,
      badge
    };
  });
}

// Helper to calculate single student report details
async function getStudentReportData(studentId) {
  const reports = await compileAllStudentReports();
  const report = reports.find(r => r.studentId === studentId);
  if (!report) return null;

  const history = await db.getRpHistoryForStudent(studentId);
  const allActivities = await db.getActivities();

  const completedActivityIds = history
    .filter(h => h.activityId !== null && h.points > 0)
    .map(h => h.activityId);

  const recommendedActivities = allActivities
    .filter(act => !completedActivityIds.includes(act.id))
    .sort((a, b) => b.rpValue - a.rpValue)
    .slice(0, 3);

  const suggestions = [...recommendedActivities];
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'suggest-generic-1',
      title: 'Mentor junior students',
      description: 'Help juniors with laboratory programming tasks or exam preparation.',
      rpValue: 40
    });
    suggestions.push({
      id: 'suggest-generic-2',
      title: 'Write technical articles',
      description: 'Contribute a post or research insight to the college tech newsletter.',
      rpValue: 30
    });
  }

  const activityMap = {};
  allActivities.forEach(a => { activityMap[a.id] = a; });

  const enrichedHistory = history.map(h => {
    const act = h.activityId ? activityMap[h.activityId] : null;
    return {
      ...h,
      activityTitle: act ? act.title : null,
      activityCategory: act ? act.category : null
    };
  });

  return {
    ...report,
    recommendations: suggestions,
    history: [...enrichedHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  };
}

// Get student performance overview (Admin or Faculty view for all students)
router.get('/students', auth, adminOrFaculty, async (req, res) => {
  try {
    const reports = await compileAllStudentReports();
    res.json(reports);
  } catch (error) {
    console.error('Fetch student reports error:', error);
    res.status(500).json({ message: 'Internal server error fetching student reports' });
  }
});

// Get overall leaderboard ranking
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const reports = await compileAllStudentReports();
    res.json(reports);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ message: 'Internal server error fetching leaderboard' });
  }
});

// Get individual student report details
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Access denied: You can only view your own report' });
    }

    const report = await getStudentReportData(studentId);
    if (!report) {
      return res.status(404).json({ message: 'Student report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Fetch student report details error:', error);
    res.status(500).json({ message: 'Internal server error fetching report details' });
  }
});

// Update student baseline marks (Admin or Faculty)
router.put('/student/:studentId/marks', auth, adminOrFaculty, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { internalMarks } = req.body;

    if (internalMarks === undefined) {
      return res.status(400).json({ message: 'internalMarks is required' });
    }

    const marks = Number(internalMarks);
    if (isNaN(marks) || marks < 0 || marks > 89) {
      return res.status(400).json({ message: 'Baseline internal marks must be a number between 0 and 89' });
    }

    const student = await db.findUserById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    await db.updateMarksForStudent(studentId, marks);
    
    const updatedReport = await getStudentReportData(studentId);
    res.json({
      message: 'Baseline marks updated successfully',
      studentId,
      newBaseMarks: marks,
      updatedReport
    });
  } catch (error) {
    console.error('Update student marks error:', error);
    res.status(500).json({ message: 'Internal server error updating student marks' });
  }
});

module.exports = router;
