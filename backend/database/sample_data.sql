-- ============================================================================
-- SkillBridge AI — Universal Career Gap Tracker
-- Sample Data (sample_data.sql)
--
-- Version : 1.0
-- Date    : 2026-10-31
--
-- Description:
--   Realistic, diverse sample data that demonstrates the system working across
--   multiple career fields — IT, Healthcare, Finance, Teaching, and Engineering.
--   Data is set in an Indian context with three users pursuing different goals.
--
-- Users:
--   1. Priya Sharma  — B.Tech CS grad targeting Full-Stack Developer
--   2. Rahul Verma   — BSc Nursing grad targeting Registered Nurse (had a break)
--   3. Ananya Desai  — B.Com grad targeting Chartered Accountant
--
-- Insert order follows foreign-key dependencies (parents before children).
-- ============================================================================

BEGIN;

-- Ensure consistent UTF-8 client encoding
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1. USERS
-- ============================================================================

INSERT INTO users (user_id, email, full_name, phone, country, state_or_region, date_of_birth)
VALUES
    (1, 'priya.sharma@email.com',  'Priya Sharma',  '+91-9876543210', 'India', 'Karnataka',    '1999-06-15'),
    (2, 'rahul.verma@email.com',   'Rahul Verma',   '+91-9123456789', 'India', 'Maharashtra',  '1997-03-22'),
    (3, 'ananya.desai@email.com',  'Ananya Desai',  '+91-9988776655', 'India', 'Gujarat',      '2000-11-08');


-- ============================================================================
-- 2. CAREER FIELDS  (5 rows)
-- ============================================================================

INSERT INTO career_fields (field_id, field_name, description)
VALUES
    (1, 'Information Technology',          'Software development, data science, IT infrastructure, and related tech roles.'),
    (2, 'Healthcare and Medical',          'Clinical care, nursing, pharmacy, allied health, and medical practice.'),
    (3, 'Commerce Accounting and Finance', 'Accounting, auditing, taxation, financial planning, and banking.'),
    (4, 'Teaching and Education',          'School teaching, higher education, curriculum design, and educational administration.'),
    (5, 'Engineering',                     'Civil, mechanical, electrical, and other branches of engineering practice.');


-- ============================================================================
-- 3. SKILLS  (18 rows — mix across ALL fields)
-- ============================================================================

INSERT INTO skills (skill_id, skill_name, category, description)
VALUES
    -- IT skills
    (1,  'Python',                  'Programming',    'General-purpose programming language widely used in web dev, data science, and automation.'),
    (2,  'SQL',                     'Programming',    'Structured Query Language for relational database management and querying.'),
    (3,  'React',                   'Programming',    'JavaScript library for building user interfaces and single-page applications.'),
    (4,  'Cloud Computing',         'Infrastructure', 'Deploying and managing applications on cloud platforms like AWS, Azure, or GCP.'),

    -- Healthcare skills
    (5,  'Patient Assessment',      'Clinical',       'Systematic evaluation of a patient''s physical and psychological condition.'),
    (6,  'Clinical Documentation',  'Clinical',       'Accurate recording of patient encounters, treatments, and outcomes.'),
    (7,  'Pharmacology',            'Clinical',       'Knowledge of drug actions, interactions, dosages, and administration.'),

    -- Finance skills
    (8,  'Financial Modeling',      'Analytical',     'Building mathematical models to represent a company''s financial performance.'),
    (9,  'Tax Compliance',          'Regulatory',     'Ensuring adherence to income tax, GST, and other taxation regulations.'),
    (10, 'Auditing',                'Regulatory',     'Systematic examination and verification of financial records and statements.'),

    -- Teaching skills
    (11, 'Curriculum Design',       'Pedagogical',    'Designing structured learning programs aligned with educational standards.'),
    (12, 'Classroom Management',    'Pedagogical',    'Techniques for maintaining an effective and productive learning environment.'),

    -- Cross-field / soft skills
    (13, 'Communication',           'Soft Skill',     'Clear and effective verbal and written communication in professional settings.'),
    (14, 'Data Analysis',           'Analytical',     'Collecting, cleaning, and interpreting data to support decision-making.'),
    (15, 'Project Management',      'Management',     'Planning, executing, and closing projects within scope, time, and budget.'),
    (16, 'Critical Thinking',       'Soft Skill',     'Objective analysis and evaluation of information to form reasoned judgments.'),

    -- Additional engineering skill
    (17, 'AutoCAD',                 'Engineering',    'Computer-aided design software for 2D and 3D drafting in engineering.'),
    (18, 'Structural Analysis',     'Engineering',    'Evaluating load-bearing capacity and stability of structures.');


-- ============================================================================
-- 4. QUALIFICATION TYPES  (8 rows)
-- ============================================================================

