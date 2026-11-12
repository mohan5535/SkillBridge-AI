# Codebase Tech Stack — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Core Database & RDBMS Engine

* **Database Engine:** PostgreSQL 18 (Version: `PostgreSQL 18.6 (x86_64-pc-windows-msvc)`)
* **Database Name:** `skillbridge_db`
* **Port:** 5432 (TCP/IP local loopback)
* **Authentication Method:** `scram-sha-256` (Configured in `pg_hba.conf`)
* **Default Database Encoding:** UTF-8 (`server_encoding: UTF8`, `client_encoding: UTF8`)
* **Collation / Ctype:** `English_United States.1252` / `UTF-8`

---

## 2. Scripting, Testing & QA Tooling

* **Command-Line Interface:** Native PostgreSQL Client (`C:\Program Files\PostgreSQL\18\bin\psql.exe`)
* **Backup & Restore Tooling:** `pg_dump.exe`, `pg_restore.exe` (Custom Archive Format: `pg_dump -Fc`)
* **Automation & Validation Harness:** Python 3.14 (`python.exe` at `C:\Users\Mohan\AppData\Local\Programs\Python\Python314\`)
* **Package Management:** `pip 25.2+`
* **Python Testing Libraries:**
  * `sqlite3` (Built-in Relational In-Memory Simulation Harness)
  * `python-docx` (Version 1.2.0 — Word Report Generation)
  * `reportlab` (Version 5.1.0 — PDF Compilation with Custom Numbered Canvases)
  * `matplotlib` (Version 3.10+ — Publication-Quality Diagram Generation at 300 DPI)
  * `Pillow` (Version 13.0.0 — Image Processing & Format Validation)

---

## 3. Data Definition & Modeling Languages

* **DDL Dialect:** Standard ANSI SQL with PostgreSQL 18 extensions (`SERIAL`, `NUMERIC`, `TIMESTAMPTZ`, `CHECK`, `COALESCE`, `DISTINCT ON`, Window Functions).
* **Schema Definition Language:** DBML (Database Markup Language) in `er-diagram.dbml`.
* **Diagramming Sources:** PlantUML (`.puml`) and Mermaid (`.mmd`).

---

## 4. Key Architectural Constants & Limits

* **Normal Form:** Strict Third Normal Form (3NF / BCNF).
* **Table Count:** 22 Normalized Relational Tables.
* **Committed Sample Records:** Exactly 174 Rows.
* **Integrity Constraints:**
  * 32 Foreign Key Relationships (Enforced with referential integrity).
  * 33 CHECK Constraints (Date ordering, range bounds, polymorphic exclusivity, domain enums).
  * 22 SERIAL Auto-Incrementing Primary Key Sequences.

