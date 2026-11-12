-- ==============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- SCRIPT: encoding_audit_and_fix.sql
-- PURPOSE:
--   1. Audit database server encoding, client encoding, and character collation.
--   2. Inspect text literals at the raw byte/hex level to detect whether
--      mojibake is stored in the database or caused by terminal OEM code pages.
--   3. Safely repair confirmed literal mojibake without modifying unaffected rows.
--   4. Provide verification queries demonstrating clean human-readable output.
--
-- TARGET DATABASE: skillbridge_db (PostgreSQL 18.6)
-- SAFETY RULES:
--   * NO TRUNCATE, NO DROP TABLE, NO ALTER TABLE.
--   * Strict WHERE conditions targeting only affected records by Primary Key.
--   * Full transaction control (BEGIN ... COMMIT) with explicit safety rollback.
-- ==============================================================================

-- Ensure the psql client communicates in UTF-8
SET client_encoding = 'UTF8';

-- ==============================================================================
-- PART 1: DATABASE ENVIRONMENT & ENCODING DIAGNOSTIC (READ-ONLY)
-- ==============================================================================
SELECT
    '--- PART 1: DATABASE ENCODING SETTINGS ---' AS diagnostic_phase;

SELECT
    d.datname AS database_name,
    pg_encoding_to_char(d.encoding) AS server_encoding,
    d.datcollate AS database_collation,
    d.datctype AS database_ctype,
    current_setting('client_encoding') AS active_client_encoding,
    version() AS postgresql_version
FROM pg_database d
WHERE d.datname = current_database();

-- ==============================================================================
-- PART 2: DEEP BYTE-LEVEL & HEX INSPECTION OF CANDIDATE TABLES
-- ==============================================================================
-- Explanation of Mojibake Diagnosis:
--   Case 1 (Terminal OEM Mismatch - Data is Clean):
--     Database stores valid UTF-8 em-dash '—' (Hex: E28094) or en-dash '–' (Hex: E28093).
--     Windows CMD running OEM CP850/CP437 displays E2 80 94 as 'ÔÇö' and E2 80 93 as 'ÔÇô'.
--     Diagnosis: DATA_CLEAN_TERMINAL_OEM_MISMATCH. Solution: Execute 'chcp 65001' in CMD.
--
--   Case 2 (Stored Literal Mojibake - Data is Corrupted):
--     Database literally stores the characters 'ÔÇö' (Hex: C394C387C3B6) or 'ÔÇô' (Hex: C394C387C3B4).
--     Diagnosis: STORED_MOJIBAKE_DEFECT. Solution: Apply Part 3 targeted repair.
-- ==============================================================================

SELECT
    '--- PART 2: CANDIDATE COLUMN BYTE INSPECTION ---' AS diagnostic_phase;

-- 2.1 Check certifications (cert_id = 1)
SELECT
    'certifications' AS table_name,
    certification_id AS record_id,
    'certification_name' AS column_name,
    certification_name AS display_value,
    char_length(certification_name) AS char_len,
    octet_length(certification_name) AS byte_len,
    encode(certification_name::bytea, 'hex') AS raw_hex,
    CASE
        WHEN certification_name LIKE '%ÔÇö%' OR certification_name LIKE '%ÔÇô%' OR certification_name LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN certification_name LIKE '%—%' OR certification_name LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN certification_name LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM certifications
WHERE certification_id = 1;

-- 2.2 Check user_experiences (experience_id = 2)
SELECT
    'user_experiences' AS table_name,
    experience_id AS record_id,
    'organization_name' AS column_name,
    organization_name AS display_value,
    char_length(organization_name) AS char_len,
    octet_length(organization_name) AS byte_len,
    encode(organization_name::bytea, 'hex') AS raw_hex,
    CASE
        WHEN organization_name LIKE '%ÔÇö%' OR organization_name LIKE '%ÔÇô%' OR organization_name LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN organization_name LIKE '%—%' OR organization_name LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN organization_name LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM user_experiences
WHERE experience_id = 2;