INSERT INTO qualification_types (qualification_type_id, type_name, level_rank, description)
VALUES
    (1, 'High School Diploma',        1, 'Secondary education (Class 10/12) completion certificate.'),
    (2, 'ITI Certificate',            2, 'Industrial Training Institute vocational certificate.'),
    (3, 'Professional Diploma',       3, 'Specialized diploma in a professional or technical field.'),
    (4, 'Associate''s Degree',        4, 'Two-year undergraduate degree or equivalent.'),
    (5, 'Bachelor''s Degree',         5, 'Standard three- or four-year undergraduate degree (BA, BSc, B.Tech, B.Com, etc.).'),
    (6, 'Master''s Degree',           6, 'Postgraduate degree (MA, MSc, M.Tech, MBA, etc.).'),
    (7, 'Medical Degree (MD/MBBS)',   7, 'Professional medical degree (MBBS, MD, BDS, etc.).'),
    (8, 'Doctoral Degree (PhD)',      8, 'Highest academic research degree.');


-- ============================================================================
-- 5. CAREER ROLES  (5 roles across different fields)
-- ============================================================================

INSERT INTO career_roles (role_id, field_id, role_title, description, jurisdiction, experience_years_required)
VALUES
    (1, 1, 'Full-Stack Developer',      'Designs, develops, and maintains both front-end and back-end of web applications.',                 'India', 1.0),
    (2, 2, 'Registered Nurse',          'Provides patient care, administers medications, and collaborates with healthcare teams.',            'India', 0.5),
    (3, 3, 'Chartered Accountant',      'Performs auditing, taxation, financial advisory, and ensures regulatory compliance.',                'India', 3.0),
    (4, 4, 'Secondary School Teacher',  'Teaches students in classes 9-12, designs lesson plans, and evaluates student progress.',            'India', 0.0),
    (5, 5, 'Civil Engineer',            'Plans, designs, and oversees construction of infrastructure projects such as roads and buildings.',  'India', 2.0);


-- ============================================================================
-- 6. CERTIFICATIONS  (6 rows)
-- ============================================================================

INSERT INTO certifications (certification_id, certification_name, issuing_body, field_id, description)
VALUES
    (1, 'AWS Solutions Architect – Associate',  'Amazon Web Services',                     1, 'Validates ability to design distributed systems on the AWS platform.'),
    (2, 'Registered Nurse License',             'Indian Nursing Council',                  2, 'Mandatory license to practice nursing in India.'),
    (3, 'Chartered Accountancy (CA)',            'Institute of Chartered Accountants of India (ICAI)', 3, 'Professional accounting qualification recognized across India.'),
    (4, 'CTET (Central Teacher Eligibility Test)', 'Central Board of Secondary Education (CBSE)', 4, 'National-level eligibility test for teaching positions in Indian schools.'),
    (5, 'Professional Engineer License',        'Institution of Engineers India',           5, 'Professional license for practising engineers in India.'),
    (6, 'Google Data Analytics Certificate',    'Google / Coursera',                       NULL, 'Cross-field certificate covering data analysis fundamentals and tools.');


-- ============================================================================
-- 7. EDUCATION RECORDS  (6 rows — 2 per user)
-- ============================================================================

-- Priya Sharma: Class 12 + B.Tech in Computer Science
INSERT INTO education_records (education_id, user_id, qualification_type_id, field_of_study, institution_name, start_date, end_date, status, grade_or_score)
VALUES
    (1, 1, 1, 'Science (PCM)',      'Delhi Public School, Bangalore',              '2015-06-01', '2017-05-31', 'completed', '92%'),
    (2, 1, 5, 'Computer Science',   'PES University, Bangalore',                   '2017-08-01', '2021-06-30', 'completed', '8.7 CGPA');

-- Rahul Verma: Class 12 + BSc Nursing
INSERT INTO education_records (education_id, user_id, qualification_type_id, field_of_study, institution_name, start_date, end_date, status, grade_or_score)
VALUES
    (3, 2, 1, 'Science (PCB)',      'Kendriya Vidyalaya, Pune',                    '2013-06-01', '2015-05-31', 'completed', '85%'),
    (4, 2, 5, 'Nursing',            'Armed Forces Medical College (AFMC), Pune',   '2015-08-01', '2019-06-30', 'completed', 'First Class');

-- Ananya Desai: Class 12 + B.Com
INSERT INTO education_records (education_id, user_id, qualification_type_id, field_of_study, institution_name, start_date, end_date, status, grade_or_score)
VALUES
    (5, 3, 1, 'Commerce',           'St. Xavier''s High School, Ahmedabad',        '2016-06-01', '2018-05-31', 'completed', '88%'),
    (6, 3, 5, 'Commerce',           'H.L. College of Commerce, Ahmedabad',         '2018-07-01', '2021-04-30', 'completed', '7.9 CGPA');


