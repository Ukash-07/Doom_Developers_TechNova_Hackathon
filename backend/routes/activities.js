const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly, adminOrFaculty } = require('../middleware/auth');

// Get all activities (any authenticated user can view)
router.get('/', auth, async (req, res) => {
  try {
    const activities = await db.getActivities();
    // Sort activities by creation date (newest first)
    const sorted = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (error) {
    console.error('Fetch activities error:', error);
    res.status(500).json({ message: 'Internal server error fetching activities' });
  }
});

// Create a new activity (Admin or Faculty)
router.post('/', auth, adminOrFaculty, async (req, res) => {
  try {
    const { title, description, rpValue, category } = req.body;

    if (!title || !description || rpValue === undefined) {
      return res.status(400).json({ message: 'All fields (title, description, rpValue) are required' });
    }

    const points = Number(rpValue);
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ message: 'Reward points (rpValue) must be a positive number' });
    }

    // Determine category: explicit from body, or auto-set from faculty responsibility
    let resolvedCategory = category || 'general';
    if (req.user.role === 'faculty' && req.user.facultyResponsibility && !category) {
      resolvedCategory = req.user.facultyResponsibility;
    }

    const validCategories = ['ps', 'hackathon', 'certifications', 'general'];
    if (!validCategories.includes(resolvedCategory)) {
      resolvedCategory = 'general';
    }

    const newActivity = {
      id: uuidv4(),
      title,
      description,
      rpValue: points,
      category: resolvedCategory,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    await db.createActivity(newActivity);
    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ message: 'Internal server error creating activity' });
  }
});

module.exports = router;
