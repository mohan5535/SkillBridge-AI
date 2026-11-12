# Phase 2 Security Hardening Report — SkillBridge AI

**Date:** 2026-11-12  
**Auditor Role:** Principal Application Security Engineer  
**Scope:** CSP Hardening, Schema-Aligned Strict API Validation, Input Sanitization False-Positive Audit, Output Security, and Live Security & Responsive Verification  
**Database Preservation:** Verified intact — **22 PostgreSQL tables** and **157 committed records** preserved; zero migrations executed.

---

## 1. Vulnerabilities & Hardening Gaps Discovered

1. **CSP Inline Style Exposure (`style-src 'unsafe-inline'`):**
   - `backend/public/index.html` contained **21 inline `style="..."` attributes**, and `backend/public/app.js` injected inline `style="width: ...%"` / `style="font-size: ..."` attributes into `.innerHTML` templates and mutated `circle.style.stroke` dynamically.
   - As a result, `backend/src/middleware/security.js` previously had to allow `'unsafe-inline'` inside `styleSrc` and omitted `styleSrcAttr: ["'none'"]`.

2. **Unmounted & Schema-Misaligned Domain Route Validation:**
   - Domain routers (`user.routes.js`, `goal.routes.js`, `learning.routes.js`, `assessment.routes.js`) and auth utility endpoints (`/api/auth/logout`, `/api/auth/demo-session`) did not invoke `validate(...)` middleware on request bodies or route parameters (`:id`, `:goalId`, `:analysisId`, `:planId`, `:itemId`).
   - `POST /api/users` lacked `csrfProtection` despite being a state-changing endpoint.
   - Existing schemas in `backend/src/validators/schemas.js` were misaligned with `schema.sql` and query SQL:
     - Referenced nonexistent DB columns (`city`, `postal_code`, `headline`, `bio`, `profile_image_url`, `linkedin_url`, `github_url`, `portfolio_url`, `is_highest_level`, `is_primary`, `location`, `certificate_name`, `issuing_organization`, `credential_url`, `is_current`, `key_achievements`).
     - Required `company_name` instead of actual `user_experiences.organization_name`, and omitted `state_or_region`, `date_of_birth`, `grade_or_score`, `evidence`, `field_id`, and `user_certifications.certification_id` requirements.
     - Lacked schemas for `PUT /api/users/:id`, `POST /api/goals/:goalId/analyses`, empty-body triggers (`/analyze`, `/generate-roadmap`, `/logout`), `/learning-plans`, and `PATCH /api/learning-plan-items/:itemId`.
   - `index.html`'s Career Break modal (`#selectBreakReason`) included invalid option values (`career_transition`, `burnout_recovery`, `relocation`, `sabbatical`) that violated PostgreSQL constraint `chk_break_reason`.

3. **Input Sanitizer False Positives & Partial DOM Escaping:**
   - `backend/src/utils/inputSanitizer.js` previously used `/\b(?:javascript|vbscript)\s*:/i`, causing false positives on legitimate technical profile/experience text beginning with or containing `"JavaScript: ES6+, Node.js & React >= 18"`.
   - In `backend/public/app.js`, `populateSessionSwitcherOptions()` interpolated `u.user_id` without wrapping it through `safeNumber()`.

---

## 2. Files Modified