-- ============================================================================
-- 8. USER SKILLS  (3-5 skills per user at varying proficiency levels)
-- ============================================================================

-- Priya Sharma (IT-oriented skills)
INSERT INTO user_skills (user_skill_id, user_id, skill_id, proficiency_level, years_of_experience, evidence, last_used_date)
VALUES
    (1,  1, 1,  'intermediate', 2.0, 'Built a Django REST API for a college project and personal portfolio.',     '2026-10-01'),
    (2,  1, 2,  'intermediate', 1.5, 'Completed multiple SQL assignments; designed a normalized database.',       '2026-09-15'),
    (3,  1, 3,  'beginner',     0.5, 'Completed a React tutorial on Udemy; built a simple to-do app.',            '2026-08-20'),
    (4,  1, 14, 'beginner',     0.5, 'Used Pandas for a data analysis mini-project in college.',                  '2026-07-10'),
    (5,  1, 13, 'intermediate', 3.0, 'Presented papers at two college symposiums; active in debate club.',        '2026-10-15');

-- Rahul Verma (Healthcare-oriented skills)
INSERT INTO user_skills (user_skill_id, user_id, skill_id, proficiency_level, years_of_experience, evidence, last_used_date)
VALUES
    (6,  2, 5,  'advanced',     3.5, 'Performed patient assessments daily during 3.5 years of hospital duty.',   '2024-01-15'),
    (7,  2, 6,  'intermediate', 3.0, 'Maintained accurate clinical records for 60+ patients on a medical ward.', '2024-01-15'),
    (8,  2, 7,  'intermediate', 2.5, 'Administered medications and monitored drug interactions during shifts.',   '2024-01-10'),
    (9,  2, 13, 'intermediate', 3.5, 'Communicated regularly with patients, families, and interdisciplinary teams.', '2024-01-15');

-- Ananya Desai (Finance-oriented skills)
INSERT INTO user_skills (user_skill_id, user_id, skill_id, proficiency_level, years_of_experience, evidence, last_used_date)
VALUES
    (10, 3, 8,  'beginner',     0.5, 'Created basic financial models in Excel for college coursework.',          '2026-09-01'),
    (11, 3, 9,  'beginner',     0.3, 'Studied Income Tax Act during B.Com; completed a short tax filing project.', '2026-08-15'),
    (12, 3, 10, 'beginner',     0.2, 'Introductory auditing course in B.Com final year.',                        '2026-06-01'),
    (13, 3, 14, 'intermediate', 1.0, 'Used Excel and basic Python for financial data analysis during internship.', '2026-10-01'),
    (14, 3, 13, 'intermediate', 2.0, 'Coordinated college commerce festival; presented at inter-college seminars.', '2026-09-20');


-- ============================================================================
-- 9. USER EXPERIENCES  (1-2 per user with varying types)
-- ============================================================================

INSERT INTO user_experiences (experience_id, user_id, job_title, organization_name, experience_type, field_id, start_date, end_date, description)
VALUES
    -- Priya: 6-month internship at a startup
    (1, 1, 'Backend Developer Intern',    'ZapTech Solutions Pvt. Ltd., Bangalore', 'internship', 1,
         '2021-07-01', '2021-12-31',
         'Developed REST APIs using Python/Django. Wrote SQL queries for reporting dashboards. Participated in code reviews.'),

    -- Priya: volunteer open-source contribution
    (2, 1, 'Open Source Contributor',      'Mozilla Firefox — Good First Bugs',     'volunteer',  1,
         '2022-03-01', '2022-08-31',
         'Fixed 5 front-end bugs and contributed documentation. Learned React basics through the codebase.'),

    -- Rahul: full-time nursing position before his break
    (3, 2, 'Staff Nurse',                  'Ruby Hall Clinic, Pune',                'full_time',  2,
         '2019-08-01', '2024-01-15',
         'Provided bedside care in the general medicine ward. Managed a caseload of 15-20 patients per shift. Trained 3 junior nurses.'),

    -- Ananya: accounting internship
    (4, 3, 'Accounts Intern',              'Deloitte India, Ahmedabad',             'internship', 3,
         '2021-05-01', '2021-08-31',
         'Assisted in statutory audit of two mid-sized manufacturing firms. Reconciled ledgers and prepared working papers.');


-- ============================================================================
-- 10. USER CERTIFICATIONS  (1-2 per user; Ananya has one "in_progress")
-- ============================================================================

INSERT INTO user_certifications (user_certification_id, user_id, certification_id, date_obtained, expiry_date, credential_id, status)
VALUES
    -- Priya: Google Data Analytics Certificate (completed)
    (1, 1, 6, '2026-04-15', NULL, 'GDAC-2026-PS-4821', 'active'),

    -- Rahul: Registered Nurse License (active)
    (2, 2, 2, '2019-09-01', '2029-08-31', 'INC-RN-MH-20190901', 'active'),

    -- Ananya: Chartered Accountancy — currently in progress
    (3, 3, 3, NULL, NULL, NULL, 'in_progress'),

    -- Ananya: Google Data Analytics Certificate (completed)
    (4, 3, 6, '2026-02-10', NULL, 'GDAC-2026-AD-3317', 'active');