-- 2.3 Check career_gap_items (gap_item_id IN (1, 2, 4, 5, 6, 8, 9))
SELECT
    'career_gap_items' AS table_name,
    gap_item_id AS record_id,
    'current_state' AS column_name,
    current_state AS display_value,
    char_length(current_state) AS char_len,
    octet_length(current_state) AS byte_len,
    encode(current_state::bytea, 'hex') AS raw_hex,
    CASE
        WHEN current_state LIKE '%ÔÇö%' OR current_state LIKE '%ÔÇô%' OR current_state LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN current_state LIKE '%—%' OR current_state LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN current_state LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM career_gap_items
WHERE gap_item_id IN (1, 8, 9)

UNION ALL

SELECT
    'career_gap_items' AS table_name,
    gap_item_id AS record_id,
    'gap_description' AS column_name,
    gap_description AS display_value,
    char_length(gap_description) AS char_len,
    octet_length(gap_description) AS byte_len,
    encode(gap_description::bytea, 'hex') AS raw_hex,
    CASE
        WHEN gap_description LIKE '%ÔÇö%' OR gap_description LIKE '%ÔÇô%' OR gap_description LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN gap_description LIKE '%—%' OR gap_description LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN gap_description LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM career_gap_items
WHERE gap_item_id IN (2, 4, 5, 6)
ORDER BY record_id, column_name;

-- 2.4 Check learning_resources (resource_id IN (2, 4, 6))
SELECT
    'learning_resources' AS table_name,
    resource_id AS record_id,
    'resource_name' AS column_name,
    resource_name AS display_value,
    char_length(resource_name) AS char_len,
    octet_length(resource_name) AS byte_len,
    encode(resource_name::bytea, 'hex') AS raw_hex,
    CASE
        WHEN resource_name LIKE '%ÔÇö%' OR resource_name LIKE '%ÔÇô%' OR resource_name LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN resource_name LIKE '%—%' OR resource_name LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN resource_name LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM learning_resources
WHERE resource_id IN (2, 4, 6)
ORDER BY resource_id;

-- 2.5 Check assessment_results (result_id = 5)
SELECT
    'assessment_results' AS table_name,
    result_id AS record_id,
    'notes' AS column_name,
    notes AS display_value,
    char_length(notes) AS char_len,
    octet_length(notes) AS byte_len,
    encode(notes::bytea, 'hex') AS raw_hex,
    CASE
        WHEN notes LIKE '%ÔÇö%' OR notes LIKE '%ÔÇô%' OR notes LIKE '%â€%'
            THEN 'CORRUPTED_STORED_MOJIBAKE'
        WHEN notes LIKE '%—%' OR notes LIKE '%–%'
            THEN 'VALID_UTF8_UNICODE_DASH'
        WHEN notes LIKE '% - %'
            THEN 'ASCII_STANDARD_DASH'
        ELSE 'OTHER_ENCODING'
    END AS diagnosis
FROM assessment_results
WHERE result_id = 5;

-- 2.6 Overall Mojibake Scan across all candidate columns
SELECT
    '--- OVERALL CORRUPTION SUMMARY SCAN ---' AS diagnostic_phase;

WITH candidate_counts AS (
    SELECT
        'certifications' AS table_name,
        count(*) FILTER (WHERE certification_name LIKE '%ÔÇö%' OR certification_name LIKE '%ÔÇô%' OR certification_name LIKE '%â€%') AS stored_mojibake_rows,
        count(*) FILTER (WHERE certification_name LIKE '%—%' OR certification_name LIKE '%–%') AS valid_unicode_dash_rows
    FROM certifications
    UNION ALL
    SELECT
        'user_experiences',
        count(*) FILTER (WHERE organization_name LIKE '%ÔÇö%' OR organization_name LIKE '%ÔÇô%' OR organization_name LIKE '%â€%'),
        count(*) FILTER (WHERE organization_name LIKE '%—%' OR organization_name LIKE '%–%')
    FROM user_experiences
    UNION ALL
    SELECT
        'career_gap_items',
        count(*) FILTER (
            current_state LIKE '%ÔÇö%' OR current_state LIKE '%ÔÇô%' OR current_state LIKE '%â€%' OR
            required_state LIKE '%ÔÇö%' OR required_state LIKE '%ÔÇô%' OR required_state LIKE '%â€%' OR
            gap_description LIKE '%ÔÇö%' OR gap_description LIKE '%ÔÇô%' OR gap_description LIKE '%â€%'
        ),
        count(*) FILTER (
            current_state LIKE '%—%' OR current_state LIKE '%–%' OR
            required_state LIKE '%—%' OR required_state LIKE '%–%' OR
            gap_description LIKE '%—%' OR gap_description LIKE '%–%'
        )
    FROM career_gap_items
    UNION ALL
    SELECT
        'learning_resources',
        count(*) FILTER (resource_name LIKE '%ÔÇö%' OR resource_name LIKE '%ÔÇô%' OR resource_name LIKE '%â€%'),
        count(*) FILTER (resource_name LIKE '%—%' OR resource_name LIKE '%–%')
    FROM learning_resources
    UNION ALL
    SELECT
        'assessment_results',
        count(*) FILTER (notes LIKE '%ÔÇö%' OR notes LIKE '%ÔÇô%' OR notes LIKE '%â€%'),
        count(*) FILTER (notes LIKE '%—%' OR notes LIKE '%–%')
    FROM assessment_results
)
SELECT
    table_name,
    stored_mojibake_rows,
    valid_unicode_dash_rows,
    CASE
        WHEN stored_mojibake_rows > 0 THEN 'REPAIR NEEDED: Stored data contains corrupted mojibake bytes'
        WHEN valid_unicode_dash_rows > 0 THEN 'NO REPAIR NEEDED: Data is clean UTF-8. Set "chcp 65001" in Windows CMD.'
        ELSE 'ASCII CLEAN: No multi-byte dashes found'
    END AS status_assessment
