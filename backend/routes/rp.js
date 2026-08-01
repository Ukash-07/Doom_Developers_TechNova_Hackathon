const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly, adminOrFaculty } = require('../middleware/auth');

// Helper to calculate student statistics
async function getStudentStats(studentId) {
  const history = await db.getRpHistoryForStudent(studentId);
  const totalEarned = history.filter(h => h.points > 0).reduce((sum, h) => sum + h.points, 0);
  const totalUsed = history.filter(h => h.points < 0).reduce((sum, h) => sum + Math.abs(h.points), 0);
  const currentBalance = totalEarned - totalUsed;
  
  return {
    totalEarned,
    totalUsed,
    currentBalance,
    history
  };
}

// Allocate RP to a student (Admin only)
// Allocate RP to a student (Admin or Faculty)
router.post('/allocate', auth, adminOrFaculty, async (req, res) => {
  try {
    const { studentId, activityId, points, description } = req.body;

    if (!studentId || points === undefined) {
      return res.status(400).json({ message: 'studentId and points are required' });
    }

    const pts = Number(points);
    if (isNaN(pts) || pts <= 0) {
      return res.status(400).json({ message: 'Points to allocate must be a positive number' });
    }

    // Verify student exists
    const student = await db.findUserById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    let resolvedDesc = description;
    let actId = null;

    // If activityId is provided, double check it exists and set default description
    if (activityId) {
      const activities = await db.getActivities();
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        actId = activity.id;
        resolvedDesc = resolvedDesc || `Completed activity: ${activity.title}`;
      }
    }

    resolvedDesc = resolvedDesc || 'Special reward points allocation';

    const newRecord = {
      id: uuidv4(),
      studentId,
      activityId: actId,
      points: pts,
      description: resolvedDesc,
      type: 'earned',
      allocatedBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.addRpRecord(newRecord);
    const newStats = await getStudentStats(studentId);
    res.status(201).json({
      message: 'Points successfully allocated',
      record: newRecord,
      newStats
    });
  } catch (error) {
    console.error('Allocate points error:', error);
    res.status(500).json({ message: 'Internal server error allocating points' });
  }
});

// Bulk Excel/CSV RP Allocation (Admin or Faculty)
router.post('/bulk-allocate', auth, adminOrFaculty, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required and cannot be empty' });
    }

    const allUsers = await db.getUsers();
    const students = allUsers.filter(u => u.role === 'student');

    let successCount = 0;
    let failCount = 0;
    const failedItems = [];
    const createdRecords = [];

    for (const item of items) {
      const targetMail = (item.email || '').trim().toLowerCase();
      const targetRoll = (item.rollNo || '').trim().toLowerCase();
      const pts = Number(item.points);
      const purpose = (item.purpose || item.description || 'Excel Batch RP Allocation').trim();

      if (isNaN(pts) || pts <= 0) {
        failCount++;
        failedItems.push({ item, reason: 'Invalid or missing RP points value' });
        continue;
      }

      // Match student by email or roll number prefix
      const student = students.find(s => {
        const sEmail = s.email.toLowerCase();
        const sRoll = (s.rollNo || sEmail.split('@')[0]).toLowerCase();
        return (targetMail && sEmail === targetMail) || (targetRoll && sRoll === targetRoll);
      });

      if (!student) {
        failCount++;
        failedItems.push({ item, reason: `Student not found for email: '${targetMail}' or roll: '${targetRoll}'` });
        continue;
      }

      const newRecord = {
        id: uuidv4(),
        studentId: student.id,
        activityId: null,
        points: pts,
        description: purpose,
        type: 'earned',
        allocatedBy: req.user.id,
        createdAt: new Date().toISOString()
      };

      await db.addRpRecord(newRecord);
      createdRecords.push(newRecord);
      successCount++;
    }

    res.json({
      message: `Bulk allocation complete: ${successCount} processed successfully, ${failCount} failed.`,
      successCount,
      failCount,
      failedItems
    });
  } catch (error) {
    console.error('Bulk allocate points error:', error);
    res.status(500).json({ message: 'Internal server error processing bulk RP allocation' });
  }
});

// Deduct/Redeem RP from a student (Admin only)
// Deduct/Redeem RP from a student (Admin or Faculty)
router.post('/deduct', auth, adminOrFaculty, async (req, res) => {
  try {
    const { studentId, points, description } = req.body;

    if (!studentId || points === undefined || !description) {
      return res.status(400).json({ message: 'studentId, points, and description (reason for deduction) are required' });
    }

    const pts = Number(points);
    if (isNaN(pts) || pts <= 0) {
      return res.status(400).json({ message: 'Points to deduct must be a positive number' });
    }

    // Verify student exists
    const student = await db.findUserById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const stats = await getStudentStats(studentId);
    if (stats.currentBalance < pts) {
      return res.status(400).json({ 
        message: `Insufficient points. Student only has ${stats.currentBalance} points, cannot deduct ${pts}.`
      });
    }

    const newRecord = {
      id: uuidv4(),
      studentId,
      activityId: null,
      points: -pts, // negative for deduction
      description,
      type: 'used',
      allocatedBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.addRpRecord(newRecord);
    const newStats = await getStudentStats(studentId);
    res.status(201).json({
      message: 'Points successfully deducted',
      record: newRecord,
      newStats
    });
  } catch (error) {
    console.error('Deduct points error:', error);
    res.status(500).json({ message: 'Internal server error deducting points' });
  }
});

// Get detailed RP history for a student
router.get('/history/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only access their own history, Admins can view any student
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Access denied: You can only view your own points history' });
    }

    const student = await db.findUserById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const stats = await getStudentStats(studentId);
    // Sort history by date (newest first)
    stats.history = [...stats.history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(stats);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ message: 'Internal server error fetching RP history' });
  }
});

// Get Leaderboard rankings
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const allUsers = await db.getUsers();
    const students = allUsers.filter(u => u.role === 'student');
    
    const rankings = await Promise.all(students.map(async student => {
      const stats = await getStudentStats(student.id);
      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        year: student.year || '1st Year',
        totalEarned: stats.totalEarned,
        currentBalance: stats.currentBalance,
        totalUsed: stats.totalUsed
      };
    }));

    // Sort by total earned RP (highest first) so redeeming rewards doesn't hurt ranking
    rankings.sort((a, b) => b.totalEarned - a.totalEarned);

    // Calculate rank and assign badges
    const rankedWithBadges = rankings.map((student, index) => {
      const rank = index + 1;
      let badge = 'Participant';
      if (rank === 1) badge = 'Gold';
      else if (rank === 2) badge = 'Silver';
      else if (rank === 3) badge = 'Bronze';

      return {
        ...student,
        rank,
        badge
      };
    });

    // Calculate class average (earned points)
    const totalClassPoints = rankings.reduce((sum, s) => sum + s.totalEarned, 0);
    const averageRp = rankings.length > 0 ? Number((totalClassPoints / rankings.length).toFixed(1)) : 0;

    res.json({
      leaderboard: rankedWithBadges,
      averageRp
    });
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ message: 'Internal server error fetching leaderboard' });
  }
});

module.exports = router;