-- ============================================================================
-- 11. CAREER BREAKS  (Rahul — 1-year health-related break)
-- ============================================================================

INSERT INTO career_breaks (break_id, user_id, break_reason, start_date, end_date, description)
VALUES
    (1, 2, 'health', '2024-01-16', '2025-01-15',
     'Took a one-year break for surgery and recovery following a sports injury. Used the time to study for competitive nursing exams and stay updated with clinical guidelines.');


-- ============================================================================
-- 12. CAREER GOALS  (1 per user)
-- ============================================================================

INSERT INTO career_goals (goal_id, user_id, role_id, priority, target_date, status, notes)
VALUES
    (1, 1, 1, 1, '2027-06-30', 'active',    'Want to become a full-stack developer at a product-based company.'),
    (2, 2, 2, 1, '2027-06-30', 'active',    'Return to nursing after career break and get placed in a multi-speciality hospital.'),
    (3, 3, 3, 1, '2028-12-31', 'exploring', 'Clear all CA exams and complete articleship to become a practising Chartered Accountant.');


-- ============================================================================
-- 13. CAREER REQUIREMENTS  (4-6 per role)
-- ============================================================================

-- ----- Full-Stack Developer (role_id = 1) -----
INSERT INTO career_requirements (requirement_id, role_id, requirement_type, skill_id, qualification_type_id, certification_id, expected_proficiency, description, is_mandatory, priority)
VALUES
    (1,  1, 'skill',         1,    NULL, NULL, 'intermediate', 'Proficiency in Python or another backend language.',                      TRUE,  1),
    (2,  1, 'skill',         3,    NULL, NULL, 'intermediate', 'Proficiency in React or a comparable front-end framework.',               TRUE,  1),
    (3,  1, 'skill',         2,    NULL, NULL, 'intermediate', 'Ability to design and query relational databases with SQL.',              TRUE,  2),
    (4,  1, 'education',     NULL, 5,    NULL, NULL,           'Bachelor''s degree in Computer Science or related field (or equivalent).', FALSE, 3),
    (5,  1, 'certification', NULL, NULL, 1,    NULL,           'AWS Solutions Architect certification (preferred, not mandatory).',        FALSE, 4),
    (6,  1, 'experience',    NULL, NULL, NULL, NULL,           'At least 1 year of professional or internship experience in software development.', TRUE, 2);

-- ----- Registered Nurse (role_id = 2) -----
INSERT INTO career_requirements (requirement_id, role_id, requirement_type, skill_id, qualification_type_id, certification_id, expected_proficiency, description, is_mandatory, priority)
VALUES
    (7,  2, 'skill',         5,    NULL, NULL, 'advanced',     'Advanced patient assessment skills for clinical nursing practice.',       TRUE,  1),
    (8,  2, 'skill',         7,    NULL, NULL, 'intermediate', 'Working knowledge of pharmacology for safe medication administration.',   TRUE,  1),
    (9,  2, 'education',     NULL, 5,    NULL, NULL,           'BSc Nursing or equivalent nursing degree.',                              TRUE,  1),
    (10, 2, 'certification', NULL, NULL, 2,    NULL,           'Active Registered Nurse license issued by the Indian Nursing Council.',  TRUE,  1),
    (11, 2, 'experience',    NULL, NULL, NULL, NULL,           'Minimum 6 months of clinical experience in a hospital setting.',         TRUE,  2);

-- ----- Chartered Accountant (role_id = 3) -----
INSERT INTO career_requirements (requirement_id, role_id, requirement_type, skill_id, qualification_type_id, certification_id, expected_proficiency, description, is_mandatory, priority)
VALUES
    (12, 3, 'certification', NULL, NULL, 3,    NULL,           'Must hold the Chartered Accountancy (CA) qualification from ICAI.',      TRUE,  1),
    (13, 3, 'skill',         10,   NULL, NULL, 'advanced',     'Advanced auditing skills for statutory and internal audits.',             TRUE,  1),
    (14, 3, 'skill',         9,    NULL, NULL, 'advanced',     'Deep knowledge of Indian tax laws including Income Tax and GST.',        TRUE,  1),
    (15, 3, 'education',     NULL, 5,    NULL, NULL,           'Bachelor''s degree in Commerce or equivalent.',                          TRUE,  2),
    (16, 3, 'experience',    NULL, NULL, NULL, NULL,           'Three years of articleship under a practising CA.',                      TRUE,  1),
    (17, 3, 'eligibility',   NULL, NULL, NULL, NULL,           'Must be a member of ICAI after clearing all three levels of CA exams.',  TRUE,  1);

