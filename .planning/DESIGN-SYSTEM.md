# SkillBridge AI — Premium SaaS Design System & Visual Specification

**Design Identity:** Modern High-Performance SaaS (Linear, Stripe & Notion Inspired)  
**Theme:** Obsidian Dark with Electric Indigo (`#6366F1`) & Cyan Mint (`#06B6D4`) Accents  
**Typography:** Plus Jakarta Sans / Inter (Headings & Interface) + JetBrains Mono (Metrics & Tabular Figures)  
**Target:** 12 Fully Integrated Pages across Public, Candidate, and Counselor Tiers  

---

## 1. Visual Philosophy & Core Pillars

1. **Subtle Depth & Layering (No Flat Monotony, No Cluttered Skeuomorphism):**
   - Three distinct surface elevations: Base canvas (`#080C14`), Panel / Card (`#0F1624`), Elevated Surface / Modal (`#162032`).
   - Hairline borders (`1px solid rgba(255, 255, 255, 0.08)`) with subtle inner bevel highlights (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06)`).
   - Micro-glow ambient gradients behind key metric cards and radial meters.

2. **Linear-Grade Typography & Micro-Contrast:**
   - Display Headings: `-0.03em` letter-spacing, tight leading (`1.15`), high visual contrast against dark backgrounds.
   - Body & Metadata: Neutral muted slates (`#94A3B8`, `#64748B`) with `1.55` line-height for effortless scanning.
   - Numeric & Statistical Data: Monospaced tabular digits (`JetBrains Mono`, `font-variant-numeric: tabular-nums`) preventing layout jitters during dynamic data refresh.

3. **Purposeful Kinetic Feedback:**
   - Smooth 150ms-220ms cubic-bezier transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Press feedback (`scale(0.985)`), subtle glow hover states, skeleton shimmer loading placeholders, and clean fade/slide transitions between application views.

4. **Information Architecture & Ergonomics:**
   - Collapsible high-density sidebar navigation with workspace context switcher.
   - Sticky top bar with breadcrumbs, live database sequence status, and instant role switcher.
   - Clear visual separation between Public Landing, Candidate Journey, and Supervisory Counselor Analytics.

---

## 2. Design Token System (CSS Variables)

```css
:root {
  /* Primitive Background Surfaces */
  --sb-bg-app: #080c14;            /* Canvas background */
  --sb-bg-sidebar: #0b111c;        /* Persistent sidebar */
  --sb-bg-card: #0f1726;           /* Primary panels and cards */
  --sb-bg-card-hover: #141f33;     /* Hover surface */
  --sb-bg-elevated: #182338;       /* Popovers, modals, dropdowns */
  --sb-bg-input: #0b121e;          /* Form inputs */

  /* Hairline Borders & Dividers */
  --sb-border-subtle: rgba(255, 255, 255, 0.06);
  --sb-border-default: rgba(255, 255, 255, 0.10);
  --sb-border-focus: #6366f1;
  --sb-border-glow: rgba(99, 102, 241, 0.35);

  /* Typography Colors */
  --sb-text-primary: #f8fafc;      /* Titles, key metrics */
  --sb-text-secondary: #94a3b8;    /* Subtitles, labels */
  --sb-text-muted: #64748b;        /* Helper text, captions */
  --sb-text-disabled: #475569;

  /* Brand Accents */
  --sb-brand: #6366f1;             /* Electric Indigo */
  --sb-brand-hover: #4f46e5;
  --sb-brand-glow: rgba(99, 102, 241, 0.22);
  --sb-brand-subtle: rgba(99, 102, 241, 0.12);

  /* Semantic Accents */
  --sb-success: #10b981;           /* Ready / Met / Passed */
  --sb-success-glow: rgba(16, 185, 129, 0.20);
  --sb-warning: #f59e0b;           /* High Severity / In Progress */
  --sb-danger: #ef4444;            /* Critical Gap / At Risk */
  --sb-danger-glow: rgba(239, 68, 68, 0.22);
  --sb-info: #06b6d4;              /* Cyan Mint */
  --sb-purple: #8b5cf6;            /* Experience & Counselor */

  /* Typography Scales */
  --font-sans: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Border Radii */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
}
```

---

## 3. The 12 Pages Architecture & Functional Map

### Tier 1: Public Marketing & Access Gateway
1. **Landing Page (`#page-landing`):**
   - High-impact SaaS hero banner with value proposition, animated badge, live database connectivity pill.
   - Feature spotlight cards: Multi-Factor Readiness Algorithm, Automated Learning Roadmaps, Query 8 Precision Gap Matching, Institutional Counselor Oversight.
   - Interactive Architecture Metrics ribbon (22 Tables, 157 Records, 100% Zero-Mutation Integrity).
   - Dual Call-to-Actions: "Launch Candidate Workspace" and "Counselor Portal Access".

2. **Login & Registration Gateway (`#page-auth`):**
   - Elegant card layout with 3 seamless auth modes:
     - **Sign In:** Email + password login protected by brute-force limiter (5 attempts / 15m).
     - **Candidate Registration:** Full name, email, password, region, country; automatically enforces `role = 'candidate'` and bcrypt cost 12.
     - **Account Activation:** Single-use 256-bit cryptographic token password setup.
   - Quick one-click Persona Access bar for seamless demonstration testing without password entry friction.

