DEPLOYMENT LINK : https://doom-developers-tech-nova-hackathon-nu.vercel.app/

# 🎓 Academic Reward Points & Student Performance Management System 

A state-of-the-art, full-stack web application designed for higher education institutions to incentivize, track, and evaluate student academic achievements, problem-solving progress, hackathon participation, and industry certifications using a **Reward Points (RP)** system scaled directly into **Internal Academic Marks (out of 11)**.

---

## 🚀 Key Technologies & Stack

- **Frontend**: React.js, Vite, Vanilla CSS Design System, Lucide React Icons, Canvas/Print PDF Engine
- **Backend**: Node.js, Express.js, REST APIs, JWT Authentication & Role-Based Access Control (RBAC)
- **Database**: MySQL (with automatic fallbacks & seeders)
- **Data Import/Export**: SheetJS (`xlsx`), HTML Print-to-PDF Engine

---

## 🏛️ System Architecture & Domain Lead Roles

The application supports three primary user roles: **Admin**, **Faculty (Domain Leads)**, and **Student**.

Faculty accounts are assigned specialized domain responsibilities:
- 🔬 **PS Lead**: Problem-Solving assessments, LeetCode milestones, and lab coding.
- 🏆 **Hackathon Lead**: Technical competitions, coding hackathons, and paper presentations.
- 📜 **Certifications Lead**: NPTEL courses, AWS/Cloud certifications, and industrial internships.

---

## 📖 Comprehensive User Manual & Features

### 👑 1. Admin Portal (`AdminDashboard`)

The Administrator has master control over institutional records, student bulk imports, faculty provisioning, and query audit logs.

#### **Features & How to Use:**
1. **Excel / CSV Bulk RP Import Module**:
   - Navigate to **`Excel Bulk RP Import`** tab in the sidebar menu.
   - Click **`Download Sample Template (.csv)`** to obtain a pre-formatted spreadsheet.
   - Excel Columns Expected:
     - `Email` (Student Mail ID)
     - `Purpose of adding RP` (Event / Reason)
     - `RP to Add` (Numeric points to credit)
   - Drag & drop or browse `.xlsx`, `.xls`, or `.csv` files.
   - Review the parsed records in the **Spreadsheet Preview Table**.
   - Click **`Confirm & Add RP Directly`** to instantly credit points in batch.

2. **Query Review Audit Log & Resolution Stream**:
   - Navigate to **`Query View`** tab.
   - Functions as a complete audit log stream showing:
     - **Raised By Student & Timestamp**: Student Name, Email, Roll No, and exact submission time (e.g. `01 Aug 2026, 02:45 PM`).
     - **Responded By Staff & Timestamp**: Faculty/Admin Name who resolved the ticket and exact response time (e.g. `01 Aug 2026, 03:10 PM`).
   - Click **`Respond to Query`** to submit or update official resolutions.

3. **User Management**:
   - Provision new **Faculty** accounts with domain assignments (`PS`, `Hackathon`, `Certifications`).
   - Provision new **Student** accounts.

4. **Student Document Submissions Verification**:
   - Review submitted proof links (GitHub repos, certificate URLs).
   - Click **Approve** to verify proof and automatically award RP points.

5. **Students Performance Report & Official PDF Download**:
   - View class standings ordered strictly by **RP Balance descending**.
   - Click **`View Report`** / **`Download PDF`** on any student row to print or save their official Academic Report Card.

---

### 👨‍🏫 2. Faculty Portal (`FacultyDashboard`)

Faculty members manage activities, proof submissions, and point allocations specific to their assigned domain responsibility.

#### **Features & How to Use:**
1. **Activity Posting Module (Dedicated Tab)**:
   - Navigate to **`Activity Posting`** tab.
   - Enter **Activity Title**, **Description / Instructions**, and **RP Value**.
   - Click **`Post New Activity`** to publish it to all student dashboards under your domain.
   - View all active posted activities under your domain responsibility.

2. **RP Allocation Module (Dedicated Tab)**:
   - Navigate to **`RP Allocation`** tab.
   - Toggle between **Allocate Points (+)** and **Redeem / Deduct (-)**.
   - Select student profile, pick a linked activity (optional), specify points, and enter a memo.
   - Click **`Allocate Points`** or **`Deduct Points`** to update student ledgers.
   - Access the live **Student Balance Roster Table** for quick reference.

