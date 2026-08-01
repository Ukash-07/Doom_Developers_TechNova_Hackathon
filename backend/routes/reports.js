const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly, adminOrFaculty } = require('../middleware/auth');

// Calculation constants
const MAX_BONUS_MARKS = 11;

// Helper to calculate student metrics
async function getStudentReportData(studentId) {
  const allUsers = await db.getUsers();
  const students = allUsers.filter(u => u.role === 'student');
  const student = await db.findUserById(studentId);
  
  if (!student) return null;

  // Calculate RP totals
  const history = await db.getRpHistoryForStudent(studentId);
  const totalEarned = history.filter(h => h.points > 0).reduce((sum, h) => sum + h.points, 0);
  const totalUsed = history.filter(h => h.points < 0).reduce((sum, h) => sum + Math.abs(h.points), 0);
  const currentBalance = totalEarned - totalUsed;

  // Compile all student balances to find ranking and class average
  const allBalances = await Promise.all(students.map(async s => {
    const sHistory = await db.getRpHistoryForStudent(s.id);
    const sEarned = sHistory.filter(h => Number(h.points) > 0).reduce((sum, h) => sum + Number(h.points), 0);
    const sUsed = sHistory.filter(h => Number(h.points) < 0).reduce((sum, h) => sum + Math.abs(Number(h.points)), 0);
    const sBalance = sEarned - sUsed;
    return { studentId: s.id, earned: sEarned, balance: sBalance, name: s.name };
  }));

  // Sort strictly by current balance descending (and total earned / name as tie-breaker)
  allBalances.sort((a, b) => {
    if (b.balance !== a.balance) return b.balance - a.balance;
    if (b.earned !== a.earned) return b.earned - a.earned;
    return a.name.localeCompare(b.name);
  });
  
  const rank = allBalances.findIndex(b => b.studentId === studentId) + 1;
  const totalClassBalance = allBalances.reduce((sum, b) => sum + b.balance, 0);
  const averageRp = allBalances.length > 0 ? Number((totalClassBalance / allBalances.length).toFixed(1)) : 0;

  // Badge determination
  let badge = 'Participant';
  if (rank === 1) badge = 'Gold';
  else if (rank === 2) badge = 'Silver';
  else if (rank === 3) badge = 'Bronze';

  // RP Status: Low (< 80% of average), Medium (80% to average), Good (>= average)
  let rpStatus = 'Low';
  if (currentBalance >= averageRp) {
    rpStatus = 'Good';
  } else if (currentBalance >= 0.8 * averageRp) {
    rpStatus = 'Medium';
  } else {
    rpStatus = 'Low';
  }

  // Marks calculations (RP bonus scaled proportionally out of 11 marks)
  const baseMarks = await db.getMarksForStudent(studentId);
  const maxClassRp = Math.max(...allBalances.map(b => b.balance), 1);
  
  let rpBonus = 0;
  if (maxClassRp > 0 && currentBalance > 0) {
    rpBonus = Number(((currentBalance / maxClassRp) * MAX_BONUS_MARKS).toFixed(1));
  }
  
  const finalMarks = Math.min(100, Number((baseMarks + rpBonus).toFixed(2)));

  // Next milestone calculation
  let nextMilestone = null;

  // Recommendations: Find activities not completed by the student
  const completedActivityIds = history
    .filter(h => h.activityId !== null && h.points > 0)
    .map(h => h.activityId);

  const allActivities = await db.getActivities();
  const recommendedActivities = allActivities
    .filter(act => !completedActivityIds.includes(act.id))
    .sort((a, b) => b.rpValue - a.rpValue) // suggest higher point ones first
    .slice(0, 3); // top 3 recommendations

  // Fallback if they completed everything or if there are no new activities
  const suggestions = [...recommendedActivities];
  if (suggestions.length === 0) {
    // Suggest generic ways
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

  // Enrich history entries with activity details (title / category)
  const allActivitiesForHistory = await db.getActivities();
  const activityMap = {};
  allActivitiesForHistory.forEach(a => {
    activityMap[a.id] = a;
  });

  const enrichedHistory = history.map(h => {
    const act = h.activityId ? activityMap[h.activityId] : null;
    return {
      ...h,
      activityTitle: act ? act.title : null,
      activityCategory: act ? act.category : null
    };
  });

  return {
    studentId: student.id,
    name: student.name,
    email: student.email,
    rollNo: student.rollNo || student.email.split('@')[0].toUpperCase(),
    year: student.year || '1st Year',
    rank,
    totalStudents: students.length,
    averageRp,
    totalEarned,
    totalUsed,
    currentBalance,
    badge,
    rpStatus,
    baseMarks,
    rpBonus: Number(rpBonus.toFixed(2)),
    finalMarks,
    nextMilestone,
    recommendations: suggestions,
    history: [...enrichedHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  };
}

// Get student performance overview (Admin or Faculty view for all students)
router.get('/students', auth, adminOrFaculty, async (req, res) => {
  try {
    const allUsers = await db.getUsers();
    const students = allUsers.filter(u => u.role === 'student');
    const reports = await Promise.all(students.map(async s => {
      const data = await getStudentReportData(s.id);
      return {
        studentId: data.studentId,
        name: data.name,
        email: data.email,
        rollNo: data.rollNo,
        totalEarned: data.totalEarned,
        currentBalance: data.currentBalance,
        rank: data.rank,
        rpStatus: data.rpStatus,
        baseMarks: data.baseMarks,
        rpBonus: data.rpBonus,
        finalMarks: data.finalMarks,
        badge: data.badge
      };
    }));

    // Sort strictly by RP balance descending (and total earned as tie-breaker)
    reports.sort((a, b) => {
      if (b.currentBalance !== a.currentBalance) return b.currentBalance - a.currentBalance;
      if (b.totalEarned !== a.totalEarned) return b.totalEarned - a.totalEarned;
      return a.name.localeCompare(b.name);
    });

    // Re-assign ranks dynamically so Rank #1 is ALWAYS highest RP
    reports.forEach((s, idx) => {
      s.rank = idx + 1;
      if (s.rank === 1) s.badge = 'Gold';
      else if (s.rank === 2) s.badge = 'Silver';
      else if (s.rank === 3) s.badge = 'Bronze';
      else s.badge = 'Participant';
    });

    res.json(reports);
  } catch (error) {
    console.error('Fetch student reports error:', error);
    res.status(500).json({ message: 'Internal server error fetching student reports' });
  }
});

// Get overall leaderboard ranking (Accessible to ALL authenticated users including students)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const allUsers = await db.getUsers();
    const students = allUsers.filter(u => u.role === 'student');
    const reports = await Promise.all(students.map(async s => {
      const data = await getStudentReportData(s.id);
      return {
        studentId: data.studentId,
        name: data.name,
        email: data.email,
        rollNo: s.rollNo,
        year: s.year || '1st Year',
        totalEarned: data.totalEarned,
        currentBalance: data.currentBalance,
        rank: data.rank,
        rpStatus: data.rpStatus,
        badge: data.badge
      };
    }));

    // Sort strictly by RP balance descending (and total earned as tie-breaker)
    reports.sort((a, b) => {
      if (b.currentBalance !== a.currentBalance) return b.currentBalance - a.currentBalance;
      if (b.totalEarned !== a.totalEarned) return b.totalEarned - a.totalEarned;
      return a.name.localeCompare(b.name);
    });

    // Re-assign ranks dynamically so Rank #1 is ALWAYS highest RP
    reports.forEach((s, idx) => {
      s.rank = idx + 1;
      if (s.rank === 1) s.badge = 'Gold';
      else if (s.rank === 2) s.badge = 'Silver';
      else if (s.rank === 3) s.badge = 'Bronze';
      else s.badge = 'Participant';
    });

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

    // Students can only access their own report, Admins and Faculty can view any student
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

    // Check student exists
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
