/**
 * SkillBridge AI — Modern SaaS Application Controller
 * Pure ES Module Browser Client interfacing with Express REST API Gateway & PostgreSQL 18.6
 * Zero hardcoded demo profiles — all candidate & cohort state loaded dynamically.
 */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    currentPage: 'landing',
    activePersona: 'candidate-1',
    userRole: 'guest',
    userId: null,
    goalId: null,
    currentUser: null,
    currentGoal: null,
    csrfToken: '',
    catalogRoles: [],
    catalogSkills: [],
    rosterCandidates: [],
    dashboardAnalytics: [],
  };

  // Route Metadata Map (Breadcrumbs & Access Control)
  const ROUTES = {
    'landing': { title: 'Platform Overview', group: 'public' },
    'auth': { title: 'Sign In & Registration', group: 'public' },
    'candidate-dashboard': { title: 'Candidate Dashboard', group: 'candidate' },
    'candidate-profile': { title: 'Candidate Profile', group: 'candidate' },
    'skills-management': { title: 'Skills & Career Breaks', group: 'candidate' },
    'readiness-analysis': { title: 'Readiness Analysis Engine', group: 'candidate' },
    'gap-analysis': { title: 'Skill Gap Matrix (Query 8)', group: 'candidate' },
    'learning-roadmap': { title: 'Learning Roadmap', group: 'candidate' },
    'assessments': { title: 'Assessments & Growth', group: 'candidate' },
    'counselor-dashboard': { title: 'Counselor Dashboard', group: 'counselor' },
    'counselor-candidates': { title: 'Candidate Directory', group: 'counselor' },
    'counselor-analytics': { title: 'Executive Analytics & RBAC', group: 'counselor' },
    'catalog': { title: 'Career Role Catalog', group: 'public' },
  };

  // DOM Lookup Utility
  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;')
      .replace(/`/g, '&#x60;');
  }

  function safeToken(val, fallback = 'neutral') {
    if (val === null || val === undefined) return fallback;
    const cleaned = String(val).trim().replace(/[^a-zA-Z0-9_-]/g, '');
    return cleaned || fallback;
  }

  function safeNumber(val, fallback = 0) {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  }

  function safePercent(val) {
    return Math.max(0, Math.min(100, safeNumber(val, 0)));
  }

  // --- API FETCH LAYER WITH SESSION & CSRF ---
  async function apiFetch(endpoint, options = {}) {
    const opts = {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'same-origin',
    };

    const method = (opts.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      opts.headers['Content-Type'] = 'application/json';
      if (state.csrfToken) {
        opts.headers['X-CSRF-Token'] = state.csrfToken;
      }
    }

    try {
      const res = await fetch(endpoint, opts);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err = new Error(data?.message || `HTTP ${res.status} Error`);
        err.status = res.status;
        err.code = data?.code;
        err.payload = data;
        throw err;
      }
      return data;
    } catch (err) {
      if (!options.silent) {
        console.error(`API Error on ${endpoint}:`, err);
        showAlert(`${err.message}`, 'error');
      }
      throw err;
    }
  }

  let alertTimeout = null;
  function showAlert(msg, type = 'success') {
    const banner = $('alertBanner');
    if (!banner) return;
    banner.className = `alert-banner ${type}`;
    banner.textContent = msg;
    banner.classList.remove('hidden');

    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 5000);
  }

  // --- CLIENT-SIDE ROUTER ---
  function navigate(pageId) {
    const route = ROUTES[pageId];
    if (!route) return;

    // Enforce client-side UX RBAC separation (backed by server-side requireRole)
    if (route.group === 'counselor' && state.userRole === 'candidate') {
      showAlert('Access Denied (HTTP 403): Supervisory portal is strictly restricted to Counselors and Admins.', 'error');
      return;
    }

    state.currentPage = pageId;

    // Update parent containers visibility
    const candContainer = $('candidateViewContainer');
    const counContainer = $('counselorViewContainer');

    if (route.group === 'candidate') {
      candContainer.classList.remove('hidden');
      counContainer.classList.add('hidden');
    } else if (route.group === 'counselor') {
      candContainer.classList.add('hidden');
      counContainer.classList.remove('hidden');
    }

    // Activate matching section
    document.querySelectorAll('.page-view').forEach((sec) => sec.classList.remove('active'));
    const targetSec = $(`page-${pageId}`);
    if (targetSec) targetSec.classList.add('active');

    // Sync Sidebar links
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === pageId);
    });

    // Update Breadcrumb
    const bc = $('breadcrumbCurrentPage');
    if (bc) bc.textContent = route.title;

    // Close mobile sidebar if open
    $('appSidebar')?.classList.remove('mobile-open');
    $('sidebarBackdrop')?.classList.remove('active');

    // Scroll canvas top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- MODAL CONTROLLER ---
  function openModal(id) {
    const el = $(id);
    if (el) el.classList.remove('hidden');
  }

  function closeModal(id) {
    const el = $(id);
    if (el) el.classList.add('hidden');
  }

  // --- SVG EMPTY STATE RENDERER ---
  function renderEmptyState(container, title, description, actionLabel = '', actionCallback = null) {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="empty-state-title">${escapeHtml(title)}</div>
        <div class="empty-state-desc">${escapeHtml(description)}</div>
        ${actionLabel ? `<button type="button" class="btn btn-primary btn-sm mt-2 empty-state-cta">${escapeHtml(actionLabel)}</button>` : ''}
      </div>
    `;
    if (actionLabel && actionCallback) {
      const btn = container.querySelector('.empty-state-cta');
      if (btn) btn.addEventListener('click', actionCallback);
    }
  }

  // --- SESSION & IDENTITY MANAGEMENT ---
  async function syncHealthAndSession() {
    // 1. Live Database Health Check
    try {
      const health = await apiFetch('/api/health', { silent: true });
      const label = $('dbStatusLabel');
      if (health?.status === 'success' && label) {
        label.textContent = `PostgreSQL 18.6 (${health.database?.version || 'Live'})`;
      }
    } catch {
      const label = $('dbStatusLabel');
      if (label) label.textContent = 'DB Connecting...';
    }

    // 2. Populate Default Session Switcher Options
    populateSessionSwitcherOptions();

    // 3. Check if already signed in
    try {
      const meRes = await apiFetch('/api/auth/me', { silent: true });
      if (meRes?.data?.user) {
        applySessionIdentity(meRes.data.user, null);
        // Fetch fresh CSRF token bound to session
        const csrfRes = await apiFetch('/api/auth/csrf-token', { silent: true });
        if (csrfRes?.data?.csrfToken) state.csrfToken = csrfRes.data.csrfToken;

        if (meRes.data.user.role === 'counselor' || meRes.data.user.role === 'admin') {
          await loadCounselorData();
        } else {
          await loadCandidateData(meRes.data.user.user_id);
        }
        return true;
      }
    } catch {
      // Guest session
    }
    return false;
  }

  function populateSessionSwitcherOptions(dynamicUsers = null) {
    const select = $('userSelect');
    if (!select) return;

    const currentVal = select.value;
    if (Array.isArray(dynamicUsers) && dynamicUsers.length > 0) {
      select.innerHTML =
        `<optgroup label="Candidates (Live PostgreSQL)">` +
        dynamicUsers
          .map((u) => `<option value="candidate-${safeNumber(u.user_id)}">${escapeHtml(u.full_name)} (ID #${safeNumber(u.user_id)})</option>`)
          .join('') +
        `</optgroup><optgroup label="Supervisory">` +
        `<option value="counselor">Counselor • Supervisory Portal</option>` +
        `</optgroup>`;
    } else if (select.options.length <= 1) {
      select.innerHTML = `
        <optgroup label="Candidate Sessions">
          <option value="candidate-1">Active Candidate #1</option>
          <option value="candidate-2">Active Candidate #2</option>
          <option value="candidate-3">Active Candidate #3</option>
        </optgroup>
        <optgroup label="Supervisory Tier">
          <option value="counselor">Counselor • Supervisory Portal</option>
        </optgroup>
      `;
    }

    if (state.userRole === 'counselor' || state.userRole === 'admin') {
      select.value = 'counselor';
    } else if (state.activePersona && Array.from(select.options).some((o) => o.value === state.activePersona)) {
      select.value = state.activePersona;
    } else if (currentVal && Array.from(select.options).some((o) => o.value === currentVal)) {
      select.value = currentVal;
    }
  }

  function applySessionIdentity(user, csrfToken) {
    if (!user) return;
    state.userId = user.user_id;
    state.userRole = user.role || 'candidate';
    state.currentUser = user;
    state.activePersona = state.userRole === 'counselor' || state.userRole === 'admin' ? 'counselor' : `candidate-${state.userId}`;
    if (csrfToken) state.csrfToken = csrfToken;

    const select = $('userSelect');
    if (select && Array.from(select.options).some((o) => o.value === state.activePersona)) {
      select.value = state.activePersona;
    }

    const initials = (user.full_name || user.email || 'SB')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    if ($('sidebarAvatar')) $('sidebarAvatar').textContent = initials;
    if ($('sidebarUserName')) $('sidebarUserName').textContent = user.full_name || user.email;
    if ($('sidebarUserRole')) $('sidebarUserRole').textContent = `${state.userRole.toUpperCase()} • ID #${state.userId}`;

    // Strictly separate Candidate and Counselor sidebar navigation visibility
    const navCounselor = $('navGroupCounselor');
    const navCandidate = $('navGroupCandidate');
    if (navCounselor && navCandidate) {
      if (state.userRole === 'candidate') {
        navCounselor.classList.add('hidden');
        navCandidate.classList.remove('hidden');
      } else {
        navCounselor.classList.remove('hidden');
        navCandidate.classList.remove('hidden');
      }
    }
  }

  async function switchPersona(personaKey, targetPage = null) {
    if (!personaKey) return;
    state.activePersona = personaKey;

    try {
      const sessionRes = await apiFetch('/api/auth/demo-session', {
        method: 'POST',
        body: JSON.stringify({ persona: personaKey }),
      });

      const user = sessionRes?.data?.user;
      const csrf = sessionRes?.data?.csrfToken;
      applySessionIdentity(user, csrf);

      if ($('userSelect')) $('userSelect').value = personaKey;

      if (state.userRole === 'counselor' || state.userRole === 'admin') {
        await loadCounselorData();
        navigate(targetPage || 'counselor-dashboard');
      } else {
        await loadCandidateData(state.userId);
        navigate(targetPage || 'candidate-dashboard');
      }

      showAlert(`Session switched to ${user.full_name} (${state.userRole.toUpperCase()})`, 'success');
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  }

  // --- CANDIDATE DATA LOADERS (REAL POSTGRESQL BACKED) ---
  async function loadCandidateData(uid = state.userId) {
    if (!uid) return;

    // 1. Load Profile Demographics & Sub-Resources (Domain 1)
    let user = null;
    try {
      const userRes = await apiFetch(`/api/users/${uid}`, { silent: true });
      user = userRes?.data;
      if (user) {
        state.currentUser = user;
        renderProfilePage(user);
      }
    } catch {
      // Transient session candidate (Migration 002 held unexecuted)
      if (state.currentUser) {
        user = state.currentUser;
        renderProfilePage({
          ...user,
          education: [],
          experiences: [],
          skills: [],
          certifications: [],
          career_breaks: [],
        });
      }
    }

    // 2. Load Candidate's Career Goals Dynamically (Domain 3)
    let activeGoal = null;
    try {
      const goalsRes = await apiFetch(`/api/users/${uid}/goals`, { silent: true });
      const goals = goalsRes?.data || [];
      activeGoal = goals[0] || null;
      state.goalId = activeGoal ? activeGoal.goal_id : null;
      state.currentGoal = activeGoal;
    } catch {
      state.goalId = null;
      state.currentGoal = null;
    }

    // Update Hero & Dashboard Metadata Dynamically
    if (user) {
      $('dashWelcomeTitle').textContent = `Welcome back, ${user.full_name.split(' ')[0]}`;
      const loc = [user.state_or_region, user.country].filter(Boolean).join(', ') || 'Location Verified';
      const roleTitle = activeGoal ? activeGoal.role_title : 'No Target Role Selected';
      const fieldName = activeGoal ? activeGoal.field_name : 'Career Path';
      $('dashMetaSubtitle').textContent = `${loc} • ${fieldName}`;
      $('dashTargetRoleTitle').textContent = `Target Role: ${roleTitle}`;
      $('profileMeta').textContent = `${user.email} • ${loc} • Target: ${roleTitle}`;

      // Update active user option text dynamically with real DB name
      const select = $('userSelect');
      if (select) {
        const opt = Array.from(select.options).find((o) => o.value === `candidate-${uid}`);
        if (opt) opt.textContent = `${user.full_name} (${roleTitle})`;
      }
    }

    // 3. Evaluate Readiness, Gap Matrix & Roadmap
    if (state.goalId) {
      await runMultiFactorAnalysis(state.goalId, false);
      await loadSkillMatch(state.goalId);
      await loadRoadmap(state.goalId);
    } else {
      // Handle Candidate with 0 Career Goals Gracefully
      updateGaugeVisual(0, 'no_goal');
      $('dashCategoryBadge').textContent = 'Setup Required';
      renderEmptyState(
        $('dashTopGapsPreview'),
        'No Active Career Goal',
        'Select a target role from the catalog to initialize multi-factor readiness scoring and gap detection.',
        'Explore Career Roles',
        () => navigate('catalog')
      );
      renderEmptyState(
        $('dashTopRoadmapPreview'),
        'Roadmap Not Generated',
        'Assign a target role to generate a dependency-sequenced learning roadmap.',
        'View Catalog',
        () => navigate('catalog')
      );
      renderEmptyState(
        $('gapItemsList'),
        'No Career Goal Linked',
        'No active goal was found for this candidate in PostgreSQL career_goals.'
      );
      renderEmptyState(
        $('roadmapTimeline'),
        'No Learning Roadmap',
        'Add a target career goal to calculate skill gap modules.'
      );
    }

    // 4. Load Assessments & Retest Growth (Domain 5)
    await loadAssessments(uid);
  }

  function updateGaugeVisual(pct, category = 'needs_upskilling') {
    const score = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    const circumference = 314.16; // 2 * PI * 50
    const offset = circumference - (score / 100) * circumference;

    const circle = $('dashGaugeCircle');
    const valText = $('dashGaugeValue');

    if (circle) {
      circle.setAttribute('stroke-dashoffset', offset.toFixed(2));
      circle.classList.remove('gauge-tier-emerald', 'gauge-tier-cyan', 'gauge-tier-amber', 'gauge-tier-danger');
      if (score >= 80) {
        circle.classList.add('gauge-tier-emerald');
      } else if (score >= 60) {
        circle.classList.add('gauge-tier-cyan');
      } else if (score >= 40) {
        circle.classList.add('gauge-tier-amber');
      } else {
        circle.classList.add('gauge-tier-danger');
      }
    }

    if (valText) {
      valText.textContent = `${score}%`;
    }

    const formattedCat = category.replace(/_/g, ' ').toUpperCase();
    if ($('dashCategoryBadge')) $('dashCategoryBadge').textContent = formattedCat;
    if ($('readinessCategoryBadge')) $('readinessCategoryBadge').textContent = formattedCat;
  }

  async function runMultiFactorAnalysis(goalId, showToast = true) {
    try {
      const res = await apiFetch(`/api/goals/${goalId}/analyze`, { method: 'POST' });
      const data = res?.data;
      if (!data) return;

      const pct = data.overall_readiness_pct;
      updateGaugeVisual(pct, data.category || 'evaluated');

      // Update Scorecard + Readiness Visual Bars
      const bd = data.breakdown || {};
      const metrics = [
        { pct: bd.skills_score_pct || 0, cardVal: 'skillsScorePct', cardBar: 'barSkills', chartVal: 'chartValSkills', chartBar: 'chartBarSkills' },
        { pct: bd.experience_score_pct || 0, cardVal: 'expScorePct', cardBar: 'barExp', chartVal: 'chartValExp', chartBar: 'chartBarExp' },
        { pct: bd.education_score_pct || 0, cardVal: 'eduScorePct', cardBar: 'barEdu', chartVal: 'chartValEdu', chartBar: 'chartBarEdu' },
        { pct: bd.certifications_score_pct || 0, cardVal: 'certsScorePct', cardBar: 'barCerts', chartVal: 'chartValCerts', chartBar: 'chartBarCerts' },
        { pct: bd.assessments_score_pct || 0, cardVal: 'assessScorePct', cardBar: 'barAssess', chartVal: 'chartValAssess', chartBar: 'chartBarAssess' },
      ];

      metrics.forEach((m) => {
        const pctVal = safePercent(m.pct);
        if ($(m.cardVal)) $(m.cardVal).textContent = `${pctVal}%`;
        if ($(m.cardBar)) $(m.cardBar).style.width = `${pctVal}%`;
        if ($(m.chartVal)) $(m.chartVal).textContent = `${pctVal}%`;
        if ($(m.chartBar)) $(m.chartBar).style.width = `${pctVal}%`;
      });

      if ($('expMonthsLabel')) {
        $('expMonthsLabel').textContent = `${bd.total_experience_months || 0} months tenure`;
      }

      const gaps = data.gaps || [];
      renderGaps(gaps);

      if (showToast) {
        showAlert(`Readiness Analysis completed: ${pct}% (${data.category.replace('_', ' ').toUpperCase()})`, 'success');
      }
    } catch (err) {
      console.error('Multi-factor analysis failed:', err);
    }
  }

  function renderGaps(gaps) {
    const badge = $('totalGapsBadge');
    const sideBadge = $('sidebarGapsCount');
    if (badge) badge.textContent = `${gaps.length} Gaps Identified`;
    if (sideBadge) sideBadge.textContent = gaps.length;

    const preview = $('dashTopGapsPreview');
    const fullList = $('gapItemsList');

    if (gaps.length === 0) {
      renderEmptyState(fullList, 'Zero Career Gaps Detected', 'Your profile satisfies 100% of mandatory requirements for this role.');
      if (preview) renderEmptyState(preview, 'All Requirements Met', 'No blocking skill gaps detected.');
      return;
    }

    const html = gaps
      .map(
        (g) => `
      <div class="gap-card ${safeToken(g.severity, 'neutral')}">
        <div>
          <div class="gap-info-main">${escapeHtml(g.description)}</div>
          <div class="gap-info-sub">
            <strong>Target:</strong> ${escapeHtml(g.required_state)} &bull;
            <strong>Current:</strong> ${escapeHtml(g.current_state)}
          </div>
        </div>
        <span class="badge badge-${safeToken(g.severity, 'neutral')}">${escapeHtml(g.severity)}</span>
      </div>
    `
      )
      .join('');

    if (fullList) fullList.innerHTML = html;

    if (preview) {
      preview.innerHTML = gaps
        .slice(0, 3)
        .map(
          (g) => `
        <div class="gap-card ${safeToken(g.severity, 'neutral')}">
          <div>
            <div class="gap-info-main">${escapeHtml(g.description)}</div>
            <div class="gap-info-sub">${escapeHtml(g.current_state)} &rarr; ${escapeHtml(g.required_state)}</div>
          </div>
          <span class="badge badge-${safeToken(g.severity, 'neutral')}">${escapeHtml(g.severity)}</span>
        </div>
      `
        )
        .join('');
    }
  }

  async function loadSkillMatch(goalId) {
    const tbody = $('skillMatchTableBody');
    if (!tbody) return;
    try {
      const res = await apiFetch(`/api/goals/${goalId}/skill-match`);
      const skills = res?.data?.skills || [];

      if (skills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No skill requirements mapped for this role.</td></tr>';
        return;
      }

      tbody.innerHTML = skills
        .map(
          (s) => `
        <tr>
          <td><span class="badge badge-indigo">${escapeHtml(s.requirement_type || 'skill')}</span></td>
          <td><strong>${escapeHtml(s.required_skill)}</strong></td>
          <td>${escapeHtml(s.expected_proficiency)}</td>
          <td>${s.current_proficiency ? escapeHtml(s.current_proficiency) : '<span class="text-muted">Not Acquired</span>'}</td>
          <td>${s.is_mandatory ? '<span class="badge badge-critical">Mandatory</span>' : '<span class="badge badge-neutral">Optional</span>'}</td>
          <td><span class="badge ${s.match_status === 'MET' ? 'badge-met' : 'badge-not-met'}">${escapeHtml(s.match_status)}</span></td>
        </tr>
      `
        )
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Failed to load Query 8 match matrix: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function loadRoadmap(goalId) {
    const timeline = $('roadmapTimeline');
    const preview = $('dashTopRoadmapPreview');
    try {
      const res = await apiFetch(`/api/goals/${goalId}/generate-roadmap`, { method: 'POST' });
      const data = res?.data;
      if (!data) return;

      const summary = data.roadmap_summary || {};
      if ($('rmTotalTasks')) $('rmTotalTasks').textContent = summary.total_tasks || 0;
      if ($('rmTotalHours')) $('rmTotalHours').textContent = summary.total_estimated_duration_hours || 0;
      if ($('rmCriticalCount')) $('rmCriticalCount').textContent = summary.critical_priority_tasks || 0;
      if ($('rmHighCount')) $('rmHighCount').textContent = summary.high_priority_tasks || 0;

      const tasks = data.tasks || [];
      if (tasks.length === 0) {
        renderEmptyState(timeline, 'Curriculum Complete', 'All targeted skill gaps are remediated.');
        if (preview) renderEmptyState(preview, 'All Tasks Completed', 'Zero pending modules remain.');
        return;
      }

      const taskCardsHtml = tasks
        .map(
          (t) => `
        <div class="roadmap-task-card">
          <div class="task-left">
            <div class="task-order-badge">${safeNumber(t.sequence_order)}</div>
            <div>
              <div class="task-title">${escapeHtml(t.task_title)}</div>
              <div class="task-meta">
                <span>Duration: <strong>${safeNumber(t.estimated_duration_hours)}h</strong></span>
                <span>Provider: <strong>${escapeHtml(t.resource?.provider || 'Catalog Resource')}</strong></span>
                <span class="badge badge-${safeToken(t.severity, 'neutral')}">${escapeHtml(t.severity)}</span>
              </div>
            </div>
          </div>
          <span class="badge badge-neutral">${escapeHtml(t.status)}</span>
        </div>
      `
        )
        .join('');

      if (timeline) timeline.innerHTML = taskCardsHtml;
      if (preview) {
        preview.innerHTML = tasks
          .slice(0, 3)
          .map(
            (t) => `
          <div class="roadmap-task-card">
            <div class="task-left">
              <div class="task-order-badge">${safeNumber(t.sequence_order)}</div>
              <div>
                <div class="task-title">${escapeHtml(t.task_title)}</div>
                <div class="task-meta"><span>${safeNumber(t.estimated_duration_hours)}h &bull; ${escapeHtml(t.resource?.provider || 'Catalog')}</span></div>
              </div>
            </div>
            <span class="badge badge-${safeToken(t.severity, 'neutral')}">${escapeHtml(t.severity)}</span>
          </div>
        `
          )
          .join('');
      }
    } catch (err) {
      if (timeline) timeline.innerHTML = `<div class="loading-state">Failed to generate roadmap: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderProfilePage(user) {
    if ($('profileFullName')) $('profileFullName').textContent = user.full_name;

    // Education (Query 1)
    const eduList = $('profileEducationList');
    const edu = user.education || [];
    if (eduList) {
      if (edu.length === 0) {
        renderEmptyState(eduList, 'No Education Records', 'No formal degrees documented for this candidate yet.');
      } else {
        eduList.innerHTML = edu
          .map(
            (e) => `
          <div class="timeline-item">
            <div class="item-title">${escapeHtml(e.institution_name)}</div>
            <div class="item-sub">${escapeHtml(e.qualification_name || e.field_of_study || 'Academic Degree')} (Tier ${safeNumber(e.level_rank, 5)})</div>
            <div class="item-date">${escapeHtml(e.start_date || '')} &ndash; ${escapeHtml(e.end_date || 'Present')} &bull; Grade: ${escapeHtml(e.grade_or_score || 'Completed')}</div>
          </div>
        `
          )
          .join('');
      }
    }

    // Experiences (Query 3)
    const expList = $('profileExperienceList');
    const exp = user.experiences || [];
    if (expList) {
      if (exp.length === 0) {
        renderEmptyState(expList, 'No Experience Documented', 'Add past positions or internships to credit relevant tenure.');
      } else {
        expList.innerHTML = exp
          .map(
            (x) => `
          <div class="timeline-item">
            <div class="item-title">${escapeHtml(x.job_title)}</div>
            <div class="item-sub">${escapeHtml(x.organization_name)} (${escapeHtml(x.experience_type || 'full_time')})</div>
            <div class="item-date">${escapeHtml(x.start_date)} &ndash; ${escapeHtml(x.end_date || 'Present')}</div>
          </div>
        `
          )
          .join('');
      }
    }

    // Skills Portfolio (Query 2)
    const skillsChips = $('profileSkillsChips');
    const skills = user.skills || [];
    if (skillsChips) {
      if (skills.length === 0) {
        renderEmptyState(skillsChips, 'Empty Skill Portfolio', 'Add acquired skills to elevate your career readiness score.', '+ Add Skill', () => openModal('modalAddSkill'));
      } else {
        skillsChips.innerHTML = skills
          .map(
            (s) => `
          <div class="skill-chip">
            <span>${escapeHtml(s.skill_name)}</span>
            <span class="skill-chip-level">${escapeHtml(s.proficiency_level)}</span>
          </div>
        `
          )
          .join('');
      }
    }

    // Certifications
    const certsList = $('profileCertsList');
    const certs = user.certifications || [];
    if (certsList) {
      if (certs.length === 0) {
        renderEmptyState(certsList, 'No Active Certifications', 'Verified professional licenses boost readiness weighting by up to 10%.');
      } else {
        certsList.innerHTML = certs
          .map(
            (c) => `
          <div class="timeline-item">
            <div class="item-title">${escapeHtml(c.certification_name)}</div>
            <div class="item-sub">Status: <span class="badge badge-met">${escapeHtml(c.status)}</span></div>
          </div>
        `
          )
          .join('');
      }
    }

    // Career Breaks (FR-02)
    const breaksList = $('profileBreaksList');
    const breaks = user.career_breaks || [];
    if (breaksList) {
      if (breaks.length === 0) {
        renderEmptyState(breaksList, 'Continuous Career Tenure', 'No career pauses or breaks documented on file.', '+ Record Break', () => openModal('modalAddCareerBreak'));
      } else {
        breaksList.innerHTML = breaks
          .map(
            (b) => `
          <div class="timeline-item">
            <div class="item-title">${escapeHtml(b.break_reason.replace(/_/g, ' ').toUpperCase())}</div>
            <div class="item-sub">${escapeHtml(b.description || 'Career Pause')}</div>
            <div class="item-date">${escapeHtml(b.start_date)} to ${escapeHtml(b.end_date || 'Ongoing')}</div>
          </div>
        `
          )
          .join('');
      }
    }
  }

  async function loadAssessments(userId) {
    const tbody = $('assessmentHistoryTableBody');
    if (!tbody) return;
    try {
      const res = await apiFetch(`/api/users/${userId}/assessments`);
      const list = res?.data || [];

      tbody.innerHTML = list.length
        ? list
            .map(
              (a) => `
          <tr>
            <td><strong>${escapeHtml(a.assessment_name || a.title)}</strong></td>
            <td class="font-mono">${safeNumber(a.score)}</td>
            <td class="font-mono">${safeNumber(a.max_score)}</td>
            <td><span class="badge ${a.passed ? 'badge-met' : 'badge-not-met'}">${a.passed ? 'PASSED' : 'RETRY'}</span></td>
            <td>${a.assessment_date ? escapeHtml(a.assessment_date.substring(0, 10)) : 'Recent'}</td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="5" class="loading-cell">No skill assessment attempts recorded yet.</td></tr>';

      // Growth report (Query 14)
      const growthRes = await apiFetch(`/api/users/${userId}/growth`);
      const growth = growthRes?.data || [];
      const growthContainer = $('growthReportContainer');

      if (growthContainer) {
        if (growth.length === 0) {
          renderEmptyState(growthContainer, 'Single-Attempt Baseline', 'Retake an assessment to visualize longitudinal score growth deltas.');
        } else {
          growthContainer.innerHTML = growth
            .map(
              (g) => `
            <div class="gap-card low">
              <div>
                <div class="gap-info-main">${escapeHtml(g.assessment_name || g.full_name)}</div>
                <div class="gap-info-sub">
                  First: <strong>${safeNumber(g.first_attempt_score)}</strong> &rarr; Latest: <strong>${safeNumber(g.latest_attempt_score)}</strong>
                </div>
              </div>
              <span class="badge badge-met">+${safeNumber(g.score_improvement)} Improvement</span>
            </div>
          `
            )
            .join('');
        }
      }
    } catch {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Failed to load assessment history.</td></tr>';
    }
  }

  // --- COUNSELOR DATA LOADERS (DOMAIN 6 & DIRECTORY) ---
  async function loadCounselorData() {
    await Promise.all([
      loadCounselorDashboard(),
      loadCounselorRoster(),
      loadAtRiskCohort(),
      loadCareerBreakCohort(),
      loadTaskSummary(),
    ]);
  }

  async function loadCounselorDashboard() {
    const tbody = $('counselorDashboardTableBody');
    if (!tbody) return;
    try {
      const res = await apiFetch('/api/analytics/dashboard');
      const data = res?.data || [];
      state.dashboardAnalytics = data;

      if ($('kpiTotalCandidates')) $('kpiTotalCandidates').textContent = data.length;
      if (data.length > 0) {
        const avg = data.reduce((sum, d) => sum + parseFloat(d.overall_readiness_pct || 0), 0) / data.length;
        if ($('kpiAvgReadiness')) $('kpiAvgReadiness').textContent = `${avg.toFixed(1)}%`;
        const totalGaps = data.reduce((sum, d) => sum + parseInt(d.total_gaps || 0, 10), 0);
        if ($('kpiTotalGaps')) $('kpiTotalGaps').textContent = totalGaps;
        const totalTasks = data.reduce((sum, d) => sum + parseInt(d.total_learning_tasks || 0, 10), 0);
        if ($('kpiLearningTasks')) $('kpiLearningTasks').textContent = totalTasks;
      }

      tbody.innerHTML = data
        .map(
          (row, idx) => `
        <tr>
          <td><strong>${escapeHtml(row.candidate_name)}</strong></td>
          <td><span class="badge badge-indigo">${escapeHtml(row.target_role)}</span></td>
          <td>${escapeHtml(row.career_field || 'Professional')}</td>
          <td class="font-mono">
            <span class="badge ${parseFloat(row.overall_readiness_pct) >= 60 ? 'badge-met' : 'badge-not-met'}">
              ${safeNumber(row.overall_readiness_pct)}%
            </span>
          </td>
          <td><span class="badge badge-neutral">${safeNumber(row.total_gaps)} Gaps</span></td>
          <td class="font-mono">${safeNumber(row.completed_learning_tasks)} / ${safeNumber(row.total_learning_tasks)}</td>
          <td>
            <div class="d-flex align-center gap-2">
              <div class="progress-track progress-track-sm">
                <div class="progress-bar-fill fill-indigo" data-progress="${safePercent(row.roadmap_progress_pct)}"></div>
              </div>
              <span class="font-mono text-mono-xs">${safePercent(row.roadmap_progress_pct)}%</span>
            </div>
          </td>
          <td>
            <button type="button" class="btn btn-outline btn-sm btn-audit-candidate" data-candidate-name="${escapeHtml(row.candidate_name)}">Audit</button>
          </td>
        </tr>
      `
        )
        .join('');
      tbody.querySelectorAll('.progress-bar-fill[data-progress]').forEach((bar) => {
        bar.style.width = `${safePercent(bar.dataset.progress)}%`;
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="loading-cell">Counselor role required: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function loadCounselorRoster() {
    const tbody = $('counselorRosterTableBody');
    if (!tbody) return;
    try {
      const res = await apiFetch('/api/users');
      const users = res?.data || [];
      state.rosterCandidates = users;

      // Dynamically update top-bar session switcher with real DB users
      populateSessionSwitcherOptions(users);

      renderRosterTable(users);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">Counselor authentication required to list directory: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderRosterTable(users) {
    const tbody = $('counselorRosterTableBody');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No candidates match filter criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td class="font-mono"><strong>#${safeNumber(u.user_id)}</strong></td>
        <td><strong>${escapeHtml(u.full_name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.state_or_region || 'N/A')}</td>
        <td>${escapeHtml(u.country)}</td>
        <td class="font-mono">${u.created_at ? escapeHtml(u.created_at.substring(0, 10)) : '2026-01-01'}</td>
        <td>
          <button type="button" class="btn btn-outline btn-sm btn-audit-candidate" data-user-id="${safeNumber(u.user_id)}" data-candidate-name="${escapeHtml(u.full_name)}">Inspect Profile</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  async function inspectCandidateByIdOrName(userId, name) {
    let targetId = userId ? parseInt(userId, 10) : null;
    if (!targetId && name && state.rosterCandidates.length > 0) {
      const match = state.rosterCandidates.find((u) => u.full_name.toLowerCase().includes(name.toLowerCase()));
      if (match) targetId = match.user_id;
    }
    if (!targetId) targetId = 1;

    // Note: Counselor has permission via requireOwnershipOrCounselor to load any candidate directly OR switch persona
    if (state.userRole === 'counselor' || state.userRole === 'admin') {
      await loadCandidateData(targetId);
      navigate('candidate-dashboard');
      showAlert(`Inspecting Candidate #${targetId} under Counselor Supervisory Authority`, 'success');
    } else {
      await switchPersona(`candidate-${targetId}`, 'candidate-dashboard');
    }
  }

  async function loadAtRiskCohort() {
    const container = $('atRiskCandidatesList');
    if (!container) return;
    try {
      const res = await apiFetch('/api/analytics/at-risk');
      const list = res?.data || [];
      if ($('atRiskCountBadge')) $('atRiskCountBadge').textContent = `${list.length} At-Risk`;

      if (list.length === 0) {
        renderEmptyState(container, 'Healthy Cohort Readiness', 'Zero candidates currently score below the 60% readiness threshold.');
        return;
      }

      container.innerHTML = list
        .map(
          (c) => `
        <div class="gap-card critical">
          <div>
            <div class="gap-info-main">${escapeHtml(c.full_name || c.candidate_name)} &bull; <span class="font-mono">${safeNumber(c.overall_readiness_pct)}%</span></div>
            <div class="gap-info-sub">Role: <strong>${escapeHtml(c.target_role)}</strong> &bull; ${escapeHtml(c.email)}</div>
          </div>
          <span class="badge badge-critical">Intervention Needed</span>
        </div>
      `
        )
        .join('');
    } catch {
      container.innerHTML = '<div class="loading-state">Requires counselor privilege.</div>';
    }
  }

  async function loadCareerBreakCohort() {
    const container = $('careerBreakCohortList');
    if (!container) return;
    try {
      const res = await apiFetch('/api/analytics/career-breaks');
      const list = res?.data || [];

      if (list.length === 0) {
        renderEmptyState(container, 'No Career Break Cohorts', 'No candidates with documented career breaks in this filter.');
        return;
      }

      container.innerHTML = list
        .map(
          (b) => `
        <div class="gap-card high">
          <div>
            <div class="gap-info-main">${escapeHtml(b.full_name)} &bull; ${escapeHtml(b.target_role)}</div>
            <div class="gap-info-sub">Reason: <strong>${escapeHtml(b.break_reason || 'Career Pause')}</strong> &bull; Readiness: <span class="font-mono">${safeNumber(b.overall_readiness_pct)}%</span></div>
          </div>
          <span class="badge badge-high">Break Cohort</span>
        </div>
      `
        )
        .join('');
    } catch {
      container.innerHTML = '<div class="loading-state">Requires counselor privilege.</div>';
    }
  }

  async function loadTaskSummary() {
    const tbody = $('taskSummaryTableBody');
    if (!tbody) return;
    try {
      const res = await apiFetch('/api/analytics/task-summary');
      const list = res?.data || [];

      tbody.innerHTML = list
        .map(
          (t) => `
        <tr>
          <td><strong>${escapeHtml(t.candidate_name)}</strong></td>
          <td><span class="badge badge-indigo">${escapeHtml(t.target_role)}</span></td>
          <td class="font-mono">${safeNumber(t.total_tasks)}</td>
          <td class="font-mono">${safeNumber(t.completed_tasks)}</td>
          <td class="font-mono">${safeNumber(t.in_progress_tasks)}</td>
          <td class="font-mono">${safeNumber(t.pending_tasks)}</td>
          <td class="font-mono"><strong>${safeNumber(t.completion_rate_pct)}%</strong></td>
        </tr>
      `
        )
        .join('');
    } catch {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Requires counselor privilege.</td></tr>';
    }
  }

  // --- CATALOG EXPLORER ---
  async function loadCatalog() {
    try {
      const [rolesRes, skillsRes, assessRes] = await Promise.all([
        apiFetch('/api/catalog/roles', { silent: true }),
        apiFetch('/api/catalog/skills', { silent: true }),
        apiFetch('/api/assessments', { silent: true }),
      ]);

      state.catalogRoles = rolesRes?.data || [];
      const roleSelect = $('catalogRoleSelect');
      if (roleSelect && state.catalogRoles.length > 0) {
        roleSelect.innerHTML = state.catalogRoles
          .map((r) => `<option value="${safeNumber(r.role_id)}">${escapeHtml(r.role_title)} (${safeNumber(r.mandatory_count)} Mandatory Req.)</option>`)
          .join('');
        roleSelect.addEventListener('change', () => inspectCatalogRole(roleSelect.value));
        await inspectCatalogRole(state.catalogRoles[0].role_id);
      }

      state.catalogSkills = skillsRes?.data || [];
      const sSelect = $('selectSkillId');
      if (sSelect && state.catalogSkills.length > 0) {
        sSelect.innerHTML = state.catalogSkills
          .map((s) => `<option value="${safeNumber(s.skill_id)}">${escapeHtml(s.skill_name)} (${escapeHtml(s.category || 'General')})</option>`)
          .join('');
      }

      const aSelect = $('assessmentSelect');
      if (aSelect && assessRes?.data) {
        aSelect.innerHTML = assessRes.data
          .map((a) => `<option value="${safeNumber(a.assessment_id)}">${escapeHtml(a.assessment_name)} (Max: ${safeNumber(a.max_score)}, Pass: ${safeNumber(a.passing_score)})</option>`)
          .join('');
      }
    } catch (err) {
      console.error('Catalog initialization error:', err);
    }
  }

  async function inspectCatalogRole(roleId) {
    try {
      const res = await apiFetch(`/api/catalog/roles/${roleId}`, { silent: true });
      const role = res?.data;
      if (!role) return;

      if ($('catalogRoleDetails')) {
        $('catalogRoleDetails').innerHTML = `
          <div class="gap-card low">
            <div>
              <div class="gap-info-main">${escapeHtml(role.role_title)}</div>
              <div class="gap-info-sub">${escapeHtml(role.description || 'Industry Normalized Role Definition')}</div>
              <div class="task-meta mt-2">
                <span>Jurisdiction: <strong>${escapeHtml(role.jurisdiction || 'India')}</strong></span>
                <span>Required Exp: <strong>${safeNumber(role.experience_years_required)} Years</strong></span>
              </div>
            </div>
          </div>
        `;
      }

      const reqList = $('catalogRequirementsList');
      const reqs = role.requirements || [];
      if (reqList) {
        reqList.innerHTML = reqs.length
          ? reqs
              .map(
                (rq) => `
            <div class="timeline-item mb-3">
              <div class="item-title">
                <span class="badge badge-indigo">${escapeHtml(rq.requirement_type)}</span>
                ${escapeHtml(rq.requirement_target_name || rq.description)}
              </div>
              <div class="item-sub mt-1">
                ${rq.is_mandatory ? '<span class="badge badge-critical">Mandatory</span>' : '<span class="badge badge-low">Optional</span>'}
                Expected Proficiency: <strong>${escapeHtml(rq.expected_proficiency || 'Standard')}</strong>
              </div>
            </div>
          `
              )
              .join('')
          : '<p class="text-muted">No polymorphic requirements mapped.</p>';
      }
    } catch {
      // Handled
    }
  }

  // --- EVENT LISTENERS & DELEGATION ---
  function setupEventListeners() {
    // 1. Mobile Sidebar Toggle
    $('btnMobileMenu')?.addEventListener('click', () => {
      $('appSidebar')?.classList.toggle('mobile-open');
      $('sidebarBackdrop')?.classList.toggle('active');
    });

    $('sidebarBackdrop')?.addEventListener('click', () => {
      $('appSidebar')?.classList.remove('mobile-open');
      $('sidebarBackdrop')?.classList.remove('active');
    });

    // 2. Client-Side Navigation Links ([data-nav])
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', async () => {
        const targetPage = el.dataset.nav;
        const route = ROUTES[targetPage];

        // If user clicks a Candidate page without an active candidate/counselor session yet, initialize candidate session cleanly
        if (route?.group === 'candidate' && state.userRole === 'guest') {
          await switchPersona('candidate-1', targetPage);
          return;
        }
        // If user clicks Counselor page while guest or candidate, switch/show RBAC or counselor prompt
        if (route?.group === 'counselor' && state.userRole === 'guest') {
          await switchPersona('counselor', targetPage);
          return;
        }

        navigate(targetPage);
      });
    });

    // 3. Landing Page Quick CTAs
    $('btnLandingCandidate')?.addEventListener('click', () => switchPersona('candidate-1', 'candidate-dashboard'));
    $('btnLandingCounselor')?.addEventListener('click', () => switchPersona('counselor', 'counselor-dashboard'));
    $('btnLandingAuth')?.addEventListener('click', () => navigate('auth'));

    // 4. Top Command Bar Actions
    $('userSelect')?.addEventListener('change', (e) => switchPersona(e.target.value));
    $('btnRefresh')?.addEventListener('click', () => {
      if (state.userRole === 'counselor' || state.userRole === 'admin') {
        loadCounselorData();
      } else if (state.userId) {
        loadCandidateData(state.userId);
      } else {
        syncHealthAndSession();
      }
      showAlert('Data synchronized with PostgreSQL', 'success');
    });

    // 5. Dashboard & Analysis Actions
    $('btnDashRunAnalysis')?.addEventListener('click', () => {
      if (state.goalId) runMultiFactorAnalysis(state.goalId, true);
    });
    $('btnTriggerAnalysis')?.addEventListener('click', () => {
      if (state.goalId) runMultiFactorAnalysis(state.goalId, true);
    });
    $('btnGenerateRoadmap')?.addEventListener('click', () => {
      if (state.goalId) {
        loadRoadmap(state.goalId);
        showAlert('Learning roadmap regenerated successfully', 'success');
      }
    });
    $('btnRefreshAnalytics')?.addEventListener('click', () => loadCounselorData());
    $('btnRefreshRoster')?.addEventListener('click', () => loadCounselorRoster());

    // 6. Candidate Directory Search Filter
    $('candidateSearchInput')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.rosterCandidates.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.country || '').toLowerCase().includes(q) ||
          (u.state_or_region || '').toLowerCase().includes(q)
      );
      renderRosterTable(filtered);
    });

    // 7. Delegated Table Action Buttons ("Audit" / "Inspect Profile")
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-audit-candidate');
      if (btn) {
        inspectCandidateByIdOrName(btn.dataset.userId, btn.dataset.candidateName);
      }
    });

    // 8. Quiz Submission
    $('quizSubmitForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const aId = $('assessmentSelect').value;
      const score = parseFloat($('quizScoreInput').value);

      try {
        await apiFetch(`/api/assessments/${aId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ user_id: state.userId, score }),
        });
        showAlert(`Assessment submitted! Verified score: ${score}`, 'success');
        await loadAssessments(state.userId);
      } catch (err) {
        showAlert(`Assessment rejected: ${err.message}`, 'error');
      }
    });

    // 9. Modal Close Handlers
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
      }
    });

    // 10. Edit Profile Modal
    $('btnOpenEditProfile')?.addEventListener('click', () => {
      if (state.currentUser) {
        $('editFullName').value = state.currentUser.full_name || '';
        $('editRegion').value = state.currentUser.state_or_region || '';
        $('editCountry').value = state.currentUser.country || '';
        $('editPhone').value = state.currentUser.phone || '';
        $('editDob').value = state.currentUser.date_of_birth ? state.currentUser.date_of_birth.substring(0, 10) : '';
      }
      openModal('modalEditProfile');
    });

    $('formEditProfile')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        full_name: $('editFullName').value.trim(),
        state_or_region: $('editRegion').value.trim() || null,
        country: $('editCountry').value.trim(),
        phone: $('editPhone').value.trim() || null,
        date_of_birth: $('editDob').value || null,
      };
      try {
        await apiFetch(`/api/users/${state.userId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showAlert('Candidate profile updated in PostgreSQL', 'success');
        closeModal('modalEditProfile');
        await loadCandidateData(state.userId);
      } catch (err) {
        showAlert(`Update failed: ${err.message}`, 'error');
      }
    });

    // 11. Add Skill Modal
    $('btnOpenAddSkill')?.addEventListener('click', () => openModal('modalAddSkill'));
    $('formAddSkill')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        skill_id: parseInt($('selectSkillId').value, 10),
        proficiency_level: $('selectProficiency').value,
        years_of_experience: parseFloat($('inputSkillYears').value) || 0,
        evidence: $('inputSkillEvidence').value.trim() || null,
      };
      try {
        await apiFetch(`/api/users/${state.userId}/skills`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showAlert('Skill added to portfolio', 'success');
        closeModal('modalAddSkill');
        await loadCandidateData(state.userId);
      } catch (err) {
        showAlert(`Add skill failed: ${err.message}`, 'error');
      }
    });

    // 12. Record Career Break Modal
    $('btnOpenAddBreak')?.addEventListener('click', () => openModal('modalAddCareerBreak'));
    $('formAddCareerBreak')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        break_reason: $('selectBreakReason').value,
        start_date: $('inputBreakStart').value,
        end_date: $('inputBreakEnd').value || null,
        description: $('inputBreakDesc').value.trim() || null,
      };
      try {
        await apiFetch(`/api/users/${state.userId}/career-breaks`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showAlert('Career break documented safely', 'success');
        closeModal('modalAddCareerBreak');
        await loadCandidateData(state.userId);
      } catch (err) {
        showAlert(`Failed to record break: ${err.message}`, 'error');
      }
    });

    // 13. RBAC Security Barrier Tester
    $('btnTestRbacBlocked')?.addEventListener('click', async () => {
      const resultContainer = $('rbacTestResult');
      const statusBadge = $('rbacStatusBadge');
      const jsonOutput = $('rbacJsonOutput');
      const timeOutput = $('rbacResultTimestamp');

      resultContainer.classList.remove('hidden');
      timeOutput.textContent = new Date().toLocaleTimeString();
      jsonOutput.textContent = 'Probing GET /api/analytics/dashboard as candidate...';

      const prevRole = state.userRole;
      try {
        if (prevRole === 'counselor' || prevRole === 'admin') {
          await apiFetch('/api/auth/demo-session', {
            method: 'POST',
            body: JSON.stringify({ persona: 'candidate-1' }),
          });
        }

        const res = await fetch('/api/analytics/dashboard', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'same-origin',
        });

        const data = await res.json().catch(() => ({}));
        statusBadge.textContent = `HTTP ${res.status} ${res.status === 403 ? 'FORBIDDEN_ROLE' : 'STATUS'}`;
        statusBadge.className = res.status === 403 || res.status === 401 ? 'badge badge-critical' : 'badge badge-met';
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        showAlert(`RBAC Boundary Verified: HTTP ${res.status} Returned`, res.status === 403 ? 'error' : 'success');

        if (prevRole === 'counselor' || prevRole === 'admin') {
          const restoreRes = await apiFetch('/api/auth/demo-session', {
            method: 'POST',
            body: JSON.stringify({ persona: 'counselor' }),
          });
          if (restoreRes?.data?.csrfToken) state.csrfToken = restoreRes.data.csrfToken;
        }
      } catch (err) {
        jsonOutput.textContent = JSON.stringify({ error: err.message }, null, 2);
      }
    });

    // 14. Page 2 Auth Tabs + Modal 4 Auth Tabs
    document.querySelectorAll('[data-page-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-page-auth-tab]').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('#page-auth .auth-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.pageAuthTab)?.classList.add('active');
      });
    });

    document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-auth-tab]').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('#modalAuth .auth-tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.authTab)?.classList.add('active');
      });
    });

    async function refreshSessionInfo() {
      const info = $('sessionIdentityInfo');
      if (!info) return;
      try {
        const res = await apiFetch('/api/auth/me', { silent: true });
        if (res?.data?.user) {
          info.innerHTML = `Signed in as <strong>${escapeHtml(res.data.user.email)}</strong> (${escapeHtml(res.data.user.role).toUpperCase()}) &bull; ID #${safeNumber(res.data.user.user_id)}`;
        } else {
          info.textContent = 'No active authenticated session.';
        }
      } catch {
        info.textContent = 'Unauthenticated guest session.';
      }
    }

    $('btnOpenAuthModal')?.addEventListener('click', async () => {
      openModal('modalAuth');
      await refreshSessionInfo();
    });

    $('btnSidebarAuth')?.addEventListener('click', async () => {
      openModal('modalAuth');
      await refreshSessionInfo();
    });

    $('btnCheckSessionMe')?.addEventListener('click', refreshSessionInfo);

    $('btnAuthLogout')?.addEventListener('click', async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        state.userRole = 'guest';
        state.userId = null;
        state.currentUser = null;
        if ($('sidebarAvatar')) $('sidebarAvatar').textContent = 'SB';
        if ($('sidebarUserName')) $('sidebarUserName').textContent = 'Not Signed In';
        if ($('sidebarUserRole')) $('sidebarUserRole').textContent = 'Guest Session';
        $('navGroupCounselor')?.classList.remove('hidden');
        $('navGroupCandidate')?.classList.remove('hidden');
        closeModal('modalAuth');
        navigate('landing');
        showAlert('Session terminated and cookies cleared', 'success');
        await refreshSessionInfo();
      } catch (err) {
        showAlert(`Logout error: ${err.message}`, 'error');
      }
    });

    // Reusable Auth Form Submit Binding
    function bindRegisterForm(formId, nameId, emailId, passId, regId, countryId) {
      $(formId)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              full_name: $(nameId).value.trim(),
              email: $(emailId).value.trim(),
              password: $(passId).value,
              state_or_region: $(regId).value.trim() || undefined,
              country: $(countryId).value.trim(),
            }),
          });
          applySessionIdentity(res?.data?.user, res?.data?.csrfToken);
          closeModal('modalAuth');
          showAlert(`Account created: ${res?.data?.user?.email}`, 'success');
          await loadCandidateData(res?.data?.user?.user_id);
          navigate('candidate-dashboard');
        } catch (err) {
          showAlert(`Registration error: ${err.message}`, 'error');
        }
      });
    }

    function bindLoginForm(formId, emailId, passId) {
      $(formId)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: $(emailId).value.trim(),
              password: $(passId).value,
            }),
          });
          applySessionIdentity(res?.data?.user, res?.data?.csrfToken);
          closeModal('modalAuth');
          showAlert(`Authenticated: ${res?.data?.user?.email}`, 'success');
          if (state.userRole === 'counselor' || state.userRole === 'admin') {
            await loadCounselorData();
            navigate('counselor-dashboard');
          } else {
            await loadCandidateData(state.userId);
            navigate('candidate-dashboard');
          }
        } catch (err) {
          showAlert(`Authentication failed: ${err.message}`, 'error');
        }
      });
    }

    function bindActivateForm(formId, tokenId, passId) {
      $(formId)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await apiFetch('/api/auth/activate-account', {
            method: 'POST',
            body: JSON.stringify({
              token: $(tokenId).value.trim(),
              password: $(passId).value,
            }),
          });
          applySessionIdentity(res?.data?.user, res?.data?.csrfToken);
          closeModal('modalAuth');
          showAlert('Account activated with single-use token!', 'success');
          if (state.userRole === 'counselor' || state.userRole === 'admin') {
            await loadCounselorData();
            navigate('counselor-dashboard');
          } else {
            await loadCandidateData(state.userId);
            navigate('candidate-dashboard');
          }
        } catch (err) {
          showAlert(`Activation failed: ${err.message}`, 'error');
        }
      });
    }

    // Bind both Page 2 forms and Modal 4 forms
    bindRegisterForm('pageFormRegister', 'pageRegFullName', 'pageRegEmail', 'pageRegPassword', 'pageRegRegion', 'pageRegCountry');
    bindLoginForm('pageFormLogin', 'pageLoginEmail', 'pageLoginPassword');
    bindActivateForm('pageFormActivate', 'pageActToken', 'pageActPassword');

    bindRegisterForm('formAuthRegister', 'regFullName', 'regEmail', 'regPassword', 'regRegion', 'regCountry');
    bindLoginForm('formAuthLogin', 'loginEmail', 'loginPassword');
    bindActivateForm('formAuthActivate', 'actToken', 'actPassword');
  }

  // Expose minimal namespace for external diagnostic scripts if needed
  window.SkillBridge = {
    navigate,
    switchPersona,
    loadCounselorRoster,
    inspectCandidate: (name) => inspectCandidateByIdOrName(null, name),
  };

  // --- BOOTSTRAP ---
  async function init() {
    setupEventListeners();
    await loadCatalog();
    const hasSession = await syncHealthAndSession();
    const hashPage = window.location.hash ? window.location.hash.replace('#', '') : '';

    if (hashPage && ROUTES[hashPage]) {
      if (!hasSession && ROUTES[hashPage].group === 'counselor') {
        await switchPersona('counselor', hashPage);
      } else if (!hasSession && ROUTES[hashPage].group === 'candidate') {
        await switchPersona('candidate-1', hashPage);
      } else {
        navigate(hashPage);
      }
      return;
    }

    if (!hasSession) {
      navigate('landing');
    } else if (state.userRole === 'counselor' || state.userRole === 'admin') {
      navigate('counselor-dashboard');
    } else {
      navigate('candidate-dashboard');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