FROM candidate_counts;

-- ==============================================================================
-- PART 3: TARGETED TRANSACTIONAL REPAIR
-- ==============================================================================
-- Instructions:
--   This transaction performs targeted repairs ONLY if literal mojibake is present.
--   If the rows already contain clean UTF-8 dashes or ASCII hyphens,
--   the WHERE conditions will safely match 0 rows and make no changes.
-- ==============================================================================

BEGIN;

-- 3.1 Repair certifications
UPDATE certifications
SET certification_name = REPLACE(REPLACE(REPLACE(REPLACE(
        certification_name,
        'ÔÇö', '—'),
        'ÔÇô', '–'),
        'â€”', '—'),
        'â€“', '–')
WHERE certification_name LIKE '%ÔÇö%'
   OR certification_name LIKE '%ÔÇô%'
   OR certification_name LIKE '%â€%';

-- 3.2 Repair user_experiences
UPDATE user_experiences
SET organization_name = REPLACE(REPLACE(REPLACE(REPLACE(
        organization_name,
        'ÔÇö', '—'),
        'ÔÇô', '–'),
        'â€”', '—'),
        'â€“', '–')
WHERE organization_name LIKE '%ÔÇö%'
   OR organization_name LIKE '%ÔÇô%'
   OR organization_name LIKE '%â€%';

-- 3.3 Repair career_gap_items (current_state, required_state, gap_description)
UPDATE career_gap_items
SET
    current_state = CASE
        WHEN current_state LIKE '%ÔÇö%' OR current_state LIKE '%ÔÇô%' OR current_state LIKE '%â€%'
        THEN REPLACE(REPLACE(REPLACE(REPLACE(current_state, 'ÔÇö', '—'), 'ÔÇô', '–'), 'â€”', '—'), 'â€“', '–')
        ELSE current_state
    END,
    required_state = CASE
        WHEN required_state LIKE '%ÔÇö%' OR required_state LIKE '%ÔÇô%' OR required_state LIKE '%â€%'
        THEN REPLACE(REPLACE(REPLACE(REPLACE(required_state, 'ÔÇö', '—'), 'ÔÇô', '–'), 'â€”', '—'), 'â€“', '–')
        ELSE required_state
    END,
    gap_description = CASE
        WHEN gap_description LIKE '%ÔÇö%' OR gap_description LIKE '%ÔÇô%' OR gap_description LIKE '%â€%'
        THEN REPLACE(REPLACE(REPLACE(REPLACE(gap_description, 'ÔÇö', '—'), 'ÔÇô', '–'), 'â€”', '—'), 'â€“', '–')
        ELSE gap_description
    END
WHERE current_state LIKE '%ÔÇö%' OR current_state LIKE '%ÔÇô%' OR current_state LIKE '%â€%'
   OR required_state LIKE '%ÔÇö%' OR required_state LIKE '%ÔÇô%' OR required_state LIKE '%â€%'
   OR gap_description LIKE '%ÔÇö%' OR gap_description LIKE '%ÔÇô%' OR gap_description LIKE '%â€%';