-- ----- Secondary School Teacher (role_id = 4) -----
INSERT INTO career_requirements (requirement_id, role_id, requirement_type, skill_id, qualification_type_id, certification_id, expected_proficiency, description, is_mandatory, priority)
VALUES
    (18, 4, 'skill',         12,   NULL, NULL, 'intermediate', 'Classroom management techniques for effective teaching.',                TRUE,  1),
    (19, 4, 'skill',         11,   NULL, NULL, 'intermediate', 'Ability to design lesson plans and curriculum aligned with CBSE/state boards.', TRUE, 2),
    (20, 4, 'education',     NULL, 5,    NULL, NULL,           'Bachelor''s degree in the relevant subject area.',                       TRUE,  1),
    (21, 4, 'certification', NULL, NULL, 4,    NULL,           'CTET or State TET qualification for teaching eligibility.',              TRUE,  1),
    (22, 4, 'experience',    NULL, NULL, NULL, NULL,           'Student-teaching or prior classroom experience is preferred.',           FALSE, 3);

-- ----- Civil Engineer (role_id = 5) -----
INSERT INTO career_requirements (requirement_id, role_id, requirement_type, skill_id, qualification_type_id, certification_id, expected_proficiency, description, is_mandatory, priority)
VALUES
    (23, 5, 'skill',         17,   NULL, NULL, 'advanced',     'Advanced proficiency in AutoCAD for engineering design and drafting.',    TRUE,  1),
    (24, 5, 'skill',         18,   NULL, NULL, 'intermediate', 'Ability to perform structural analysis using standard engineering methods.', TRUE, 1),
    (25, 5, 'education',     NULL, 5,    NULL, NULL,           'B.Tech / BE in Civil Engineering from an AICTE-approved institution.',   TRUE,  1),
    (26, 5, 'certification', NULL, NULL, 5,    NULL,           'Professional Engineer License from Institution of Engineers India.',     FALSE, 3),
    (27, 5, 'experience',    NULL, NULL, NULL, NULL,           'Minimum 2 years of site or design experience in civil engineering.',     TRUE,  2);


-- ============================================================================
-- 14. GAP TYPES  (7 standard types)
-- ============================================================================

INSERT INTO gap_types (gap_type_id, type_name, description)
VALUES
    (1, 'Skill Gap',             'User lacks a required skill or has insufficient proficiency level.'),
    (2, 'Education Gap',         'User does not meet the minimum education/qualification requirement.'),
    (3, 'Experience Gap',        'User lacks the required type or duration of professional experience.'),
    (4, 'Certification Gap',     'User is missing a required or preferred certification or license.'),
    (5, 'Eligibility Gap',       'User does not meet a regulatory, legal, or age-based eligibility criterion.'),
    (6, 'Career Break Impact',   'A career break may have caused skill decay or a gap in recent experience.'),
    (7, 'Other',                 'Any gap that does not fit the standard categories above.');


-- ============================================================================
-- 15. GAP ANALYSES  (1 per user)
-- ============================================================================

INSERT INTO career_gap_analyses (analysis_id, user_id, goal_id, analysis_date, overall_readiness_pct, summary_notes, status)
VALUES
    (1, 1, 1, '2026-10-30 10:00:00', 55.00,
     'Priya has a solid Python and SQL foundation but needs to strengthen React and gain cloud computing experience. Lacks professional full-time experience.',
     'completed'),

    (2, 2, 2, '2026-10-30 11:30:00', 70.00,
     'Rahul has strong clinical skills and a valid RN license. Main concern is the 1-year career break causing potential skill staleness. Needs refresher training.',
     'completed'),

    (3, 3, 3, '2026-10-30 14:00:00', 42.00,
     'Ananya has the educational foundation but is still clearing CA exams. Lacks articleship experience and advanced auditing/tax skills. Long road ahead.',
     'completed');


-- ============================================================================
-- 16. GAP ITEMS  (2-4 per analysis, varying severity and status)
-- ============================================================================

-- ----- Priya's gaps (analysis_id = 1) -----
INSERT INTO career_gap_items (gap_item_id, analysis_id, gap_type_id, requirement_id, gap_description, current_state, required_state, gap_severity, priority, status, review_date)
VALUES
    (1,  1, 1, 2,
     'React proficiency is below required level for a full-stack role.',
     'Beginner — completed one tutorial, built a basic to-do app.',
     'Intermediate — able to build production-ready SPAs with state management.',
     'high', 1, 'identified', '2027-01-15'),

    (2,  1, 4, 5,
     'Missing AWS Solutions Architect certification (preferred).',
     'No cloud certifications.',
     'AWS Solutions Architect – Associate certification.',
     'medium', 3, 'identified', '2027-04-01'),

    (3,  1, 3, 6,
     'Insufficient professional experience (only a 6-month internship).',
     '6 months of internship experience.',
     'At least 1 year of professional or internship experience.',
     'high', 2, 'in_progress', '2027-03-01');

