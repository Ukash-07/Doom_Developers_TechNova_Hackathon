const fs = require('fs');
const path = require('path');

const bcryptHash = "$2a$10$S1sCLqP.Lj70/uctW74S1e/JTgWatS7o2nLKDOaL5yjBzTL3J8oSu"; // student123
const facultyHash = "$2a$10$kphXVbqZrktpOO3VlGDzOeUEbHL0yXQV/4eTkhZtKMDSyEnw/7Qsy"; // faculty123
const adminHash = "$2a$10$7LhwkafEqgRiuKsxDm5n/OkmRcxLCfotLXf2AsXokG.CGzgVWwFy."; // admin123

const users = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    name: "Dr. Sarah Jenkins (Dean)",
    email: "admin@college.edu",
    passwordHash: adminHash,
    role: "admin",
    createdAt: "2026-07-31T09:29:05.018Z"
  },
  {
    id: "f1111111-1111-1111-1111-111111111111",
    name: "Dr. Robert Vance (PS Lead)",
    email: "faculty.ps@college.edu",
    passwordHash: facultyHash,
    role: "faculty",
    facultyResponsibility: "ps",
    createdAt: "2026-07-31T09:29:05.018Z"
  },
  {
    id: "f2222222-2222-2222-2222-222222222222",
    name: "Prof. Elena Rostova (Hackathon Lead)",
    email: "faculty.hackathon@college.edu",
    passwordHash: facultyHash,
    role: "faculty",
    facultyResponsibility: "hackathon",
    createdAt: "2026-07-31T09:29:05.018Z"
  },
  {
    id: "f3333333-3333-3333-3333-333333333333",
    name: "Dr. Marcus Chen (Certifications Lead)",
    email: "faculty.cert@college.edu",
    passwordHash: facultyHash,
    role: "faculty",
    facultyResponsibility: "certifications",
    createdAt: "2026-07-31T09:29:05.018Z"
  }
];

const studentNames = [
  { name: "Student S1 (Aarav Sharma)", year: "3rd Year", marks: 78, rp: 170 },
  { name: "Student S2 (Bhavya Patel)", year: "4th Year", marks: 85, rp: 270 },
  { name: "Student S3 (Chirag Reddy)", year: "2nd Year", marks: 65, rp: 50 },
  { name: "Student S4 (Divya Nair)", year: "3rd Year", marks: 92, rp: 230 },
  { name: "Student S5 (Eshaan Gupta)", year: "1st Year", marks: 80, rp: 120 },
  { name: "Student S6 (Farhan Khan)", year: "4th Year", marks: 88, rp: 200 },
  { name: "Student S7 (Gauri Verma)", year: "2nd Year", marks: 74, rp: 150 },
  { name: "Student S8 (Harsh Joshi)", year: "3rd Year", marks: 90, rp: 300 },
  { name: "Student S9 (Isha Malhotra)", year: "1st Year", marks: 82, rp: 80 },
  { name: "Student S10 (Jai Deshmukh)", year: "4th Year", marks: 95, rp: 350 }
];

const studentMarks = [];
const rpHistory = [];
const queries = [];

studentNames.forEach((s, idx) => {
  const i = idx + 1;
  const numStr = i.toString().padStart(2, '0');
  const sId = `s00000${numStr}-0000-0000-0000-0000000000${numStr}`;
  const email = `s${i}@college.edu`;

  users.push({
    id: sId,
    name: s.name,
    email: email,
    passwordHash: bcryptHash,
    role: "student",
    year: s.year,
    createdAt: "2026-07-31T09:29:05.000Z"
  });

  studentMarks.push({
    studentId: sId,
    internalMarks: s.marks,
    updatedAt: "2026-07-31T09:29:05.000Z"
  });

  // Add RP history
  rpHistory.push({
    id: `rph-s${i}-1`,
    studentId: sId,
    activityId: "act11111-1111-1111-1111-111111111111",
    points: 120,
    description: "Completed National College Hackathon 2026",
    type: "earned",
    allocatedBy: "f2222222-2222-2222-2222-222222222222",
    createdAt: "2026-07-17T09:29:05.000Z"
  });

  if (s.rp > 120) {
    rpHistory.push({
      id: `rph-s${i}-2`,
      studentId: sId,
      activityId: "act22222-2222-2222-2222-222222222222",
      points: s.rp - 120,
      description: "AWS Cloud Practitioner Certification",
      type: "earned",
      allocatedBy: "f3333333-3333-3333-3333-333333333333",
      createdAt: "2026-07-22T09:29:05.000Z"
    });
  }

  // Add sample queries for odd numbered students with target staff domains
  if (i % 2 === 1) {
    const cats = ['ps', 'hackathon', 'certifications'];
    const cat = cats[(i - 1) % 3];
    const respondedByMap = {
      ps: "f1111111-1111-1111-1111-111111111111",
      hackathon: "f2222222-2222-2222-2222-222222222222",
      certifications: "f3333333-3333-3333-3333-333333333333"
    };

    queries.push({
      id: `q-s${i}`,
      studentId: sId,
      category: cat,
      subject: `${cat.toUpperCase()} Query from S${i}`,
      message: `Hi Faculty, please verify my ${cat} submission and expected points.`,
      status: i === 1 ? "resolved" : "pending",
      response: i === 1 ? "Verified and points allocated successfully." : null,
      respondedBy: i === 1 ? respondedByMap[cat] : null,
      createdAt: "2026-07-30T09:29:05.000Z",
      updatedAt: "2026-07-31T09:29:05.000Z"
    });
  }
});

const activities = [
  {
    id: "act11111-1111-1111-1111-111111111111",
    title: "National College Hackathon 2026",
    description: "Participated in or won a position in the 24-hour coding hackathon.",
    rpValue: 120,
    category: "hackathon",
    createdBy: "f2222222-2222-2222-2222-222222222222",
    createdAt: "2026-07-16T09:29:05.185Z"
  },
  {
    id: "act22222-2222-2222-2222-222222222222",
    title: "AWS Cloud Practitioner Certification",
    description: "Obtained official cloud practitioner credential from Amazon Web Services.",
    rpValue: 150,
    category: "certifications",
    createdBy: "f3333333-3333-3333-3333-333333333333",
    createdAt: "2026-07-21T09:29:05.185Z"
  },
  {
    id: "act33333-3333-3333-3333-333333333333",
    title: "LeetCode 50 Problems Milestone",
    description: "Successfully solved 50+ medium/hard problem solving assessment challenges.",
    rpValue: 100,
    category: "ps",
    createdBy: "f1111111-1111-1111-1111-111111111111",
    createdAt: "2026-07-26T09:29:05.185Z"
  },
  {
    id: "act44444-4444-4444-4444-444444444444",
    title: "NPTEL Online Certification Course",
    description: "Completed 12-week NPTEL course with Elite certificate.",
    rpValue: 80,
    category: "certifications",
    createdBy: "f3333333-3333-3333-3333-333333333333",
    createdAt: "2026-07-29T09:29:05.185Z"
  }
];

const data = {
  users,
  activities,
  rpHistory,
  queries,
  studentMarks
};

const targetPath = path.join(__dirname, '../data.json');
fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
console.log('Successfully generated 10 student dummy data in data.json!');