### Tier 2: Candidate Workspace (Dynamic PostgreSQL-Backed)
3. **Candidate Dashboard (`#page-candidate-dashboard`):**
   - Executive summary greeting with target role badge and active goal indicator.
   - **Hero Radial Readiness Gauge:** SVG animated circular progress gauge displaying overall readiness score with category badge (`Ready Now`, `Near Ready`, `Needs Upskilling`, `Career Pivot`).
   - 5-Component Scorecard: Skills (40%), Experience (20%), Education (20%), Certifications (10%), Assessments (10%).
   - Actionable Next Steps cards mapping directly to prioritized learning tasks.

4. **Candidate Profile (`#page-candidate-profile`):**
   - Candidate demographic header with avatar initials, location, contact, and "Edit Profile" action.
   - Education Records Timeline (Query 1): Degree, institution, tier level rank, score, dates.
   - Professional Experience Timeline (Query 3): Job title, company, tenure months, full-time/internship.
   - Certifications Portfolio: Active industry credentials and verification badges.
   - Career Pauses & Breaks: Neutral reasons (`caregiving`, `health`, etc.) and descriptions per FR-02.

5. **Skills & Experience Management (`#page-skills-management`):**
   - Interactive skill management cards with "+ Add Skill to Portfolio" modal.
   - Dropdown of 18 normalized catalog skills from `/api/catalog/skills`, proficiency level selector, years of experience, and evidence link.
   - Career break logging modal with neutral schema CHECK vocabulary.
   - Live synchronization with PostgreSQL backend.

6. **Career Readiness Analysis (`#page-readiness-analysis`):**
   - Mathematical formula transparency breakdown ($0.40 \times \text{Skills} + \dots$).
   - Detailed sub-score analysis showing exact points contributed by each domain.
   - Live "Recalculate Dynamic Readiness" button triggering `POST /api/goals/:id/analyze`.

7. **Skill Gap Analysis (`#page-gap-analysis`):**
   - Query 8 Precision Skill Match Matrix (Required skill, expected proficiency rank, candidate current proficiency, mandatory flag, `MET` / `NOT_MET` status).
   - Detected Gap Cards classified by severity (`critical`, `high`, `medium`, `low`) with required vs current state.

8. **Learning Roadmap (`#page-learning-roadmap`):**
   - Sequenced curriculum pipeline showing ordered task progression.
   - Summary statistics: Total tasks, estimated duration hours, critical gaps targeted.
   - Interactive milestone task cards with provider details, estimated hours, and status.
   - "Regenerate Dynamic Roadmap" button triggering `POST /api/goals/:id/generate-roadmap`.

9. **Assessments & Progress (`#page-assessments`):**
   - Query 13 Attempt History Table (Test title, verified score, max score, passing threshold, pass/retry badge, timestamp).
   - Query 14 Retest Growth Tracker displaying score improvement deltas.
   - Interactive Quiz Runner with boundary validation ($0 \le \text{score} \le \text{max\_score}$).

### Tier 3: Supervisory Counselor Portal (Domain 6 & RBAC Guarded)
10. **Counselor Dashboard (`#page-counselor-dashboard`):**
    - 4 Executive KPI summary cards (Total candidates, cohort average readiness, active gaps, learning tasks active).
    - Query 15 Multi-CTE Executive Dashboard table (Candidate name, target role, domain, readiness %, total gaps, tasks completed/total, roadmap progress bar, supervisory audit action).
    - Instant candidate profile inspection trigger.

11. **Candidate Management / Supervisory Directory (`#page-counselor-candidates`):**
    - Candidate directory dynamically populated from PostgreSQL via `GET /api/users`.
    - Real-time search/filter input by name, email, or role.
    - Full candidate roster table with "Audit Candidate Profile" action switching context to deep-dive that candidate.

12. **Executive Analytics & Cohorts (`#page-counselor-analytics`):**
    - Query 7 At-Risk Candidates ($< 60\%$ readiness) cohort card panel with prioritized intervention flags.
    - Query 9 Career Break Impact Cohort analysis correlating break durations, reason, and return-to-work readiness.
    - Query 11 Candidate Roadmap Execution Velocity and task completion rates.
    - Interactive RBAC Barrier Tester demonstrating live HTTP 403 `FORBIDDEN_ROLE` enforcement when candidate sessions attempt access.

---

## 4. UI Quality & Accessibility Standards

- **Touch & Click Targets:** All interactive buttons and controls have minimum $44 \times 44\text{px}$ touch targets.
- **Contrast Ratios:** Minimum $4.5:1$ text-to-background contrast on all normal text ($3:1$ on large badges).
- **No Emojis as Structural Icons:** Clean SVG icons with unified stroke width (`1.75px`) and consistent sizing.
- **States & Feedback:** Loading skeleton shimmers, floating auto-dismissing notifications, disabled state opacity with cursor feedback.
- **Zero Schema Mutations:** Preserves all 22 PostgreSQL tables and 157 committed records.