-- ----- Rahul's gaps (analysis_id = 2) -----
INSERT INTO career_gap_items (gap_item_id, analysis_id, gap_type_id, requirement_id, gap_description, current_state, required_state, gap_severity, priority, status, review_date)
VALUES
    (4,  2, 6, NULL,
     'One-year career break may have caused clinical skill decay.',
     'Last clinical practice was January 2024 — nearly 2 years ago.',
     'Recent, active clinical experience within the last 6 months.',
     'high', 1, 'in_progress', '2026-12-01'),

    (5,  2, 1, 8,
     'Pharmacology knowledge may need updating after the break.',
     'Intermediate pharmacology — last practised in Jan 2024.',
     'Intermediate pharmacology with knowledge of latest drug protocols.',
     'medium', 2, 'identified', '2026-11-15');

-- ----- Ananya's gaps (analysis_id = 3) -----
INSERT INTO career_gap_items (gap_item_id, analysis_id, gap_type_id, requirement_id, gap_description, current_state, required_state, gap_severity, priority, status, review_date)
VALUES
    (6,  3, 4, 12,
     'CA qualification is still in progress — must clear all three levels of exams.',
     'Currently preparing for CA Intermediate exams.',
     'Must hold the full Chartered Accountancy (CA) qualification from ICAI.',
     'critical', 1, 'in_progress', '2027-06-01'),

    (7,  3, 3, 16,
     'Has not started the mandatory 3-year articleship under a practising CA.',
     'No articleship experience.',
     'Three years of articleship under a practising CA.',
     'critical', 1, 'identified', '2027-01-01'),

    (8,  3, 1, 14,
     'Tax compliance knowledge is at beginner level; advanced level required.',
     'Beginner — studied Income Tax Act during B.Com.',
     'Advanced — deep working knowledge of Income Tax, GST, and corporate tax.',
     'high', 2, 'identified', '2027-03-01'),

    (9,  3, 1, 13,
     'Auditing skills are at beginner level; advanced level required for CA practice.',
     'Beginner — introductory auditing course in B.Com.',
     'Advanced — capable of performing statutory and internal audits independently.',
     'high', 2, 'identified', '2027-06-01');


-- ============================================================================
-- 17. LEARNING RESOURCES  (6 resources)
-- ============================================================================

INSERT INTO learning_resources (resource_id, resource_name, resource_type, provider, url, estimated_duration_hours, cost, description)
VALUES
    (1, 'The Complete React Developer Course',
     'course', 'Udemy', 'https://www.udemy.com/course/react-developer/', 40.0, 499.00,
     'Comprehensive React course covering hooks, Redux, testing, and deployment. Suitable for beginners to intermediate.'),

    (2, 'AWS Certified Solutions Architect – Associate Preparation',
     'certification_program', 'Coursera / AWS', 'https://www.coursera.org/professional-certificates/aws-cloud-solutions-architect', 80.0, 3999.00,
     'Official AWS preparation course covering cloud architecture, security, and best practices.'),

    (3, 'Pharmacology Refresher for Nurses',
     'course', 'Khan Academy', 'https://www.khanacademy.org/science/health-and-medicine', 25.0, 0.00,
     'Free refresher covering essential pharmacology concepts, drug interactions, and latest protocols.'),

    (4, 'ICAI Study Material — CA Intermediate',
     'book', 'ICAI', 'https://www.icai.org/post/study-material', 300.0, 2500.00,
     'Official ICAI study material covering Accounting, Law, Tax, and Auditing for CA Intermediate level.'),

    (5, 'Taxation and GST Master Course',
     'course', 'Udemy', 'https://www.udemy.com/course/taxation-gst-india/', 50.0, 649.00,
     'In-depth course on Indian Income Tax Act, GST framework, return filing, and compliance.'),

    (6, 'Clinical Skills Refresher — Nursing Practice',
     'workshop', 'Indian Nursing Council', 'https://www.indiannursingcouncil.org/refresher', 40.0, 1500.00,
     'Hands-on refresher workshop for nurses returning from career breaks. Covers patient assessment, IV therapy, and documentation.');


-- ============================================================================
-- 18. RESOURCE SKILLS  (link resources to the skills they teach)
-- ============================================================================

