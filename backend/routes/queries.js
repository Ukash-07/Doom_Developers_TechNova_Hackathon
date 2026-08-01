const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly, adminOrFaculty } = require('../middleware/auth');

// Get queries
router.get('/', auth, async (req, res) => {
  try {
    const allQueries = await db.getQueries();
    let filtered = [];

    if (req.user.role === 'faculty') {
      // Faculty members see ONLY queries assigned to their domain responsibility
      const facultyDomain = req.user.facultyResponsibility || 'ps';
      const domainQueries = allQueries.filter(q => (q.category || 'ps') === facultyDomain);

      filtered = await Promise.all(domainQueries.map(async q => {
        const student = await db.findUserById(q.studentId);
        return {
          ...q,
          studentName: student ? student.name : 'Unknown Student',
          studentEmail: student ? student.email : ''
        };
      }));

      filtered.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else if (req.user.role === 'admin') {
      // Admins see all queries across all domain categories as an audit log stream
      filtered = await Promise.all(allQueries.map(async q => {
        const student = await db.findUserById(q.studentId);
        let responderName = null;
        if (q.respondedBy) {
          const responder = await db.findUserById(q.respondedBy);
          responderName = responder ? responder.name : 'Staff Administrator';
        }

        return {
          ...q,
          studentName: student ? student.name.replace(/^Student\s+S\d+\s*\(([^)]+)\)/i, '$1').replace(/^Student\s+S\d+\s*/i, '').trim() : 'Unknown Student',
          studentEmail: student ? student.email : '',
          studentRollNo: student ? (student.rollNo || student.email.split('@')[0].toUpperCase()) : '',
          responderName: responderName || (q.response ? 'Faculty/Admin Staff' : null)
        };
      }));

      filtered.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else {
      // Students see only their own queries
      filtered = allQueries.filter(q => q.studentId === req.user.id);
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(filtered);
  } catch (error) {
    console.error('Fetch queries error:', error);
    res.status(500).json({ message: 'Internal server error fetching queries' });
  }
});

// Submit a new query (Student only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit queries' });
    }

    const { subject, message, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Validate target staff domain category
    const validCategories = ['ps', 'hackathon', 'certifications'];
    const targetCategory = validCategories.includes(category) ? category : 'ps';

    const newQuery = {
      id: uuidv4(),
      studentId: req.user.id,
      category: targetCategory,
      subject,
      message,
      status: 'pending',
      response: null,
      respondedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.createQuery(newQuery);
    res.status(201).json(newQuery);
  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({ message: 'Internal server error submitting query' });
  }
});

// Respond to a query (Admin or Faculty)
router.post('/:queryId/respond', auth, adminOrFaculty, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { response } = req.body;

    if (!response || response.trim() === '') {
      return res.status(400).json({ message: 'Response message cannot be empty' });
    }

    const query = await db.getQueryById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // If user is faculty, ensure query category matches their assigned responsibility domain
    if (req.user.role === 'faculty') {
      const queryCat = query.category || 'ps';
      if (queryCat !== req.user.facultyResponsibility) {
        return res.status(403).json({ 
          message: `Forbidden: You can only respond to queries assigned to your responsibility domain (${req.user.facultyResponsibility.toUpperCase()})` 
        });
      }
    }

    const updated = await db.updateQuery(queryId, {
      status: 'resolved',
      response,
      respondedBy: req.user.id
    });

    res.json({
      message: 'Query responded and marked resolved successfully',
      query: updated
    });
  } catch (error) {
    console.error('Respond query error:', error);
    res.status(500).json({ message: 'Internal server error responding to query' });
  }
});

module.exports = router;