- [backend/src/middleware/security.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/middleware/security.js) — Removed `'unsafe-inline'` from `styleSrc` and added `styleSrcAttr: ["'none'"]` in `helmetMiddleware`.
- [backend/public/styles.css](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/public/styles.css) — Added default `width: 0%` on `.progress-bar-fill`, semantic CSS utility classes, layout modifiers, and radial gauge SVG tier classes (`.gauge-tier-emerald`, `.gauge-tier-cyan`, `.gauge-tier-amber`, `.gauge-tier-danger`).
- [backend/public/index.html](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/public/index.html) — Eliminated all 21 inline `style="..."` attributes using external classes in `styles.css`, and aligned `#selectBreakReason` option values with PostgreSQL `chk_break_reason`.
- [backend/public/app.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/public/app.js) — Replaced gauge stroke inline style mutation with CSS classes + SVG `stroke-dashoffset` presentation attribute, eliminated inline HTML `style="..."` attributes in `loadCounselorDashboard()` (`data-progress` + post-render bounded CSSOM widths), and applied `safeNumber(u.user_id)` in `populateSessionSwitcherOptions()`.
- [backend/src/utils/inputSanitizer.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/utils/inputSanitizer.js) — Refined `javascript:`/`vbscript:` detection patterns so executable URI payloads (`javascript:alert(1)`, `<a href="javascript:...">`, `data:text/html`) are blocked while normal prose (`"JavaScript: ES6+, Node.js..."`) passes without false positives or text mutation.
- [backend/src/validators/schemas.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/validators/schemas.js) — Rebuilt all validation schemas with `.strict()` semantics strictly aligned to verified `schema.sql` columns, lengths, calendar dates, and domain enums, and added `positiveIntParam()`, `emptyBodySchema`, `updateUserSchema`, `createGapAnalysisSchema`, `learningPlanSchema`, and `updateLearningItemStatusSchema`.
- [backend/src/validators/authSchemas.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/validators/authSchemas.js) — Added strict `demoSessionSchema`.
- [backend/src/routes/auth.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/auth.routes.js), [backend/src/routes/user.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/user.routes.js), [backend/src/routes/goal.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/goal.routes.js), [backend/src/routes/learning.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/learning.routes.js), [backend/src/routes/assessment.routes.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/src/routes/assessment.routes.js) — Wired parameter validation (`positiveIntParam`), request body validation (`validate(...)`), and `csrfProtection` on `POST /api/users`.
- [backend/tests/unit/security.test.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/tests/unit/security.test.js), [backend/tests/unit/xssAndInputSecurity.test.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/tests/unit/xssAndInputSecurity.test.js), [backend/tests/integration/portal.test.js](file:///c:/Users/Mohan/OneDrive/Desktop/Intership/New%20folder/backend/tests/integration/portal.test.js) — Added Phase 2 regression tests for strict CSP headers, `.strict()` domain schemas, false-positive prevention, CSRF/XSS/multipart blocking, and `chk_break_reason` UI alignment.

---

## 3. Security Fixes Implemented

| Category | Defense Implemented | Enforcement Point |
|---|---|---|
| Strict CSP (No `'unsafe-inline'`) | `default-src 'self'`, `script-src 'self'`, `script-src-attr 'none'`, `style-src 'self' https://fonts.googleapis.com`, `style-src-attr 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` | All HTTP & `/portal` responses via `helmetMiddleware` |
| Strict API Schema Validation | Positive integer route param validation (`^[1-9]\d{0,9}$`), `.strict()` object validation blocking unknown/phantom fields across all POST/PUT/PATCH endpoints, schema-exact field lengths, valid calendar dates, `end_date >= start_date`, enum enforcement matching PostgreSQL `CHECK` constraints | `auth.routes.js`, `user.routes.js`, `goal.routes.js`, `learning.routes.js`, `assessment.routes.js` + `schemas.js` |
| CSRF Completeness | Added `csrfProtection` onto `POST /api/users`; preserved session-bound HMAC double-submit CSRF on all authenticated state-changing endpoints | `user.routes.js`, `goal.routes.js`, `learning.routes.js`, `assessment.routes.js` |
| False-Positive Free Input Security | Blocks `<script>`, `<iframe>`, `<object>`, `<embed>`, `<svg onload=...>`, tag event handlers, executable `javascript:`/`vbscript:` URIs, `data:text/html`, null/control bytes, and `__proto__`/`constructor`/`prototype` without mutating or blocking legitimate prose (`JavaScript: ES6+`, `R&D`, `C++`) or valid complex passwords | Global `/api` `sanitizeRequestInputs` middleware + `validators/*` |
| Output Encoding & DOM Hygiene | Zero inline HTML `style=` or `onclick=` attributes across `index.html` and `app.js` templates; `escapeHtml()` escapes `& < > " ' / \``; numeric outputs wrapped in `safeNumber()`/`safePercent()`; CSS badge classes restricted via `safeToken()` | `backend/public/app.js`, `backend/public/index.html`, `backend/public/styles.css` |

---

## 4. Tests Executed & Actual Results

1. **Full Backend Unit & Live PostgreSQL Integration Suite (`npm --prefix backend run test`):**
   - **Result:** **180 / 180 passed** across **28 suites** (`0` failed, `0` skipped, duration `~34.8s`).
   - Verified authentication, JWT HTTP-only cookies, HMAC session-bound CSRF, horizontal candidate isolation (Priya `userId=1` vs Rahul `userId=2`), vertical counselor privilege gating (`GET /api/users`, `/api/analytics/*`), Domain 1-6 database integration queries, `Zero-Mutation & Database Integrity Guarantee Suite` (**22 tables**, **157 records**, **0 orphan FKs**), strict CSP headers, strict domain schemas, and XSS/prototype-pollution/multipart-rejection defenses.

2. **Live Headless Chrome CDP Desktop & Mobile Portal Verification (`http://127.0.0.1:<ephemeral-port>/portal`):**
   - **CSP Violations Reported by Chrome `Log.entryAdded` (`security`):** **0 violations**.
   - **Desktop (`1440x900`):** Candidate CTA loaded live PostgreSQL data (`Target Role: Full-Stack Developer`, gauge `75%` with `gauge-tier-cyan` class, Skills Match bar `width: 83.3%`, `scrollWidth === innerWidth === 1440`); Counselor Portal loaded `3` active candidates (`kpiTotal = 3`) cleanly.
   - **Mobile (`390x844`):** Mobile sidebar toggle (`#btnMobileMenu`) activated `#appSidebar.mobile-open` and `#sidebarBackdrop.active` cleanly with zero horizontal overflow (`scrollWidth === innerWidth === 390`).
   - *(Note: Browser log recorded expected `401` on initial unauthenticated guest `/api/auth/me` probe and `404` for absent `/favicon.ico`; zero uncaught JS exceptions.)*

---

## 5. Remaining Risks

1. **Demo Switcher Endpoint (`/api/auth/demo-session`):** Still enabled by design for the interactive MVP frontend persona switcher (`candidate-1`..`3`, `counselor`). Before internet-facing multi-tenant production deployment, disable or gate `/api/auth/demo-session` behind an explicit non-production environment flag (`NODE_ENV !== 'production'`).
2. **Migration 002 Not Executed in PostgreSQL:** Per strict project constraints, `migrations/002_auth_credentials.sql` remains unexecuted against live PostgreSQL, so persistent password hashes/activation tokens in PostgreSQL `users` still fall back to in-memory `authQueries.js` credential store across un-migrated environments. Executing approved Migration 002 in deployment enables durable credential persistence.
3. **Sub-Resource Ownership on Direct Goal/Plan IDs:** `GET/POST /api/goals/:goalId/*`, `GET /api/learning-plans/:planId`, `PATCH /api/learning-plan-items/:itemId`, and `POST /api/assessments/:id/submit` require `authenticateToken` (+ `csrfProtection` on mutations) but do not yet perform secondary DB goal-owner lookups against `req.user.userId` (unlike `/api/users/:id/*` routes which enforce `requireOwnershipOrCounselor`). Adding goal/plan-level ownership lookup before production rollout will eliminate secondary IDOR exposure on direct resource IDs.
4. **External Font CDN (`https://fonts.googleapis.com` / `https://fonts.gstatic.com`):** External Google Fonts requests lack Subresource Integrity (SRI) hashes when imported inside `styles.css`. Self-hosting font files under `/portal/fonts/` allows tightening CSP `style-src` and `font-src` strictly to `'self'`.
5. **Minor UX Polish:** `/favicon.ico` returns `404` when browsed directly until a static icon is added.

---

## 6. Production Readiness Assessment

**Assessment: HARDENED FOR STAGING / MVP; 3 TARGETED DEPLOYMENT GATES REQUIRED FOR PUBLIC PRODUCTION**

All 5 Phase 2 hardening objectives (strict CSP without `style-src 'unsafe-inline'`, schema-aligned `.strict()` API validation across all mutating endpoints, false-positive-free input sanitization, comprehensive `.innerHTML` output encoding, and `180/180` automated tests plus live desktop/mobile browser verification) are complete and verified. Before exposing the application to untrusted public internet traffic, complete the remaining pre-production gates listed in Section 5: **(1)** apply `migrations/002_auth_credentials.sql`, **(2)** disable `/api/auth/demo-session` in `NODE_ENV=production`, and **(3)** enforce secondary goal/plan/assessment-submission ownership verification against `req.user.userId`.

