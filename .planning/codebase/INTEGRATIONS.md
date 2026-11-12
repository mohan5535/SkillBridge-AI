# External Integrations & Service Architecture — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Local Database Integration

* **DBMS Endpoint:** `localhost:5432` / `127.0.0.1:5432`
* **Protocol:** PostgreSQL Frontend/Backend Protocol 3.0
* **Security & Auth:** `scram-sha-256` password authentication.
* **Service Name:** PostgreSQL 18 Windows Service (`postgresql-x64-18`)
* **Data Directory:** `C:\Program Files\PostgreSQL\18\data`
* **Configuration Files:**
  * `postgresql.conf` (listen_addresses = '*', shared_buffers, work_mem)
  * `pg_hba.conf` (Enforcing `scram-sha-256` on `127.0.0.1/32` and `::1/128`)

---

## 2. Windows Environment & Terminal Code Page Integration

* **Terminal Code Page:** Windows Command Prompt default is OEM CP437 or CP1252.
* **UTF-8 Requirement:** To prevent mojibake when displaying Unicode characters (such as en-dashes `–` U+2013 and em-dashes `—` U+2014 in course titles and cert names), the console must execute:
  ```cmd
  chcp 65001
  ```
* **PostgreSQL Session Configuration:** All SQL scripts enforce client UTF-8 encoding:
  ```sql
  SET client_encoding = 'UTF8';
  ```

---

## 3. Data Integration: Backup & Restore Archive

* **Primary Snapshot File:** `skillbridge_backup.dump` (104,893 bytes)
* **Format:** PostgreSQL Custom Format (`pg_dump -Fc -Z 9`), gzip-compressed binary archive.
* **TOC Entries:** 243 entries covering 22 tables, comments, sequences, primary keys, check constraints, and table data.
* **Restore Command:**
  ```cmd
  pg_restore -U postgres -d skillbridge_db skillbridge_backup.dump
  ```

---

## 4. Contracted External Integrations (Application Tier)

While the repository currently contains the database architecture and analytical query tier, the relational schema models contracts for three external systems:

1. **Assessment & Testing Engines:**
   * Tables: `assessments`, `assessment_results`
   * Integration Contract: Third-party evaluation engines submit assessment IDs, attempt dates, numeric scores, and binary pass flags.
2. **Learning Resource Providers (EdTech APIs):**
   * Tables: `learning_resources`, `resource_skills`
   * Integration Contract: Providers (Coursera, Udemy, AWS SkillBuilder, NPTEL) supply resource URLs, estimated duration in hours, monetary costs, and taught proficiency levels.
3. **Career Role & Standard Taxonomies:**
   * Tables: `career_fields`, `career_roles`, `career_requirements`
   * Integration Contract: Compatible with O*NET, National Occupational Standards (NOS), and European Qualifications Framework (EQF).

