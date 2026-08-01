const pool = require('./mysql');

module.exports = {
  // Fetch all users
  async getUsers() {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  },

  // Fetch all activities
  async getActivities() {
    const [rows] = await pool.query('SELECT * FROM activities ORDER BY createdAt DESC');
    return rows;
  },

  // Fetch all RP history records
  async getRpHistory() {
    const [rows] = await pool.query('SELECT * FROM rp_history ORDER BY createdAt DESC');
    return rows;
  },

  // Fetch all support queries
  async getQueries() {
    const [rows] = await pool.query('SELECT * FROM queries ORDER BY createdAt DESC');
    return rows;
  },

  // Fetch all student marks baseline records
  async getStudentMarks() {
    const [rows] = await pool.query('SELECT * FROM student_marks');
    return rows;
  },

  // Find user by email
  async findUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    return rows[0] || null;
  },

  // Find user by ID
  async findUserById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Fetch all faculty members
  async getFaculties() {
    const [rows] = await pool.query("SELECT id, name, email, role, facultyResponsibility, createdAt FROM users WHERE role = 'faculty'");
    return rows;
  },

  // Create new user & initialize default marks
  async createUser(user) {
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

  // Create new activity
  async createActivity(activity) {
    await pool.query(
      'INSERT INTO activities (id, title, description, rpValue, category, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [activity.id, activity.title, activity.description, activity.rpValue, activity.category || 'general', activity.createdBy, activity.createdAt]
    );
    return activity;
  },

  // Add points allocation/redemption record
  async addRpRecord(record) {
    await pool.query(
      'INSERT INTO rp_history (id, studentId, activityId, points, description, type, allocatedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [record.id, record.studentId, record.activityId, record.points, record.description, record.type, record.allocatedBy, record.createdAt]
    );
    return record;
  },

  // Get RP history filtered by student
  async getRpHistoryForStudent(studentId) {
    const [rows] = await pool.query(
      'SELECT * FROM rp_history WHERE studentId = ? ORDER BY createdAt DESC',
      [studentId]
    );
    return rows;
  },

  // Create helpdesk query/ticket
  async createQuery(query) {
    await pool.query(
      'INSERT INTO queries (id, studentId, category, subject, message, status, response, respondedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [query.id, query.studentId, query.category || 'ps', query.subject, query.message, query.status, query.response, query.respondedBy, query.createdAt, query.updatedAt]
    );
    return query;
  },

  // Retrieve individual support ticket
  async getQueryById(id) {
    const [rows] = await pool.query('SELECT * FROM queries WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Update support ticket response/status
  async updateQuery(id, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return null;
    
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = Object.values(updates);
    
    await pool.query(`UPDATE queries SET ${setClause}, updatedAt = ? WHERE id = ?`, [...values, new Date().toISOString(), id]);
    return this.getQueryById(id);
  },

  // Retrieve individual student marks baseline
  async getMarksForStudent(studentId) {
    const [rows] = await pool.query('SELECT internalMarks FROM student_marks WHERE studentId = ?', [studentId]);
    return rows[0] ? rows[0].internalMarks : 75; // default 75 marks baseline
  },

  // Update baseline exam marks
  async updateMarksForStudent(studentId, marks) {
    const updatedAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO student_marks (studentId, internalMarks, updatedAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE internalMarks = ?, updatedAt = ?',
      [studentId, Number(marks), updatedAt, Number(marks), updatedAt]
    );
  }
};
