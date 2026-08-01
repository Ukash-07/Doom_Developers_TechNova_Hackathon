const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOrFaculty } = require('../middleware/auth');

// Create submission table dynamically if not present
const initSubmissionsTable = async () => {
  try {
    const pool = require('../mysql');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id VARCHAR(255) PRIMARY KEY,
        activityId VARCHAR(255) NOT NULL,
        studentId VARCHAR(255) NOT NULL,
        submissionText TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        feedback TEXT,
        submittedAt VARCHAR(100),
        updatedAt VARCHAR(100)
      )
    `);
  } catch (err) {
    console.error('Submissions table init error:', err);
  }
};
initSubmissionsTable();

// Get submissions (Students get their own; Faculty/Admin get all)
router.get('/', auth, async (req, res) => {
  try {
    const pool = require('../mysql');
    let rows = [];
    if (req.user.role === 'student') {
      [rows] = await pool.query('SELECT * FROM submissions WHERE studentId = ? ORDER BY submittedAt DESC', [req.user.id]);
    } else {
      [rows] = await pool.query('SELECT * FROM submissions ORDER BY submittedAt DESC');
    }

    // Enrich with student name/email & activity details
    const users = await db.getUsers();
    const activities = await db.getActivities();
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const actMap = {};
    activities.forEach(a => { actMap[a.id] = a; });

    const enriched = rows.map(s => {
      const u = userMap[s.studentId] || {};
      const a = actMap[s.activityId] || {};
      return {
        ...s,
        studentName: u.name || 'Unknown Student',
        studentEmail: u.email || '',
        rollNo: u.email ? u.email.split('@')[0].toUpperCase() : '',
        activityTitle: a.title || 'Activity',
        activityCategory: a.category || 'general',
        rpValue: a.rpValue || 0
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

// Student submits proof / document for an activity
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit activity proofs' });
    }

    const { activityId, submissionText } = req.body;
    if (!activityId || !submissionText || !submissionText.trim()) {
      return res.status(400).json({ message: 'Activity ID and document submission link/text are required' });
    }

    const pool = require('../mysql');
    
    // Check if already submitted for this activity
    const [existing] = await pool.query('SELECT * FROM submissions WHERE studentId = ? AND activityId = ?', [req.user.id, activityId]);
    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing submission if pending or rejected
      const subId = existing[0].id;
      await pool.query(
        'UPDATE submissions SET submissionText = ?, status = "pending", feedback = NULL, updatedAt = ? WHERE id = ?',
        [submissionText.trim(), now, subId]
      );
      return res.json({ message: 'Submission updated successfully!', submissionId: subId });
    }

    const newSub = {
      id: uuidv4(),
      activityId,
      studentId: req.user.id,
      submissionText: submissionText.trim(),
      status: 'pending',
      feedback: null,
      submittedAt: now,
      updatedAt: now
    };

    await pool.query(
      'INSERT INTO submissions (id, activityId, studentId, submissionText, status, feedback, submittedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [newSub.id, newSub.activityId, newSub.studentId, newSub.submissionText, newSub.status, newSub.feedback, newSub.submittedAt, newSub.updatedAt]
    );

    res.status(201).json({ message: 'Document submitted successfully for review!', submission: newSub });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Error submitting proof' });
  }
});

// Faculty/Admin Review Submission (Approve & Award RP or Reject)
router.post('/:id/review', auth, adminOrFaculty, async (req, res) => {
  try {
    const { status, feedback } = req.body; // status: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const pool = require('../mysql');
    const [subs] = await pool.query('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (subs.length === 0) {
      return res.status(404).json({ message: 'Submission record not found' });
    }

    const sub = subs[0];
    const now = new Date().toISOString();

    await pool.query(
      'UPDATE submissions SET status = ?, feedback = ?, updatedAt = ? WHERE id = ?',
      [status, feedback || (status === 'approved' ? 'Approved & RP Awarded' : 'Rejected'), now, sub.id]
    );

    // If approved, automatically award RP to student!
    if (status === 'approved') {
      const activities = await db.getActivities();
      const activity = activities.find(a => a.id === sub.activityId);
      const points = activity ? activity.rpValue : 50;
      const title = activity ? activity.title : 'Activity Submission Approved';

      await db.addRpRecord({
        id: uuidv4(),
        studentId: sub.studentId,
        activityId: sub.activityId,
        points: Number(points),
        description: `Verified Submission: ${title}`,
        type: 'allocated',
        allocatedBy: req.user.id,
        createdAt: now
      });
    }

    res.json({ message: `Submission marked as ${status}!`, status });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ message: 'Error updating submission status' });
  }
});

module.exports = router;
