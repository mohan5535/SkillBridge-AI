# Phase 3 Authorization & Anti-IDOR Hardening Report — SkillBridge AI

**Date:** 2026-11-12  
**Workspace:** `C:\Users\Mohan\OneDrive\Desktop\Intership\New folder`  
**Status:** **COMPLETE — ALL AUTHORIZATION & IDOR GAPS CLOSED**

---

## 1. Vulnerabilities Fixed

Previously, routes taking direct entity identifiers (`:goalId`, `:analysisId`, `:planId`, `:itemId`) or accepting a candidate `user_id` inside the request body only enforced `authenticateToken` (plus `csrfProtection` on mutations), allowing an authenticated candidate to access or modify another candidate's secondary resources by substituting IDs:

1. `/api/goals/:goalId/skill-match`, `/api/goals/:goalId/analyze` (`GET`/`POST`), `/api/goals/:goalId/generate-roadmap` (`GET`/`POST`), `/api/goals/:goalId/analyses` (`POST`), and `/api/goals/:goalId/learning-plans` (`POST`)
2. `/api/analyses/:analysisId` (`GET`)
3. `/api/learning-plans/:planId` (`GET`)
4. `/api/learning-plan-items/:itemId` (`PATCH`)
5. `POST /api/assessments/:id/submit` (`req.body.user_id`)

---

## 2. Authorization & Ownership Implementation

### Middleware Guards Added — [backend/src/middleware/auth.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/middleware/auth.js)
- **`requireResourceOwnershipOrCounselor(resourceType, paramName, queryFn)`**:
  - Uses an allowlisted SQL map (`RESOURCE_OWNER_QUERIES`) with parameterized `$1` queries against PostgreSQL (`career_goals`, `career_gap_analyses`, `learning_plans`, `learning_plan_items JOIN learning_plans`).
  - Preserves supervisory access for `counselor` and `admin` roles.
  - Returns `404 RESOURCE_NOT_FOUND` if the referenced resource does not exist, and `403 FORBIDDEN_RESOURCE_ACCESS` if the queried owner `user_id` does not match `req.user.userId`.
- **`requireBodyUserOwnershipOrCounselor(fieldName = 'user_id')`**:
  - Prevents authenticated candidates from submitting assessment records under another candidate's `user_id` (`403 FORBIDDEN_RESOURCE_ACCESS`), while allowing `counselor`/`admin` roles to operate across candidate records.

### Route Protection Wired
- [backend/src/routes/goal.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/goal.routes.js) — Applied `requireResourceOwnershipOrCounselor('goal', 'goalId')` on all `/goals/:goalId/*` endpoints and `requireResourceOwnershipOrCounselor('analysis', 'analysisId')` on `GET /analyses/:analysisId`.
- [backend/src/routes/learning.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/learning.routes.js) — Applied `requireResourceOwnershipOrCounselor('learningPlan', 'planId')` on `GET /learning-plans/:planId`, `requireResourceOwnershipOrCounselor('goal', 'goalId')` on `POST /goals/:goalId/learning-plans`, and `requireResourceOwnershipOrCounselor('learningPlanItem', 'itemId')` on `PATCH /learning-plan-items/:itemId`.
- [backend/src/routes/assessment.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/assessment.routes.js) — Applied `requireBodyUserOwnershipOrCounselor('user_id')` after `validate(submitAssessmentSchema)` on `POST /assessments/:id/submit`.

---

## 3. Documentation Report Audit (`documentation/SkillBridge_AI_Project_Report.pdf`)

- Inspected `documentation/SkillBridge_AI_Project_Report.pdf` (raw PDF bytes + zlib-decompressed content streams) and `documentation/SkillBridge_AI_Project_Report.docx` (`python-docx` paragraph + table scan and raw XML check).
- Confirmed **zero (`0`) occurrences** of `SkillBridgeSecure2026`, `PGPASSWORD`, `dev_jwt_secret`, or `AKIA` in both `.pdf` and `.docx` documents (`task-2381` and byte/XML verification).
- The previous audit scan flagged line 85 solely because case-insensitive matching hit lowercase `akia` bytes inside a binary compressed image stream inside the PDF — not a real secret or Compose example password. No repository-wide plain-text occurrences of the legacy Compose example password remain anywhere in the codebase (`task-2394` confirmed only the negative test assertion in `productionReadiness.test.js` and the prior audit note in `.planning/PRODUCTION-READINESS-AUDIT.md`). Therefore, the binary `.pdf` was preserved unmodified.

---

## 4. Regression Tests Added & Actual Suite Results

### New Authorization Regression Tests
- [backend/tests/unit/idorOwnership.test.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/tests/unit/idorOwnership.test.js) (5 unit tests covering `401` unauthenticated, `counselor`/`admin` bypass, `403` cross-candidate IDOR block, `404` missing resource, and body `user_id` spoofing block).
- [backend/tests/integration/idorAuthorization.test.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/tests/integration/idorAuthorization.test.js) (4 live PostgreSQL integration tests proving Candidate 1 accesses own resources, gets blocked with `403 FORBIDDEN_RESOURCE_ACCESS` across all of Candidate 2's goal/analysis/roadmap/learning-plan/plan-item endpoints and assessment submission spoofing with DB state untouched, and Counselor retains supervisory read access).

### Complete Suite Execution (`npm --prefix backend run test`)
- **Total Executed:** **194 tests** across **31 suites**
- **Passed:** **194**
- **Failed:** **0**
- **Skipped:** **0**
- **Duration:** `~36.0s`
- **PostgreSQL Database Verification (`Zero-Mutation` & `SEC-12`):** Confirmed **22 normalized tables** and **157 baseline committed records** remain intact with zero schema migrations or mutations.

