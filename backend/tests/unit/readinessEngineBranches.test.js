import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/db.js';
import { readinessEngine } from '../../src/services/readinessEngine.js';
import { NotFoundError } from '../../src/errors/NotFoundError.js';

describe('ReadinessEngine Comprehensive Unit Tests (Branches & Edge Cases)', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('throws NotFoundError when goal is not found in database', async () => {
    mock.method(pool, 'query', async () => ({ rows: [] }));

    await assert.rejects(
      () => readinessEngine.evaluateGoalReadiness(99999),
      (err) => {
        assert.ok(err instanceof NotFoundError);
        assert.match(err.message, /Career goal with goal_id = 99999 was not found/);
        return true;
      }
    );
  });

  it('evaluates candidate achieving job_ready status (>= 80%) with full skills, degree, and certs', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 101,
            user_id: 201,
            role_id: 1,
            status: 'active',
            target_date: '2026-12-31',
            role_title: 'Senior Software Engineer',
            field_id: 1,
            experience_years_required: '3.0',
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 1,
              requirement_type: 'skill',
              skill_id: 10,
              expected_proficiency: 'advanced',
              is_mandatory: true,
              priority: 1,
              skill_name: 'JavaScript',
            },
            {
              requirement_id: 2,
              requirement_type: 'education',
              qualification_type_id: 3,
              expected_proficiency: null,
              is_mandatory: true,
              priority: 2,
              level_rank: 6, // Bachelor's
              qualification_name: 'Bachelor of Science',
            },
            {
              requirement_id: 3,
              requirement_type: 'certification',
              certification_id: 5,
              expected_proficiency: null,
              is_mandatory: false,
              priority: 3,
              certification_name: 'AWS Solutions Architect',
            },
          ],
        };
      }
      if (sql.includes('FROM user_skills')) {
        return {
          rows: [
            { skill_id: 10, skill_name: 'JavaScript', proficiency_level: 'expert', years_of_experience: 5 },
          ],
        };
      }
      if (sql.includes('FROM education_records')) {
        return {
          rows: [
            { qualification_type_id: 3, level_rank: 7, type_name: "Master's Degree", end_date: '2024-05-01' },
          ],
        };
      }
      if (sql.includes('FROM user_experiences')) {
        return {
          rows: [
            { start_date: '2021-01-01', end_date: '2024-01-01', field_id: 1 }, // 36 months
          ],
        };
      }
      if (sql.includes('FROM user_certifications')) {
        return {
          rows: [
            { certification_id: 5, status: 'active' },
          ],
        };
      }
      if (sql.includes('FROM career_breaks')) {
        return { rows: [] }; // No break
      }
      if (sql.includes('FROM assessment_results')) {
        return {
          rows: [
            { assessment_id: 1, skill_id: 10, score: 95, passed: true, max_score: 100 },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await readinessEngine.evaluateGoalReadiness(101);

    assert.equal(res.goal_id, 101);
    assert.equal(res.user_id, 201);
    assert.equal(res.category, 'job_ready');
    assert.ok(res.overall_readiness_pct >= 80.0, `Expected >= 80%, got ${res.overall_readiness_pct}`);
    assert.equal(res.breakdown.skills_score_pct, 100.0);
    assert.equal(res.breakdown.education_score_pct, 100.0);
    assert.equal(res.breakdown.experience_score_pct, 100.0);
    assert.equal(res.breakdown.certifications_score_pct, 100.0);
    assert.equal(res.breakdown.assessments_score_pct, 100.0);
    assert.equal(res.gap_count, 0);
  });

  it('evaluates candidate in developing status (60% - 79.9%) with partial skill match and missing cert', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 102,
            user_id: 202,
            role_id: 2,
            status: 'active',
            target_date: null,
            role_title: 'Frontend Developer',
            field_id: 1,
            experience_years_required: '2.0', // 24 months
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 11,
              requirement_type: 'skill',
              skill_id: 20,
              expected_proficiency: 'advanced', // rank 3
              is_mandatory: true,
              priority: 1,
              skill_name: 'React',
            },
            {
              requirement_id: 12,
              requirement_type: 'skill',
              skill_id: 21,
              expected_proficiency: 'intermediate', // rank 2
              is_mandatory: false,
              priority: 2,
              skill_name: 'CSS',
            },
            {
              requirement_id: 13,
              requirement_type: 'education',
              qualification_type_id: 2,
              is_mandatory: true,
              level_rank: 6, // Bachelor's
              qualification_name: 'Bachelor of Technology',
            },
            {
              requirement_id: 14,
              requirement_type: 'certification',
              certification_id: 9,
              is_mandatory: false,
              priority: 3,
              certification_name: 'Certified React Developer',
            },
          ],
        };
      }
      if (sql.includes('FROM user_skills')) {
        return {
          rows: [
            // React: intermediate (rank 2) vs required advanced (rank 3) -> partial match ratio 2/3
            { skill_id: 20, skill_name: 'React', proficiency_level: 'intermediate', years_of_experience: 1 },
            // CSS: missing
          ],
        };
      }
      if (sql.includes('FROM education_records')) {
        return {
          // Master's rank 7 vs required Bachelor rank 6 -> 1.0 * 0.2 = 0.2
          rows: [{ qualification_type_id: 2, level_rank: 7, type_name: 'Master of Technology', end_date: '2023-01-01' }],
        };
      }
      if (sql.includes('FROM user_experiences')) {
        return {
          // 24 months vs required 24 months -> expScore = 1.0 * 0.2 = 0.2
          rows: [{ start_date: '2022-01-01', end_date: '2024-01-01', field_id: 1 }],
        };
      }
      if (sql.includes('FROM user_certifications')) {
        return { rows: [] }; // 0 certs held
      }
      if (sql.includes('FROM career_breaks')) {
        return { rows: [] };
      }
      if (sql.includes('FROM assessment_results')) {
        return {
          rows: [
            { assessment_id: 10, skill_id: 20, score: 90, passed: true, max_score: 100 },
            { assessment_id: 11, skill_id: 21, score: 85, passed: true, max_score: 100 },
          ],
        };
      }
      return { rows: [] };
    });

    const res = await readinessEngine.evaluateGoalReadiness(102);

    assert.equal(res.goal_id, 102);
    assert.equal(res.category, 'developing');
    assert.ok(res.overall_readiness_pct >= 60.0 && res.overall_readiness_pct < 80.0, `Expected 60-79.9%, got ${res.overall_readiness_pct}`);
    assert.ok(res.gap_count >= 3, `Expected at least 3 gaps, got ${res.gap_count}`);

    // Verify partial skill gap recorded
    const reactGap = res.gaps.find((g) => g.skill_id === 20);
    assert.ok(reactGap);
    assert.match(reactGap.description, /below required/);

    // Verify missing skill gap recorded
    const cssGap = res.gaps.find((g) => g.skill_id === 21);
    assert.ok(cssGap);
    assert.match(cssGap.description, /Missing required skill/);

    // Verify certification gap recorded
    const certGap = res.gaps.find((g) => g.gap_type === 'Certification Gap');
    assert.ok(certGap);
    assert.equal(certGap.severity, 'medium'); // optional cert -> medium severity
  });

  it('evaluates at_risk candidate with zero experience, missing degree, and career break staleness penalty', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 103,
            user_id: 203,
            role_id: 3,
            status: 'exploring',
            target_date: null,
            role_title: 'DevOps Engineer',
            field_id: 1,
            experience_years_required: '1.0', // 12 months
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 31,
              requirement_type: 'skill',
              skill_id: 50,
              expected_proficiency: 'intermediate',
              is_mandatory: true,
              priority: 1,
              skill_name: 'Kubernetes',
            },
            {
              requirement_id: 32,
              requirement_type: 'education',
              qualification_type_id: 4,
              is_mandatory: true,
              level_rank: 6,
              qualification_name: 'Bachelor Degree',
            },
          ],
        };
      }
      if (sql.includes('FROM user_skills')) {
        return { rows: [] }; // No skills on file
      }
      if (sql.includes('FROM education_records')) {
        return { rows: [] }; // No education records -> eduScore = 0.3
      }
      if (sql.includes('FROM user_experiences')) {
        return { rows: [] }; // 0 experience -> critical gap
      }
      if (sql.includes('FROM user_certifications')) {
        return { rows: [] };
      }
      if (sql.includes('FROM career_breaks')) {
        return {
          // 18 month career break -> break penalty triggered
          rows: [{ start_date: '2023-01-01', end_date: '2024-07-01', break_reason: 'caregiving' }],
        };
      }
      if (sql.includes('FROM assessment_results')) {
        return { rows: [] }; // empty assessments -> defaults to 0.5 neutral
      }
      return { rows: [] };
    });

    const res = await readinessEngine.evaluateGoalReadiness(103);

    assert.equal(res.category, 'at_risk');
    assert.ok(res.overall_readiness_pct < 60.0, `Expected < 60%, got ${res.overall_readiness_pct}`);

    // Verify 0 experience critical gap
    const expGap = res.gaps.find((g) => g.gap_type === 'Experience Gap');
    assert.ok(expGap);
    assert.equal(expGap.severity, 'critical');

    // Verify missing formal degree gap
    const eduGap = res.gaps.find((g) => g.gap_type === 'Education Gap');
    assert.ok(eduGap);
    assert.match(eduGap.description, /Missing formal education degree record/);
    assert.equal(eduGap.severity, 'high');

    // Verify career break staleness gap
    const breakGap = res.gaps.find((g) => g.gap_type === 'Career Break Impact');
    assert.ok(breakGap);
    assert.match(breakGap.description, /Career break of 18 months/);
    assert.equal(breakGap.priority, 1);
  });

  it('generates sequenced learning roadmap mapping gaps to catalog resources and self-directed fallbacks', async () => {
    mock.method(pool, 'query', async (sql) => {
      // Goal evaluation queries
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 104,
            user_id: 204,
            role_id: 4,
            status: 'active',
            role_title: 'Cloud Architect',
            field_id: 1,
            experience_years_required: '2.0',
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 41,
              requirement_type: 'skill',
              skill_id: 88,
              expected_proficiency: 'intermediate',
              is_mandatory: true,
              priority: 1,
              skill_name: 'Terraform',
            },
            {
              requirement_id: 42,
              requirement_type: 'skill',
              skill_id: 99,
              expected_proficiency: 'advanced',
              is_mandatory: false,
              priority: 2,
              skill_name: 'Ansible',
            },
          ],
        };
      }
      if (sql.includes('FROM user_skills') || sql.includes('FROM education_records') ||
          sql.includes('FROM user_experiences') || sql.includes('FROM user_certifications') ||
          sql.includes('FROM career_breaks') || sql.includes('FROM assessment_results')) {
        return { rows: [] };
      }
      // Roadmap catalog query
      if (sql.includes('FROM learning_resources')) {
        return {
          rows: [
            {
              resource_id: 301,
              resource_name: 'Terraform Infrastructure as Code Mastery',
              resource_type: 'interactive_course',
              provider: 'CloudAcademy',
              estimated_duration_hours: 40,
              cost: 199.99,
              description: 'Comprehensive Terraform hands-on course',
              skill_id: 88, // Matches Terraform
              proficiency_taught: 'intermediate',
            },
            // Ansible (skill_id 99) has no resource in catalog -> should use self-directed fallback
          ],
        };
      }
      return { rows: [] };
    });

    const roadmap = await readinessEngine.generateLearningRoadmap(104);

    assert.equal(roadmap.goal_id, 104);
    assert.equal(roadmap.target_role, 'Cloud Architect');
    assert.ok(roadmap.tasks.length >= 2);

    // Verify Terraform matched catalog resource
    const tfTask = roadmap.tasks.find((t) => t.task_title.includes('Terraform'));
    assert.ok(tfTask);
    assert.equal(tfTask.resource.resource_id, 301);
    assert.equal(tfTask.resource.provider, 'CloudAcademy');
    assert.equal(tfTask.estimated_duration_hours, 40);

    // Verify Ansible used self-directed learning fallback
    const ansibleTask = roadmap.tasks.find((t) => t.task_title.includes('Ansible'));
    assert.ok(ansibleTask);
    assert.equal(ansibleTask.resource.type, 'self_study');
    assert.equal(ansibleTask.resource.cost, 0);

    // Verify sequencing order
    assert.equal(roadmap.tasks[0].sequence_order, 1);
    assert.equal(roadmap.tasks[1].sequence_order, 2);
    assert.ok(roadmap.roadmap_summary.total_estimated_duration_hours > 0);
  });

  it('handles ongoing experiences/breaks (null end_date), default 12-month exp, and partial education rank', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 105,
            user_id: 205,
            role_id: 5,
            status: 'active',
            role_title: 'Junior QA Analyst',
            experience_years_required: null, // tests default to 12 months
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 51,
              requirement_type: 'education',
              qualification_type_id: 2,
              level_rank: 6, // Bachelor's required
              is_mandatory: true,
            },
          ],
        };
      }
      if (sql.includes('FROM education_records')) {
        return {
          // Rank 4 (Diploma) vs required Rank 6 -> partial eduScore 4/6 = 0.666
          rows: [{ qualification_type_id: 1, level_rank: 4, type_name: 'Diploma', end_date: null }],
        };
      }
      if (sql.includes('FROM user_experiences')) {
        return {
          // start_date 12 months ago with null end_date -> ongoing job
          rows: [{ start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), end_date: null, field_id: 1 }],
        };
      }
      if (sql.includes('FROM career_breaks')) {
        return {
          // 2 month break with null end_date
          rows: [{ start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), end_date: null, break_reason: 'health' }],
        };
      }
      return { rows: [] };
    });

    const res = await readinessEngine.evaluateGoalReadiness(105);

    assert.equal(res.goal_id, 105);
    const eduGap = res.gaps.find((g) => g.gap_type === 'Education Gap');
    assert.ok(eduGap);
    assert.match(eduGap.current_state, /Qualification level rank: 4/);
  });

  it('covers optional cert fallbacks, non-zero partial exp, null resource hours, and null skill exp', async () => {
    mock.method(pool, 'query', async (sql) => {
      if (sql.includes('FROM career_goals')) {
        return {
          rows: [{
            goal_id: 106,
            user_id: 206,
            role_id: 6,
            status: 'active',
            role_title: 'Junior Cloud Eng',
            experience_years_required: '2.0', // 24 months
          }],
        };
      }
      if (sql.includes('FROM career_requirements')) {
        return {
          rows: [
            {
              requirement_id: 61,
              requirement_type: 'certification',
              certification_id: 88,
              certification_name: null, // triggers fallback 'Required Certificate'
              is_mandatory: false, // triggers priority 3
              priority: null,
            },
            {
              requirement_id: 62,
              requirement_type: 'skill',
              skill_id: 99,
              skill_name: 'Python',
              expected_proficiency: 'advanced',
              is_mandatory: false,
              priority: null,
            },
          ],
        };
      }
      if (sql.includes('FROM user_skills')) {
        return {
          rows: [{
            skill_id: 99,
            skill_name: 'Python',
            proficiency_level: 'beginner',
            years_of_experience: null, // triggers || 0
          }],
        };
      }
      if (sql.includes('FROM user_experiences')) {
        return {
          // 6 months experience: totalExpMonths > 0 and < 24 months -> triggers 'high' severity
          rows: [{
            start_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date().toISOString(),
          }],
        };
      }
      if (sql.includes('FROM learning_resources')) {
        return {
          rows: [{
            resource_id: 501,
            resource_name: 'Python Zero to Hero',
            resource_type: 'course',
            provider: 'Coursera',
            estimated_duration_hours: null, // triggers fallback 20
            skill_id: 99,
            proficiency_taught: 'intermediate',
          }],
        };
      }
      return { rows: [] };
    });

    const roadmap = await readinessEngine.generateLearningRoadmap(106);
    assert.equal(roadmap.goal_id, 106);
    const pythonTask = roadmap.tasks.find((t) => t.task_title.includes('Python'));
    assert.ok(pythonTask);
    assert.equal(pythonTask.estimated_duration_hours, 20); // fallback applied
  });
});
