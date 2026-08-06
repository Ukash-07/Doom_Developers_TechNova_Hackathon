const pool = require('./mysql');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
let mysqlDisabled = false;

function readJsonData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], activities: [], rpHistory: [], queries: [], studentMarks: [], submissions: [] };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const d = JSON.parse(raw);
    return {
      users: d.users || [],
      activities: d.activities || [],
      rpHistory: d.rpHistory || [],
      queries: d.queries || [],
      studentMarks: d.studentMarks || [],
      submissions: d.submissions || []
    };
  } catch (e) {
    return { users: [], activities: [], rpHistory: [], queries: [], studentMarks: [], submissions: [] };
  }
}

function writeJsonData(d) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing fallback JSON database:', e);
  }
}

async function execWithFallback(mysqlFn, jsonFn) {
  if (mysqlDisabled) {
    return jsonFn();
  }
  try {
    return await mysqlFn();
  } catch (err) {
    if (!mysqlDisabled) {
      console.warn('MySQL connection failed, permanently switching to local data.json fallback for fast response:', err.message);
      mysqlDisabled = true;
    }
    return jsonFn();
  }
}

module.exports = {
  // Fetch all users
  async getUsers() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM users');
        return rows;
      },
      () => readJsonData().users
    );
  },

  // Fetch all activities
  async getActivities() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM activities ORDER BY createdAt DESC');
        return rows;
      },
      () => {
        const data = readJsonData();
        return [...data.activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    );
  },

  // Fetch all RP history records
  async getRpHistory() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM rp_history ORDER BY createdAt DESC');
        return rows;
      },
      () => {
        const data = readJsonData();
        return [...data.rpHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    );
  },

  // Fetch all support queries
  async getQueries() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM queries ORDER BY createdAt DESC');
        return rows;
      },
      () => {
        const data = readJsonData();
        return [...data.queries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    );
  },

  // Fetch all student marks baseline records
  async getStudentMarks() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM student_marks');
        return rows;
      },
      () => readJsonData().studentMarks
    );
  },

  // Find user by email
  async findUserByEmail(email) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        return rows[0] || null;
      },
      () => {
        const data = readJsonData();
        return data.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
      }
    );
  },

  // Find user by ID
  async findUserById(id) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
      },
      () => {
        const data = readJsonData();
        return data.users.find(u => u.id === id) || null;
      }
    );
  },

  // Fetch all faculty members
  async getFaculties() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query("SELECT id, name, email, role, facultyResponsibility, createdAt FROM users WHERE role = 'faculty'");
        return rows;
      },
      () => {
        const data = readJsonData();
        return data.users.filter(u => u.role === 'faculty').map(f => ({
          id: f.id, name: f.name, email: f.email, role: f.role,
          facultyResponsibility: f.facultyResponsibility, createdAt: f.createdAt
        }));
      }
    );
  },

  // Create new user & initialize default marks
  async createUser(user) {
    return execWithFallback(
      async () => {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query(
            'INSERT INTO users (id, name, email, passwordHash, role, facultyResponsibility, year, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user.id, user.name, user.email, user.passwordHash, user.role, user.facultyResponsibility || null, user.year || '1st Year', user.createdAt]
          );
          if (user.role === 'student') {
            await conn.query(
              'INSERT INTO student_marks (studentId, internalMarks, updatedAt) VALUES (?, 75, ?)',
              [user.id, user.createdAt]
            );
          }
          await conn.commit();
          return user;
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      },
      () => {
        const data = readJsonData();
        data.users.push(user);
        if (user.role === 'student') {
          data.studentMarks.push({ studentId: user.id, internalMarks: 75, updatedAt: user.createdAt });
        }
        writeJsonData(data);
        return user;
      }
    );
  },

  // Create new activity
  async createActivity(activity) {
    return execWithFallback(
      async () => {
        await pool.query(
          'INSERT INTO activities (id, title, description, rpValue, category, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [activity.id, activity.title, activity.description, activity.rpValue, activity.category || 'general', activity.createdBy, activity.createdAt]
        );
        return activity;
      },
      () => {
        const data = readJsonData();
        data.activities.push(activity);
        writeJsonData(data);
        return activity;
      }
    );
  },

  // Add points allocation/redemption record
  async addRpRecord(record) {
    return execWithFallback(
      async () => {
        await pool.query(
          'INSERT INTO rp_history (id, studentId, activityId, points, description, type, allocatedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [record.id, record.studentId, record.activityId, record.points, record.description, record.type, record.allocatedBy, record.createdAt]
        );
        return record;
      },
      () => {
        const data = readJsonData();
        data.rpHistory.push(record);
        writeJsonData(data);
        return record;
      }
    );
  },

  // Get RP history filtered by student
  async getRpHistoryForStudent(studentId) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query(
          'SELECT * FROM rp_history WHERE studentId = ? ORDER BY createdAt DESC',
          [studentId]
        );
        return rows;
      },
      () => {
        const data = readJsonData();
        return data.rpHistory.filter(r => r.studentId === studentId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    );
  },

  // Create helpdesk query/ticket
  async createQuery(query) {
    return execWithFallback(
      async () => {
        await pool.query(
          'INSERT INTO queries (id, studentId, category, subject, message, status, response, respondedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [query.id, query.studentId, query.category || 'ps', query.subject, query.message, query.status, query.response, query.respondedBy, query.createdAt, query.updatedAt]
        );
        return query;
      },
      () => {
        const data = readJsonData();
        data.queries.push(query);
        writeJsonData(data);
        return query;
      }
    );
  },

  // Retrieve individual support ticket
  async getQueryById(id) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
        return rows[0] || null;
      },
      () => {
        const data = readJsonData();
        return data.queries.find(q => q.id === id) || null;
      }
    );
  },

  // Update support ticket response/status
  async updateQuery(id, updates) {
    return execWithFallback(
      async () => {
        const keys = Object.keys(updates);
        if (keys.length === 0) return null;
        const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
        const values = Object.values(updates);
        await pool.query(`UPDATE queries SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);
        return this.getQueryById(id);
      },
      () => {
        const data = readJsonData();
        const idx = data.queries.findIndex(q => q.id === id);
        if (idx !== -1) {
          data.queries[idx] = { ...data.queries[idx], ...updates, updatedAt: new Date().toISOString() };
          writeJsonData(data);
          return data.queries[idx];
        }
        return null;
      }
    );
  },

  // Retrieve individual student marks baseline
  async getMarksForStudent(studentId) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT internalMarks FROM student_marks WHERE studentId = ?', [studentId]);
        return rows[0] ? rows[0].internalMarks : 75;
      },
      () => {
        const data = readJsonData();
        const m = data.studentMarks.find(sm => sm.studentId === studentId);
        return m ? m.internalMarks : 75;
      }
    );
  },

  // Update baseline exam marks
  async updateMarksForStudent(studentId, marks) {
    return execWithFallback(
      async () => {
        const updatedAt = new Date().toISOString();
        await pool.query(
          'INSERT INTO student_marks (studentId, internalMarks, updatedAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE internalMarks = ?, updatedAt = ?',
          [studentId, Number(marks), updatedAt, Number(marks), updatedAt]
        );
      },
      () => {
        const data = readJsonData();
        const idx = data.studentMarks.findIndex(sm => sm.studentId === studentId);
        const now = new Date().toISOString();
        if (idx !== -1) {
          data.studentMarks[idx].internalMarks = Number(marks);
          data.studentMarks[idx].updatedAt = now;
        } else {
          data.studentMarks.push({ studentId, internalMarks: Number(marks), updatedAt: now });
        }
        writeJsonData(data);
      }
    );
  },

  // Delete user account and associated data
  async deleteUser(id) {
    return execWithFallback(
      async () => {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query('SET FOREIGN_KEY_CHECKS = 0');
          await conn.query('DELETE FROM student_marks WHERE studentId = ?', [id]);
          await conn.query('DELETE FROM rp_history WHERE studentId = ? OR allocatedBy = ?', [id, id]);
          await conn.query('DELETE FROM queries WHERE studentId = ?', [id]);
          await conn.query('DELETE FROM activities WHERE createdBy = ?', [id]);
          await conn.query('DELETE FROM submissions WHERE studentId = ?', [id]);
          const [result] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
          await conn.query('SET FOREIGN_KEY_CHECKS = 1');
          await conn.commit();
          return result.affectedRows > 0;
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      },
      () => {
        const data = readJsonData();
        const initialCount = data.users.length;
        data.users = data.users.filter(u => u.id !== id);
        data.studentMarks = data.studentMarks.filter(sm => sm.studentId !== id);
        data.rpHistory = data.rpHistory.filter(r => r.studentId !== id && r.allocatedBy !== id);
        data.queries = data.queries.filter(q => q.studentId !== id);
        data.activities = data.activities.filter(a => a.createdBy !== id);
        data.submissions = data.submissions.filter(s => s.studentId !== id);
        writeJsonData(data);
        return data.users.length < initialCount;
      }
    );
  },

  // Submissions management
  async getSubmissions() {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM submissions ORDER BY submittedAt DESC');
        return rows;
      },
      () => {
        const data = readJsonData();
        return [...data.submissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      }
    );
  },

  async getSubmissionById(id) {
    return execWithFallback(
      async () => {
        const [rows] = await pool.query('SELECT * FROM submissions WHERE id = ?', [id]);
        return rows[0] || null;
      },
      () => {
        const data = readJsonData();
        return data.submissions.find(s => s.id === id) || null;
      }
    );
  },

  async saveSubmission(sub) {
    return execWithFallback(
      async () => {
        const [existing] = await pool.query('SELECT * FROM submissions WHERE studentId = ? AND activityId = ?', [sub.studentId, sub.activityId]);
        if (existing.length > 0) {
          await pool.query(
            'UPDATE submissions SET submissionText = ?, status = "pending", feedback = NULL, updatedAt = ? WHERE id = ?',
            [sub.submissionText, sub.updatedAt, existing[0].id]
          );
          return { ...existing[0], submissionText: sub.submissionText, status: 'pending', feedback: null, updatedAt: sub.updatedAt };
        } else {
          await pool.query(
            'INSERT INTO submissions (id, activityId, studentId, submissionText, status, feedback, submittedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [sub.id, sub.activityId, sub.studentId, sub.submissionText, sub.status, sub.feedback, sub.submittedAt, sub.updatedAt]
          );
          return sub;
        }
      },
      () => {
        const data = readJsonData();
        const idx = data.submissions.findIndex(s => s.studentId === sub.studentId && s.activityId === sub.activityId);
        if (idx !== -1) {
          data.submissions[idx] = { ...data.submissions[idx], submissionText: sub.submissionText, status: 'pending', feedback: null, updatedAt: sub.updatedAt };
          writeJsonData(data);
          return data.submissions[idx];
        } else {
          data.submissions.push(sub);
          writeJsonData(data);
          return sub;
        }
      }
    );
  },

  async updateSubmissionStatus(id, status, feedback, updatedAt) {
    return execWithFallback(
      async () => {
        await pool.query(
          'UPDATE submissions SET status = ?, feedback = ?, updatedAt = ? WHERE id = ?',
          [status, feedback, updatedAt, id]
        );
      },
      () => {
        const data = readJsonData();
        const idx = data.submissions.findIndex(s => s.id === id);
        if (idx !== -1) {
          data.submissions[idx].status = status;
          data.submissions[idx].feedback = feedback;
          data.submissions[idx].updatedAt = updatedAt;
          writeJsonData(data);
        }
      }
    );
  }
};