INSERT INTO resource_skills (resource_skill_id, resource_id, skill_id, proficiency_taught)
VALUES
    (1, 1, 3,  'intermediate'),   -- React course teaches React to intermediate
    (2, 2, 4,  'intermediate'),   -- AWS course teaches Cloud Computing to intermediate
    (3, 3, 7,  'intermediate'),   -- Khan Academy course refreshes Pharmacology
    (4, 4, 10, 'intermediate'),   -- ICAI material teaches Auditing
    (5, 4, 9,  'intermediate'),   -- ICAI material teaches Tax Compliance
    (6, 5, 9,  'advanced'),       -- Udemy tax course teaches Tax Compliance to advanced
    (7, 6, 5,  'advanced'),       -- Nursing refresher workshop teaches Patient Assessment
    (8, 6, 6,  'intermediate');   -- Nursing refresher workshop teaches Clinical Documentation


-- ============================================================================
-- 19. LEARNING PLANS  (1 per user)
-- ============================================================================

INSERT INTO learning_plans (plan_id, user_id, goal_id, plan_name, description, start_date, target_completion_date, status)
VALUES
    (1, 1, 1, 'Full-Stack Developer Readiness Plan',
     'Step-by-step plan to close skill gaps in React and cloud computing, and gain professional experience.',
     '2026-11-01', '2027-06-30', 'active'),

    (2, 2, 2, 'Nursing Re-entry Plan',
     'Plan to refresh clinical skills and pharmacology knowledge after a 1-year career break, and return to active nursing.',
     '2026-11-01', '2027-06-30', 'active'),

    (3, 3, 3, 'CA Qualification Journey',
     'Long-term plan to clear CA Intermediate and Final exams, complete articleship, and build advanced accounting skills.',
     '2026-11-01', '2028-12-31', 'active');


-- ============================================================================
-- 20. LEARNING PLAN ITEMS  (2-3 items per plan)
-- ============================================================================

-- ----- Priya's plan items -----
INSERT INTO learning_plan_items (plan_item_id, plan_id, gap_item_id, resource_id, task_description, sequence_order, status, due_date)
VALUES
    (1, 1, 1, 1,
     'Complete the Udemy React Developer Course and build 3 practice projects.',
     1, 'in_progress', '2027-01-31'),

    (2, 1, 2, 2,
     'Enroll in and complete the AWS Solutions Architect certification course on Coursera.',
     2, 'pending', '2027-04-30'),

    (3, 1, 3, NULL,
     'Apply for full-time or contract positions to accumulate at least 6 more months of professional experience.',
     3, 'pending', '2027-06-30');

-- ----- Rahul's plan items -----
INSERT INTO learning_plan_items (plan_item_id, plan_id, gap_item_id, resource_id, task_description, sequence_order, status, due_date)
VALUES
    (4, 2, 4, 6,
     'Attend the INC Clinical Skills Refresher workshop to regain hands-on confidence.',
     1, 'in_progress', '2026-12-15'),

    (5, 2, 5, 3,
     'Complete the Khan Academy Pharmacology Refresher to update drug knowledge.',
     2, 'pending', '2027-01-31');

-- ----- Ananya's plan items -----
INSERT INTO learning_plan_items (plan_item_id, plan_id, gap_item_id, resource_id, task_description, sequence_order, status, due_date)
VALUES
    (6, 3, 6, 4,
     'Study ICAI material and appear for CA Intermediate Group I exams in May 2027.',
     1, 'in_progress', '2027-05-15'),

    (7, 3, 8, 5,
     'Complete the Udemy Taxation & GST Master Course to strengthen tax compliance knowledge.',
     2, 'pending', '2027-03-31'),

    (8, 3, 7, NULL,
     'Register for articleship under a practising CA firm starting January 2027.',
     3, 'pending', '2027-01-15');


-- ============================================================================
-- 21. ASSESSMENTS  (4 assessments for different skills)
-- ============================================================================

INSERT INTO assessments (assessment_id, skill_id, assessment_name, assessment_type, max_score, passing_score, description)
VALUES
    (1, 3,  'React Fundamentals Quiz',             'quiz',               100.00, 60.00,
     'Multiple-choice quiz covering JSX, components, hooks, state management, and React Router.'),

    (2, 2,  'SQL Proficiency Practical Test',      'practical',          100.00, 65.00,
     'Write SQL queries for joins, subqueries, window functions, and schema design on a sample database.'),

    (3, 7,  'Pharmacology Knowledge Assessment',   'quiz',               50.00,  30.00,
     'Quiz on drug classifications, dosage calculations, contraindications, and recent protocol updates.'),

    (4, 9,  'Indian Taxation Basics Exam',         'certification_exam', 100.00, 50.00,
     'Covers Income Tax Act provisions, GST framework, TDS, and return filing procedures.');


-- ============================================================================
-- 22. ASSESSMENT RESULTS  (1-2 per user; Rahul has a retake showing improvement)
-- ============================================================================

