const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATA_FILE = path.join(__dirname, '..', 'data.json');

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'smart_rewards';

  console.log(`Connecting to MySQL on ${host}:${port} as ${user}...`);

  // Connect without database selected first
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    ssl: (host && !host.includes('127.0.0.1') && !host.includes('localhost')) ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Create database
    console.log(`Creating database '${database}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.query(`USE \`${database}\``);

    // 2. Create tables
    console.log("Creating tables...");
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        facultyResponsibility VARCHAR(50) NULL,
        year VARCHAR(50) NULL DEFAULT '1st Year',
        createdAt VARCHAR(50) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        rpValue INT NOT NULL,
        category VARCHAR(50) NULL DEFAULT 'general',
        createdBy VARCHAR(36) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rp_history (
        id VARCHAR(36) PRIMARY KEY,
        studentId VARCHAR(36) NOT NULL,
        activityId VARCHAR(36) NULL,
        points INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        allocatedBy VARCHAR(36) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE SET NULL,
        FOREIGN KEY (allocatedBy) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS queries (
        id VARCHAR(36) PRIMARY KEY,
        studentId VARCHAR(36) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'ps',
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        response TEXT NULL,
        respondedBy VARCHAR(36) NULL,
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (respondedBy) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_marks (
        studentId VARCHAR(36) PRIMARY KEY,
        internalMarks INT NOT NULL DEFAULT 75,
        updatedAt VARCHAR(50) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("Database tables created successfully.");

    // 3b. Apply schema migrations for existing tables (add new columns if they don't exist)
    console.log("Applying schema migrations for existing tables...");

    // Add facultyResponsibility to users if missing
    const [userCols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'facultyResponsibility'",
      [database]
    );
    if (userCols.length === 0) {
      await connection.query("ALTER TABLE users ADD COLUMN facultyResponsibility VARCHAR(50) NULL AFTER role");
      console.log("  -> Added 'facultyResponsibility' column to users table.");
    } else {
      console.log("  -> 'facultyResponsibility' column already exists in users.");
    }

    // Add category to activities if missing
    const [actCols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'category'",
      [database]
    );
    if (actCols.length === 0) {
      await connection.query("ALTER TABLE activities ADD COLUMN category VARCHAR(50) NULL DEFAULT 'general' AFTER rpValue");
      console.log("  -> Added 'category' column to activities table.");
    } else {
      console.log("  -> 'category' column already exists in activities.");
    }

    // Add category to queries if missing
    const [queryCols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'queries' AND COLUMN_NAME = 'category'",
      [database]
    );
    if (queryCols.length === 0) {
      await connection.query("ALTER TABLE queries ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'ps' AFTER studentId");
      console.log("  -> Added 'category' column to queries table.");
    } else {
      console.log("  -> 'category' column already exists in queries.");
    }

    console.log("Schema migrations complete.");


    if (fs.existsSync(DATA_FILE)) {
      console.log("Reading existing mock data from data.json...");
      const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

      // Clean tables first to avoid unique constraint violations on re-run
      await connection.query("SET FOREIGN_KEY_CHECKS = 0");
      await connection.query("TRUNCATE TABLE student_marks");
      await connection.query("TRUNCATE TABLE queries");
      await connection.query("TRUNCATE TABLE rp_history");
      await connection.query("TRUNCATE TABLE activities");
      await connection.query("TRUNCATE TABLE users");
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");

      console.log("Migrating users...");
      if (fileData.users && fileData.users.length > 0) {
        for (const u of fileData.users) {
          await connection.query(
            "INSERT INTO users (id, name, email, passwordHash, role, facultyResponsibility, year, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [u.id, u.name, u.email, u.passwordHash, u.role, u.facultyResponsibility || null, u.year || '3rd Year', u.createdAt || new Date().toISOString()]
          );
        }
      }

      console.log("Migrating activities...");
      if (fileData.activities && fileData.activities.length > 0) {
        for (const a of fileData.activities) {
          await connection.query(
            "INSERT INTO activities (id, title, description, rpValue, category, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [a.id, a.title, a.description, a.rpValue, a.category || 'general', a.createdBy, a.createdAt || new Date().toISOString()]
          );
        }
      }

      console.log("Migrating rp history...");
      if (fileData.rpHistory && fileData.rpHistory.length > 0) {
        for (const h of fileData.rpHistory) {
          await connection.query(
            "INSERT INTO rp_history (id, studentId, activityId, points, description, type, allocatedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [h.id, h.studentId, h.activityId, h.points, h.description, h.type, h.allocatedBy, h.createdAt || new Date().toISOString()]
          );
        }
      }

      console.log("Migrating support queries...");
      if (fileData.queries && fileData.queries.length > 0) {
        for (const q of fileData.queries) {
          await connection.query(
            "INSERT INTO queries (id, studentId, category, subject, message, status, response, respondedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [q.id, q.studentId, q.category || 'ps', q.subject, q.message, q.status, q.response, q.respondedBy, q.createdAt || new Date().toISOString(), q.updatedAt || new Date().toISOString()]
          );
        }
      }

      console.log("Migrating student marks...");
      if (fileData.studentMarks && fileData.studentMarks.length > 0) {
        for (const m of fileData.studentMarks) {
          await connection.query(
            "INSERT INTO student_marks (studentId, internalMarks, updatedAt) VALUES (?, ?, ?)",
            [m.studentId, m.internalMarks, m.updatedAt || new Date().toISOString()]
          );
        }
      }

      console.log("Data migration from data.json completed successfully!");
    } else {
      console.log("No data.json found. Database is set up blank.");
    }
  } catch (error) {
    console.error("Database setup failed:", error);
  } finally {
    await connection.end();
    console.log("Connection closed.");
  }
}

run();
