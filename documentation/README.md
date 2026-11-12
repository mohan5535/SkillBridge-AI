# SkillBridge AI — Academic Project Documentation Package

**Project Title:** SkillBridge AI — Universal Career Gap Tracker  
**Academic Degree:** Bachelor of Computer Applications (BCA)  
**Institution:** Department of Computer Applications, Brainware University, Kolkata, West Bengal  
**Candidate Name:** Mohan Mandal  
**Target Database:** `skillbridge_db` on PostgreSQL 18.6  
**Documentation Date:** November 2026  

---

## 1. Documentation Overview

This directory (`documentation/`) contains the complete, official, university-level academic project documentation and technical database validation suite for **SkillBridge AI — Universal Career Gap Tracker**. All documentation has been generated in accordance with standard university formatting guidelines, reflecting the true, verified implementation of the PostgreSQL 18 relational database engine.

---

## 2. Inventory of Deliverable Files

| # | Deliverable File Name | Format | Description / Academic Scope |
| :-: | :--- | :---: | :--- |
| 1 | **`SkillBridge_AI_Project_Report.docx`** | Microsoft Word (.docx) | Complete 31-section BCA University Project Report including Cover Page, Certificates, DFDs, ERD, SRS, Architecture, 3NF Normalization, Implementation, Results, and References. All diagrams embedded. |
| 2 | **`SkillBridge_AI_Project_Report.pdf`** | Adobe PDF (.pdf) | Publication-ready, professionally styled PDF of the 31-section Project Report with two-tier headers, page numbers ("Page X of Y"), and styled tables. |
| 3 | **`SkillBridge_AI_Database_Testing_Report.docx`** | Microsoft Word (.docx) | Dedicated, in-depth Technical Database Audit & Testing Report covering all 22 tables, 174 records, 32 FK anti-join tests, 13 integrity checks, and 15 analytical SQL test cases. |
| 4 | **`SkillBridge_AI_Database_Testing_Report.pdf`** | Adobe PDF (.pdf) | Formal PDF of the Database Testing Report, distinguishing verified database facts from indexing recommendations. |
| 5 | **`ER_Diagram.png`** | High-Res Image (300 DPI) | Entity Relationship Diagram representing all 22 relational tables grouped across 5 logical tiers with foreign-key cardinalities. |
| 6 | **`DFD_Level_0.png`** | High-Res Image (300 DPI) | Data Flow Diagram — Level 0 (Context Diagram) illustrating interactions between Candidates, Counselors, Assessment Engines, and SkillBridge AI. |
| 7 | **`DFD_Level_1.png`** | High-Res Image (300 DPI) | Data Flow Diagram — Level 1 (Process Decomposition) showing sub-processes 1.0 to 5.0 and data stores D1 to D5. |
| 8 | **`Use_Case_Diagram.png`** | High-Res Image (300 DPI) | UML Use Case Diagram modeling candidate, administrator, and automated system interactions with `<<include>>` and `<<extend>>` relationships. |
| 9 | **`System_Architecture.png`** | High-Res Image (300 DPI) | Multi-Tier System Architecture Diagram detailing the Presentation, API Controller, Business Intelligence, and PostgreSQL 18 Persistence tiers. |
| 10 | **`Database_Relationship_Diagram.png`** | High-Res Image (300 DPI) | Relational Schema Map illustrating primary keys, foreign keys, and 100% referential integrity across the 22 tables. |
| 11 | **`diagram_sources/`** | Source Code (.mmd, .puml) | Raw text source files for all diagrams (Mermaid `.mmd` and PlantUML `.puml`) allowing easy editing or rendering in external tools. |
| 12 | **`README.md`** | Markdown (.md) | This master navigation guide and verification ledger. |

---

## 3. Student & Academic Information Placeholders

The academic reports contain specific placeholders that the student may update prior to final university submission or binding:

1. **Registration Number**: `[Registration Number Placeholder]` (e.g., `BWU/BCA/XX/XXX`)
2. **Roll Number**: `[Roll Number Placeholder]` (e.g., `123456789`)
3. **Academic Session**: `2023 – 2026`
4. **Faculty Project Guide**: `[Faculty Guide Name / Designation Placeholder]` (e.g., `Prof. Dr. A. K. Sharma, Assistant Professor`)
5. **Head of the Department (HOD)**: `[Head of the Department Placeholder]`
6. **Certificate Date**: `November 10, 2026`

---

## 4. Key Database Metrics & Integrity Findings

All technical metrics documented in the reports represent the **ground truth** of the committed database (`skillbridge_db` / `skillbridge_backup.dump`):

* **Total Relational Tables**: 22 normalized tables (Third Normal Form / BCNF).
* **Total Committed Records**: Exactly **174 rows** across the 22 tables.
* **Foreign-Key Referential Integrity**: 32 relational connections audited via SQL anti-joins $\implies$ **0 orphan records (100% PASS)**.
* **Date Sanity Constraints**: 5 date-pair tables verified $\implies$ **0 inverted date ranges (100% PASS)**.
* **Domain Vocabularies**: 14 status/category columns verified against CHECK constraints $\implies$ **0 invalid enums (100% PASS)**.
* **Polymorphic Exclusivity**: 27 rows in `career_requirements` satisfy mutual exclusivity $\implies$ **0 violations (100% PASS)**.
* **Assessment Scoring Logic**: 5 assessment attempts tested against pass thresholds $\implies$ **100% mathematical consistency (100% PASS)**.
* **Analytical Reporting Layer**: All 15 analytical SQL queries executed cleanly $\implies$ **15/15 PASS**.
  * **Query 8 Verified Result**: Candidate Priya Sharma compared against Full-Stack Developer requirements:
    * **Python**: `MET`
    * **React**: `NOT MET`
    * **SQL**: `MET`

---

## 5. Critical Database Caveats

1. **Check 11 (Sequence Synchronization)**:
   Check 11 compares `pg_sequences.last_value` with `MAX(id)` for all 22 SERIAL sequences. This confirms that sequences are synchronized and not lagging behind committed table rows. It is explicitly noted in the documentation as a **sequence synchronization check**, not a complete validation of sequence ownership, increment steps, `is_called` state, or concurrency.
2. **Check 12 (Unindexed Foreign Keys)**:
   Check 12 identified 17 foreign-key columns that currently lack covering indexes. A migration script (`migrations/001_add_fk_covering_indexes.sql`) has been prepared as an optional, reversible performance optimization. In accordance with safety directives, this migration has **NOT** been applied to the live database and is documented as a performance recommendation.

---

## 6. How to Open and Verify Documentation Files

* **Word Documents (`.docx`)**: Open with Microsoft Word 2016+, LibreOffice Writer, or Google Docs. All tables, callout blocks, and embedded figures will render natively.
* **PDF Documents (`.pdf`)**: Open with Adobe Acrobat Reader, Google Chrome, Microsoft Edge, or any standard PDF viewer. Both PDF documents include custom headers and running footers with dynamic page counts (`Page X of Y`).
* **Diagram Images (`.png`)**: High-resolution 300 DPI raster images ready for inclusion in project slides, posters, or printouts.
* **Diagram Source Files (`.mmd`, `.puml`)**: Can be viewed or edited using Visual Studio Code extensions (e.g., *Mermaid Preview*, *PlantUML*) or online at [mermaid.live](https://mermaid.live).

---
*Generated by Antigravity Senior Software Documentation & Database Analyst Agent.*