3. **Document Submissions Module**:
   - Review proof links submitted by students for activities under your domain.
   - Approve or reject submissions with feedback.

4. **Students Report & Internal Mark Calculations**:
   - View student rankings, current balance points, and calculated **Internal Marks (out of 11)**.
   - Generate student PDF report cards.

5. **Query View**:
   - Filtered view showing support queries routed to your domain responsibility.
   - Submit official faculty responses.

---

### 🎓 3. Student Portal (`StudentDashboard` & `Leaderboard`)

Students track their reward points, view class rankings, complete recommended activities, and submit proof documents.

#### **Features & How to Use:**
1. **Student Dashboard Overview**:
   - View **RP Balance**, **Class Average RP**, **Class Standing Rank**, and **Status Rating** (`Good`, `Medium`, `Low`).
   - **Weekly RP Progress Chart**: Dynamic Bezier curve line graph connecting weekly RP points against class average velocity.

2. **Scrollable "Recommended to Earn RP" Widget**:
   - Located on the right side of the dashboard.
   - Displays **all available posted activities** with RP point badges in a dedicated, smooth scrollable card container.

3. **Activities Posting & Document Proof Submission**:
   - Navigate to **`Activities Posting`** tab.
   - Select an activity and click **`Submit Document / Proof Link`**.
   - Input submission URL (GitHub link, Google Drive link, Certificate URL) or text proof for faculty review.

4. **Dedicated Leaderboard Module**:
   - Navigate to **`Leaderboard`** tab.
   - View institutional rankings strictly ordered by **RP Balance descending**.
   - Highlights Top 3 medalists (🥇 Gold, 🥈 Silver, 🥉 Bronze).

5. **Academic History Ledger**:
   - View itemized transaction ledger of all earned and redeemed points.

6. **Helpdesk & Support Query Submission**:
   - Navigate to **`Queries & Helpdesk`** tab.
   - Select target department (`PS Lead`, `Hackathon Lead`, `Certifications Lead`, `General Campus`).
   - Submit tickets and track staff response timestamps.

7. **Download Official Academic Report Card (PDF)**:
   - Click **`Download PDF Report`** on the dashboard.
   - Generates an official printable PDF report card with student details, internal marks, and full point ledger.

---

## 📊 Internal Mark Scaling Logic

Reward Points (RP) are scaled into internal academic marks out of **11 max bonus marks** using the formula:

$$\text{RP Bonus Marks} = \min\left(11, \text{round}\left(\frac{\text{Current RP Balance}}{\text{Max Class RP Balance}} \times 11, 1\right)\right)$$

- **Good Standing**: RP balance $\ge$ Class Average RP
- **Medium Standing**: RP balance $\ge 80\%$ of Class Average RP
- **Low Standing**: RP balance $< 80\%$ of Class Average RP

---

## ⚙️ Setup & Installation Guide

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Server (Optional — fallback JSON engine included)

### 1. Backend Installation & Server Startup
```bash
cd backend
npm install

# Start Node.js API Server (Runs on Port 5000)
npm start
```

### 2. Frontend Installation & Build
```bash
cd frontend
npm install

# Run Local Vite Development Server
npm run dev

# Or Build Production Bundle
npm run build
```

---

## 🔒 Default Test User Accounts

| Role | Email ID | Default Password | Responsibilities / Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `admin123` | Master System Admin |
| **Faculty** | `faculty.ps@college.edu` | `faculty123` | PS Assessment Lead |
| **Faculty** | `faculty.hackathon@college.edu` | `faculty123` | Hackathons & Competitions Lead |
| **Faculty** | `faculty.cert@college.edu` | `faculty123` | Certifications & Internships Lead |
| **Student** | `s10@college.edu` | `student123` | Jai Deshmukh (Roll: S10) |
| **Student** | `ukash@bit.ac.in` | `student123` | Ukash D (Roll: UKASH) |
| **Student** | `vetri@bit.ac.in` | `student123` | Vetriagilan J (Roll: VETRI) |

---

## 📝 License & Copyright
Developed for Higher Education Academic Hackathons & Reward System Management. All rights reserved.