INSERT INTO assessment_results (result_id, user_id, assessment_id, attempt_date, score, passed, evidence, notes)
VALUES
    -- Priya: React quiz — first attempt, did not pass
    (1, 1, 1, '2026-09-15 14:00:00', 52.00, FALSE,  NULL,
     'Struggled with advanced hooks and Redux questions. Need more practice.'),

    -- Priya: SQL practical — passed comfortably
    (2, 1, 2, '2026-09-20 10:00:00', 78.00, TRUE,   'Submission stored in LMS portal.',
     'Strong on joins and subqueries. Minor mistakes in window functions.'),

    -- Rahul: Pharmacology quiz — first attempt, below passing
    (3, 2, 3, '2026-08-10 09:00:00', 24.00, FALSE,  NULL,
     'Score reflects knowledge decay during career break. Several new drugs were unfamiliar.'),

    -- Rahul: Pharmacology quiz — retake after studying, passed
    (4, 2, 3, '2026-10-25 09:30:00', 38.00, TRUE,   'Certificate from Khan Academy refresher module.',
     'Significant improvement after completing the pharmacology refresher course. Passed on second attempt.'),

    -- Ananya: Taxation basics exam — passed
    (5, 3, 4, '2026-10-01 11:00:00', 62.00, TRUE,   NULL,
     'Good grasp of Income Tax basics. GST section was weaker — needs more study on input tax credit rules.');


-- ============================================================================
-- RESET SEQUENCES
-- (Ensures the next auto-generated IDs continue after our explicit values.)
-- ============================================================================

SELECT setval('users_user_id_seq',                     (SELECT MAX(user_id)                FROM users));
SELECT setval('career_fields_field_id_seq',            (SELECT MAX(field_id)               FROM career_fields));
SELECT setval('skills_skill_id_seq',                   (SELECT MAX(skill_id)               FROM skills));
SELECT setval('qualification_types_qualification_type_id_seq', (SELECT MAX(qualification_type_id) FROM qualification_types));
SELECT setval('career_roles_role_id_seq',              (SELECT MAX(role_id)                FROM career_roles));
SELECT setval('certifications_certification_id_seq',   (SELECT MAX(certification_id)       FROM certifications));
SELECT setval('education_records_education_id_seq',    (SELECT MAX(education_id)           FROM education_records));
SELECT setval('user_skills_user_skill_id_seq',         (SELECT MAX(user_skill_id)          FROM user_skills));
SELECT setval('user_experiences_experience_id_seq',    (SELECT MAX(experience_id)          FROM user_experiences));
SELECT setval('user_certifications_user_certification_id_seq', (SELECT MAX(user_certification_id) FROM user_certifications));
SELECT setval('career_breaks_break_id_seq',            (SELECT MAX(break_id)               FROM career_breaks));
SELECT setval('career_goals_goal_id_seq',              (SELECT MAX(goal_id)                FROM career_goals));
SELECT setval('career_requirements_requirement_id_seq',(SELECT MAX(requirement_id)         FROM career_requirements));
SELECT setval('gap_types_gap_type_id_seq',             (SELECT MAX(gap_type_id)            FROM gap_types));
SELECT setval('career_gap_analyses_analysis_id_seq',   (SELECT MAX(analysis_id)            FROM career_gap_analyses));
SELECT setval('career_gap_items_gap_item_id_seq',      (SELECT MAX(gap_item_id)            FROM career_gap_items));
SELECT setval('learning_resources_resource_id_seq',    (SELECT MAX(resource_id)            FROM learning_resources));
SELECT setval('resource_skills_resource_skill_id_seq', (SELECT MAX(resource_skill_id)      FROM resource_skills));
SELECT setval('learning_plans_plan_id_seq',            (SELECT MAX(plan_id)                FROM learning_plans));
SELECT setval('learning_plan_items_plan_item_id_seq',  (SELECT MAX(plan_item_id)           FROM learning_plan_items));
SELECT setval('assessments_assessment_id_seq',         (SELECT MAX(assessment_id)          FROM assessments));
SELECT setval('assessment_results_result_id_seq',      (SELECT MAX(result_id)              FROM assessment_results));

COMMIT;

-- ============================================================================
-- END OF SAMPLE DATA
-- ============================================================================
-- Summary:
--   •  3 users (Priya, Rahul, Ananya) across IT, Healthcare, and Finance
--   •  5 career fields, 18 skills, 8 qualification types, 5 roles, 6 certs
--   •  6 education records, 14 user-skill entries, 4 experiences
--   •  4 user certifications (including 1 in_progress for Ananya)
--   •  1 career break (Rahul — health, 2024–2025)
--   •  3 career goals, 27 career requirements, 7 gap types
--   •  3 gap analyses (55%, 70%, 42% readiness)
--   •  9 gap items, 6 learning resources, 8 resource-skill links
--   •  3 learning plans, 8 plan items
--   •  4 assessments, 5 assessment results (including Rahul's retake)
-- ============================================================================
