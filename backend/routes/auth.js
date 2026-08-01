const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, adminOnly, JWT_SECRET } = require('../middleware/auth');

// Register student (public self-registration)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, email, password) are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create user — self-registration always creates students
    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      year: '1st Year',
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    // Create token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        facultyResponsibility: null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        facultyResponsibility: user.facultyResponsibility || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Get current user profile
router.get('/me', auth, (req, res) => {
  try {
    // req.user has already been loaded by the auth middleware
    res.json({ user: req.user });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Internal server error fetching user profile' });
  }
});

// Admin creates a new user (faculty or student)
router.post('/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, year, facultyResponsibility } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }

    if (!['faculty', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either "faculty" or "student"' });
    }

    if (role === 'faculty' && !facultyResponsibility) {
      return res.status(400).json({ message: 'facultyResponsibility is required for faculty users (ps, hackathon, or certifications)' });
    }

    if (role === 'faculty' && !['ps', 'hackathon', 'certifications'].includes(facultyResponsibility)) {
      return res.status(400).json({ message: 'facultyResponsibility must be one of: ps, hackathon, certifications' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      facultyResponsibility: role === 'faculty' ? facultyResponsibility : null,
      year: role === 'student' ? (year || '1st Year') : null,
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        facultyResponsibility: newUser.facultyResponsibility,
        year: newUser.year
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ message: 'Internal server error creating user' });
  }
});

// Admin: Get list of all faculty members
router.get('/faculties', auth, adminOnly, async (req, res) => {
  try {
    const faculties = await db.getFaculties();
    res.json(faculties);
  } catch (error) {
    console.error('Fetch faculties error:', error);
    res.status(500).json({ message: 'Internal server error fetching faculty list' });
  }
});

module.exports = router;
