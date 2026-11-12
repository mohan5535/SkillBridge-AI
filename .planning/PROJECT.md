# Project Context — SkillBridge AI

**Project Name:** SkillBridge AI — Universal Career Gap Tracker  
**Author / Student:** Mohan Mandal (BCA Student, Brainware University)  
**Database Name:** `skillbridge_db` on PostgreSQL 18.6 (x86_64)  
**Repository Path:** `C:\Users\Mohan\OneDrive\Desktop\Intership\New folder`  
**Current Milestone:** Milestone 1 — Core Relational Database Architecture & Integrity Validation  

---

## 1. Project Overview & Mission

**SkillBridge AI** is an extensible, normalized relational database engine and analytical intelligence platform designed to universally track career profiles, educational credentials, skill competencies, career breaks, role requirements, and personalized learning roadmaps across diverse professional sectors.

Unlike conventional career planning tools that focus exclusively on Software Engineering and Information Technology, SkillBridge AI is engineered to be **sector-agnostic**. It models career progression across:
* **Information Technology & Software Development** (Full-Stack Developers, Cloud Architects)
* **Healthcare & Medical Services** (Registered Nurses, Pharmacists, Physicians)
* **Commerce, Accounting & Finance** (Chartered Accountants, Financial Analysts, Auditors)
* **Teaching & Higher Education** (Secondary School Educators, Professors)
* **Engineering Disciplines** (Civil, Mechanical, Electrical)
* **Government & Public Sector Services** (Civil Services, Administrative Cadres)
* **Vocational & Skilled Trades** (Electricians, Machinists, Technicians)

---

## 2. Core Architectural Principles

1. **Universal Extensibility (Zero Hardcoding):**  
   Roles, skills, degree levels, and certification bodies are stored as dynamic catalog records, not hardcoded table schemas or rigid ENUM types. Adding a new industry sector requires only SQL `INSERT` statements.
2. **Ethical & Neutral Career Break Tracking:**  
   Career breaks (parental leave, health recovery, caregiving, education, travel) are captured neutrally as informational context for human counselors and gap analysis. The system completely avoids automated algorithmic penalties or disqualifications.
3. **Rigorous Third Normal Form (3NF / BCNF):**  
   All 22 tables satisfy 3NF and BCNF, eliminating data redundancy, insertion anomalies, update anomalies, and deletion anomalies.
4. **Polymorphic Requirements Modeling:**  
   The `career_requirements` table utilizes mutually exclusive foreign-key constraints to represent skills, qualifications, certifications, and experience thresholds under a unified schema.
5. **Analytical CTE Query Architecture:**  
   Complex reporting queries isolate child aggregations into independent Common Table Expressions (CTEs), completely eliminating Cartesian product inflation.

---

## 3. Technology Stack Summary

* **RDBMS Engine:** PostgreSQL 18.6 (x86_64, Windows MSVC build)
* **Database Client:** Native `psql.exe` (v18.6)
* **Dialect:** ANSI SQL with PostgreSQL 18 enhancements (`SERIAL`, `CHECK`, `COALESCE`, `DISTINCT ON`)
* **Automation & QA:** Python 3.14 (`sqlite3`, `python-docx`, `reportlab`, `matplotlib`, `PIL`)
* **Primary Snapshot Backup:** `skillbridge_backup.dump` (PostgreSQL Custom Format, 104,893 bytes, 22 tables, 157 committed records)

