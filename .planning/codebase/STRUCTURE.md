# Codebase Structure & File Organization — SkillBridge AI

**Project:** SkillBridge AI — Universal Career Gap Tracker  
**Target Environment:** Local / Server Database Host  
**Analysis Date:** 2026-11-10  

---

## 1. Directory Layout

```
C:\Users\Mohan\OneDrive\Desktop\Intership\New folder\
│
├── schema.sql                                     # Master DDL (22 tables, 33 CHECKs, SERIAL PKs)
├── sample_data.sql                                # Committed dataset (174 rows across 3 personas)
├── test_queries.sql                               # 15 Analytical Reporting SQL Queries
├── corrected_test_queries.sql                     # Verified read-only mirror of test_queries.sql
├── database_integrity_checks.sql                  # 13-Section technical integrity audit suite
├── integrity_checks.sql                           # Synchronized mirror of database integrity suite
├── encoding_audit_and_fix.sql                     # UTF-8 byte & hex diagnostic / repair script
├── skillbridge_backup.dump                        # PostgreSQL 18 custom-format binary backup (104 KB)
├── er-diagram.dbml                                # DBML schema source for diagram generation
├── normalization.md                               # Mathematical 1NF, 2NF, 3NF normalization analysis
├── README.md                                      # Project documentation & architectural manual
├── FINAL_VERIFICATION_REPORT.md                   # PostgreSQL 18 verification audit report
│
├── migrations/                                    # Reversible schema migrations
│   ├── 001_add_fk_covering_indexes.sql           # UP migration: 17 foreign-key covering indexes
│   └── 001_add_fk_covering_indexes_down.sql      # DOWN migration: Drop covering indexes
│
├── documentation/                                 # Academic project deliverables
│   ├── SkillBridge_AI_Project_Report.docx         # 31-Section BCA University Project Report (Word)
│   ├── SkillBridge_AI_Project_Report.pdf          # 31-Section BCA University Project Report (PDF)
│   ├── SkillBridge_AI_Database_Testing_Report.docx# Detailed Database QA & Testing Report (Word)
│   ├── SkillBridge_AI_Database_Testing_Report.pdf # Detailed Database QA & Testing Report (PDF)
│   ├── ER_Diagram.png                             # Entity Relationship Diagram (300 DPI)
│   ├── DFD_Level_0.png                            # Data Flow Diagram Level 0 (300 DPI)
│   ├── DFD_Level_1.png                            # Data Flow Diagram Level 1 (300 DPI)
│   ├── Use_Case_Diagram.png                       # UML Use Case Diagram (300 DPI)
│   ├── System_Architecture.png                    # Multi-Tier System Architecture (300 DPI)
│   ├── Database_Relationship_Diagram.png          # Relational Referential Integrity Map (300 DPI)
│   ├── README.md                                  # Documentation navigation guide & verification log
│   └── diagram_sources/                           # Raw Mermaid (.mmd) & PlantUML (.puml) models
│
├── backup_before_validation/                      # Phase 1 pristine baseline backup
├── backup_20261031_phase3/                        # Phase 3 snapshot backup
└── backup_phase6_pre_fix/                         # Phase 6 pre-fix snapshot backup
```

---

## 2. Component Responsibilities

| File / Directory | Layer / Purpose | State |
| :--- | :--- | :---: |
| `schema.sql` | Relational DDL defining 22 tables, constraints, and sequences | Active |
| `sample_data.sql` | Canonical test records (Priya, Rahul, Ananya) | Active |
| `test_queries.sql` | Analytical queries Q1 to Q15 for dashboards and reporting | Active |
| `database_integrity_checks.sql` | Automated test suite verifying constraints, FKs, and sequences | Active |
| `migrations/` | Optional and reversible index performance migrations | Unapplied |
| `skillbridge_backup.dump` | Verifiable binary ground truth archive | Preserved |
| `documentation/` | University project reports, testing reports, and diagram assets | Active |