-- 3.4 Repair learning_resources
UPDATE learning_resources
SET resource_name = REPLACE(REPLACE(REPLACE(REPLACE(
        resource_name,
        'ÔÇö', '—'),
        'ÔÇô', '–'),
        'â€”', '—'),
        'â€“', '–')
WHERE resource_name LIKE '%ÔÇö%'
   OR resource_name LIKE '%ÔÇô%'
   OR resource_name LIKE '%â€%';

-- 3.5 Repair assessment_results
UPDATE assessment_results
SET notes = REPLACE(REPLACE(REPLACE(REPLACE(
        notes,
        'ÔÇö', '—'),
        'ÔÇô', '–'),
        'â€”', '—'),
        'â€“', '–')
WHERE notes LIKE '%ÔÇö%'
   OR notes LIKE '%ÔÇô%'
   OR notes LIKE '%â€%';

COMMIT;

-- ==============================================================================
-- PART 4: POST-REPAIR VERIFICATION QUERIES
-- ==============================================================================
-- Displays the updated records to confirm proper rendering in a UTF-8 client.
-- ==============================================================================

SELECT
    '--- PART 4: POST-REPAIR VERIFICATION ---' AS verification_phase;

SELECT
    'certifications' AS table_name,
    certification_id AS id,
    certification_name AS cleaned_text,
    char_length(certification_name) AS char_len,
    octet_length(certification_name) AS byte_len
FROM certifications
WHERE certification_id = 1

UNION ALL

SELECT
    'user_experiences' AS table_name,
    experience_id AS id,
    organization_name AS cleaned_text,
    char_length(organization_name) AS char_len,
    octet_length(organization_name) AS byte_len
FROM user_experiences
WHERE experience_id = 2

UNION ALL

SELECT
    'career_gap_items (current_state)' AS table_name,
    gap_item_id AS id,
    current_state AS cleaned_text,
    char_length(current_state) AS char_len,
    octet_length(current_state) AS byte_len
FROM career_gap_items
WHERE gap_item_id = 1

UNION ALL

SELECT
    'learning_resources' AS table_name,
    resource_id AS id,
    resource_name AS cleaned_text,
    char_length(resource_name) AS char_len,
    octet_length(resource_name) AS byte_len
FROM learning_resources
WHERE resource_id IN (2, 4, 6)

UNION ALL

SELECT
    'assessment_results' AS table_name,
    result_id AS id,
    notes AS cleaned_text,
    char_length(notes) AS char_len,
    octet_length(notes) AS byte_len
FROM assessment_results
WHERE result_id = 5
ORDER BY table_name, id;

-- ==============================================================================
-- OPTIONAL ASCII NORMALIZATION (ALTERNATIVE SAFE MODE)
-- ==============================================================================
-- If you run psql across heterogeneous terminals (Windows PowerShell, CMD, SSH)
-- without guaranteed UTF-8 console fonts, replacing typographical dashes with
-- standard ASCII ' - ' ensures flawless rendering on ANY machine without codepage tweaks.
-- To apply ASCII normalization, uncomment the block below and execute:
--
-- BEGIN;
-- UPDATE certifications SET certification_name = REPLACE(REPLACE(certification_name, '—', ' - '), '–', ' - ') WHERE certification_id = 1;
-- UPDATE user_experiences SET organization_name = REPLACE(REPLACE(organization_name, '—', ' - '), '–', ' - ') WHERE experience_id = 2;
-- UPDATE career_gap_items SET current_state = REPLACE(REPLACE(current_state, '—', ' - '), '–', ' - '), required_state = REPLACE(REPLACE(required_state, '—', ' - '), '–', ' - '), gap_description = REPLACE(REPLACE(gap_description, '—', ' - '), '–', ' - ') WHERE gap_item_id IN (1, 2, 4, 5, 6, 8, 9);
-- UPDATE learning_resources SET resource_name = REPLACE(REPLACE(resource_name, '—', ' - '), '–', ' - ') WHERE resource_id IN (2, 4, 6);
-- UPDATE assessment_results SET notes = REPLACE(REPLACE(notes, '—', ' - '), '–', ' - ') WHERE result_id = 5;
-- COMMIT;
-- ==============================================================================

