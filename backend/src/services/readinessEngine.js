import { query } from '../config/db.js';
import { NotFoundError } from '../errors/NotFoundError.js';

// Proficiency numerical rank hierarchy matching database check constraints
export const PROFICIENCY_RANKS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

// Severity rank for roadmap task sequencing
export const SEVERITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Multi-Factor Career Readiness & Automated Learning Roadmap Engine
 * Implements weighted multi-factor scoring across Skills (40%), Experience (20%),
 * Education (20%), Certifications (10%), and Verified Assessments (10%).
 */
export class ReadinessEngine {
  /**
   * Calculate multi-factor readiness score for a candidate's career goal.
   *
   * @param {number} goalId
   * @returns {Promise<object>}
   */
  async evaluateGoalReadiness(goalId) {
    const gid = parseInt(goalId, 10);

    // 1. Fetch goal with target role details
    const goalRes = await query(
      `SELECT cg.goal_id, cg.user_id, cg.role_id, cg.status, cg.target_date,
              cr.role_title, cr.field_id, cr.experience_years_required
       FROM career_goals cg
       JOIN career_roles cr ON cg.role_id = cr.role_id
       WHERE cg.goal_id = $1`,
      [gid]
    );

    if (goalRes.rows.length === 0) {
      throw new NotFoundError(`Career goal with goal_id = ${gid} was not found`);
    }

    const goal = goalRes.rows[0];
    const userId = goal.user_id;
    const roleId = goal.role_id;

    // 2. Fetch role requirements
    const reqsRes = await query(
      `SELECT req.requirement_id, req.requirement_type, req.skill_id,
              req.qualification_type_id, req.certification_id,
              req.expected_proficiency, req.is_mandatory, req.priority,
              s.skill_name, qt.type_name AS qualification_name, qt.level_rank,
              c.certification_name
       FROM career_requirements req
       LEFT JOIN skills s ON req.skill_id = s.skill_id
       LEFT JOIN qualification_types qt ON req.qualification_type_id = qt.qualification_type_id
       LEFT JOIN certifications c ON req.certification_id = c.certification_id
       WHERE req.role_id = $1
       ORDER BY req.priority ASC, req.is_mandatory DESC`,
      [roleId]
    );

    const requirements = reqsRes.rows;

    // 3. Fetch candidate's acquired attributes
    const [skillsRes, eduRes, expRes, certsRes, breaksRes, assessRes] = await Promise.all([
      query(
        `SELECT us.skill_id, s.skill_name, us.proficiency_level, us.years_of_experience
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.skill_id
         WHERE us.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT er.qualification_type_id, qt.level_rank, qt.type_name, er.end_date
         FROM education_records er
         JOIN qualification_types qt ON er.qualification_type_id = qt.qualification_type_id
         WHERE er.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT ue.start_date, ue.end_date, ue.field_id
         FROM user_experiences ue
         WHERE ue.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT uc.certification_id, uc.status
         FROM user_certifications uc
         WHERE uc.user_id = $1 AND uc.status = 'active'`,
        [userId]
      ),
      query(
        `SELECT cb.start_date, cb.end_date, cb.break_reason
         FROM career_breaks cb
         WHERE cb.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT ar.assessment_id, a.skill_id, ar.score, ar.passed, a.max_score
         FROM assessment_results ar
         JOIN assessments a ON ar.assessment_id = a.assessment_id
         WHERE ar.user_id = $1`,
        [userId]
      ),
    ]);

    const userSkills = new Map(skillsRes.rows.map((s) => [s.skill_id, s]));
    const userCerts = new Set(certsRes.rows.map((c) => c.certification_id));
    const highestEduRank = eduRes.rows.reduce(
      (max, e) => Math.max(max, e.level_rank || 0),
      0
    );

    // Calculate total experience in months
    let totalExpMonths = 0;
    for (const exp of expRes.rows) {
      const start = new Date(exp.start_date);
      const end = !exp.end_date ? new Date() : new Date(exp.end_date);
      const diffMonths = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
      totalExpMonths += diffMonths;
    }

    // Detect active or recent career break (>6 months)
    let breakMonths = 0;
    for (const b of breaksRes.rows) {
      const start = new Date(b.start_date);
      const end = !b.end_date ? new Date() : new Date(b.end_date);
      const diff = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
      breakMonths += diff;
    }

    // --- Component Scoring ---
    const detectedGaps = [];

    // Factor 1: Skills (Weight 40%)
    const skillReqs = requirements.filter((r) => r.requirement_type === 'skill');
    let skillScore = 1.0;
    if (skillReqs.length > 0) {
      let earnedSkillWeight = 0;
      let totalSkillWeight = 0;

      for (const req of skillReqs) {
        const weight = req.is_mandatory ? 2 : 1;
        totalSkillWeight += weight;

        const candidateSkill = userSkills.get(req.skill_id);
        const reqRank = PROFICIENCY_RANKS[req.expected_proficiency] || 2;

        if (!candidateSkill) {
          detectedGaps.push({
            gap_type: 'Skill Gap',
            gap_type_id: 1,
            requirement_id: req.requirement_id,
            skill_id: req.skill_id,
            description: `Missing required skill: ${req.skill_name}`,
            required_state: `${req.expected_proficiency} proficiency in ${req.skill_name}`,
            current_state: 'Skill not acquired',
            severity: req.is_mandatory ? 'high' : 'medium',
            priority: req.priority || (req.is_mandatory ? 1 : 2),
          });
        } else {
          const candRank = PROFICIENCY_RANKS[candidateSkill.proficiency_level] || 1;
          if (candRank >= reqRank) {
            earnedSkillWeight += weight;
          } else {
            // Partial match proportional to level
            const ratio = candRank / reqRank;
            earnedSkillWeight += weight * ratio;

            detectedGaps.push({
              gap_type: 'Skill Gap',
              gap_type_id: 1,
              requirement_id: req.requirement_id,
              skill_id: req.skill_id,
              description: `${req.skill_name} proficiency (${candidateSkill.proficiency_level}) below required (${req.expected_proficiency})`,
              required_state: `${req.expected_proficiency} in ${req.skill_name}`,
              current_state: `${candidateSkill.proficiency_level} (${candidateSkill.years_of_experience || 0} years)`,
              severity: req.is_mandatory ? 'high' : 'medium',
              priority: req.priority || 2,
            });
          }
        }
      }
      skillScore = totalSkillWeight > 0 ? earnedSkillWeight / totalSkillWeight : 1.0;
    }

    // Factor 2: Education (Weight 20%)
    const eduReqs = requirements.filter((r) => r.requirement_type === 'education');
    let eduScore = 1.0;
    if (eduReqs.length > 0) {
      const highestReqRank = eduReqs.reduce(
        (max, r) => Math.max(max, r.level_rank || 4),
        0
      );
      if (highestEduRank >= highestReqRank) {
        eduScore = 1.0;
      } else if (highestEduRank > 0) {
        eduScore = highestEduRank / highestReqRank;
        detectedGaps.push({
          gap_type: 'Education Gap',
          gap_type_id: 2,
          description: 'Current educational degree below target role requirement',
          required_state: 'Tier matching requirement rank',
          current_state: `Qualification level rank: ${highestEduRank}`,
          severity: 'medium',
          priority: 3,
        });
      } else {
        eduScore = 0.3;
        detectedGaps.push({
          gap_type: 'Education Gap',
          gap_type_id: 2,
          description: 'Missing formal education degree record',
          required_state: 'Formal degree record',
          current_state: 'None on file',
          severity: 'high',
          priority: 2,
        });
      }
    }

    // Factor 3: Experience (Weight 20%)
    const requiredExpMonths = goal.experience_years_required
      ? Math.round(parseFloat(goal.experience_years_required) * 12)
      : 12;
    let expScore = Math.min(1.0, totalExpMonths / Math.max(1, requiredExpMonths));
    if (totalExpMonths < requiredExpMonths) {
      detectedGaps.push({
        gap_type: 'Experience Gap',
        gap_type_id: 3,
        description: `Professional experience (${totalExpMonths} mo) below target requirement (${requiredExpMonths} mo)`,
        required_state: `At least ${requiredExpMonths} months experience`,
        current_state: `${totalExpMonths} months documented`,
        severity: totalExpMonths === 0 ? 'critical' : 'high',
        priority: 2,
      });
    }

    // Factor 4: Certifications (Weight 10%)
    const certReqs = requirements.filter((r) => r.requirement_type === 'certification');
    let certScore = 1.0;
    if (certReqs.length > 0) {
      let held = 0;
      for (const req of certReqs) {
        if (userCerts.has(req.certification_id)) {
          held++;
        } else {
          detectedGaps.push({
            gap_type: 'Certification Gap',
            gap_type_id: 4,
            requirement_id: req.requirement_id,
            description: `Missing certification: ${req.certification_name || 'Required Certificate'}`,
            required_state: req.certification_name || 'Active Certification',
            current_state: 'Not certified',
            severity: req.is_mandatory ? 'high' : 'medium',
            priority: req.is_mandatory ? 1 : 3,
          });
        }
      }
      certScore = held / certReqs.length;
    }

    // Factor 5: Assessments (Weight 10%)
    let assessScore = 0.5; // Neutral baseline
    if (assessRes.rows.length > 0) {
      const passedCount = assessRes.rows.filter((a) => a.passed).length;
      assessScore = passedCount / assessRes.rows.length;
    }

    // Career break penalty adjustment: if break > 12 months, apply 5% adjustment for skill staleness
    if (breakMonths >= 12) {
      detectedGaps.push({
        gap_type: 'Career Break Impact',
        gap_type_id: 6,
        description: `Career break of ${breakMonths} months may have caused skill staleness`,
        required_state: 'Active recent practice within last 6 months',
        current_state: `${breakMonths} months career break`,
        severity: 'high',
        priority: 1,
      });
    }

    // Composite Weighted Calculation
    // Skills (40%), Experience (20%), Education (20%), Certifications (10%), Assessments (10%)
    let weightedRaw =
      skillScore * 0.4 +
      expScore * 0.2 +
      eduScore * 0.2 +
      certScore * 0.1 +
      assessScore * 0.1;

    // Career break slight dampening if significant staleness
    if (breakMonths >= 12) {
      weightedRaw = Math.max(0.1, weightedRaw - 0.05);
    }

    const overallPct = parseFloat((Math.min(100, Math.max(0, weightedRaw * 100))).toFixed(2));

    // Determine readiness cohort category
    let category = 'at_risk';
    if (overallPct >= 80.0) {
      category = 'job_ready';
    } else if (overallPct >= 60.0) {
      category = 'developing';
    }

    return {
      goal_id: gid,
      user_id: userId,
      target_role: goal.role_title,
      overall_readiness_pct: overallPct,
      category,
      breakdown: {
        skills_score_pct: parseFloat((skillScore * 100).toFixed(1)),
        experience_score_pct: parseFloat((expScore * 100).toFixed(1)),
        education_score_pct: parseFloat((eduScore * 100).toFixed(1)),
        certifications_score_pct: parseFloat((certScore * 100).toFixed(1)),
        assessments_score_pct: parseFloat((assessScore * 100).toFixed(1)),
        total_experience_months: totalExpMonths,
        career_break_months: breakMonths,
      },
      gap_count: detectedGaps.length,
      gaps: detectedGaps,
    };
  }

  /**
   * Automated Learning Roadmap Generator
   * Maps detected gap items to catalog learning resources and sequences tasks
   * prioritized by severity and dependencies.
   *
   * @param {number} goalId
   * @returns {Promise<object>}
   */
  async generateLearningRoadmap(goalId) {
    const analysis = await this.evaluateGoalReadiness(goalId);

    // Fetch all available learning resources with skill mapping
    const resRes = await query(
      `SELECT lr.resource_id, lr.resource_name, lr.resource_type,
              lr.provider, lr.estimated_duration_hours, lr.cost, lr.description,
              rs.skill_id, rs.proficiency_taught
       FROM learning_resources lr
       LEFT JOIN resource_skills rs ON lr.resource_id = rs.resource_id`
    );

    const resourceMapBySkill = new Map();
    for (const r of resRes.rows) {
      if (r.skill_id) {
        if (!resourceMapBySkill.has(r.skill_id)) {
          resourceMapBySkill.set(r.skill_id, []);
        }
        resourceMapBySkill.get(r.skill_id).push(r);
      }
    }

    // Sequence gaps: Critical first, then High, Medium, Low
    const sortedGaps = [...analysis.gaps].sort((a, b) => {
      const weightA = SEVERITY_WEIGHTS[a.severity] || 1;
      const weightB = SEVERITY_WEIGHTS[b.severity] || 1;
      if (weightB !== weightA) return weightB - weightA;
      return (a.priority || 3) - (b.priority || 3);
    });

    const roadmapTasks = [];
    let sequenceOrder = 1;
    let totalEstimatedHours = 0;
    const assignedResources = new Set();

    for (const gap of sortedGaps) {
      let matchedResource = null;

      if (gap.skill_id && resourceMapBySkill.has(gap.skill_id)) {
        const candidates = resourceMapBySkill.get(gap.skill_id);
        matchedResource = candidates[0];
      }

      const taskDuration = matchedResource ? parseFloat(matchedResource.estimated_duration_hours) || 20 : 25;
      totalEstimatedHours += taskDuration;

      roadmapTasks.push({
        sequence_order: sequenceOrder++,
        task_title: `Close Gap: ${gap.description}`,
        gap_type: gap.gap_type,
        severity: gap.severity,
        target_state: gap.required_state,
        estimated_duration_hours: taskDuration,
        resource: matchedResource
          ? {
              resource_id: matchedResource.resource_id,
              name: matchedResource.resource_name,
              provider: matchedResource.provider,
              type: matchedResource.resource_type,
              cost: matchedResource.cost,
            }
          : {
              name: `Self-directed learning: ${gap.required_state}`,
              provider: 'SkillBridge Catalog / Partner Workshops',
              type: 'self_study',
              cost: 0,
            },
        status: 'pending',
      });
    }

    return {
      goal_id: analysis.goal_id,
      user_id: analysis.user_id,
      target_role: analysis.target_role,
      current_readiness_pct: analysis.overall_readiness_pct,
      readiness_category: analysis.category,
      roadmap_summary: {
        total_tasks: roadmapTasks.length,
        total_estimated_duration_hours: totalEstimatedHours,
        critical_priority_tasks: roadmapTasks.filter((t) => t.severity === 'critical').length,
        high_priority_tasks: roadmapTasks.filter((t) => t.severity === 'high').length,
      },
      tasks: roadmapTasks,
    };
  }
}

export const readinessEngine = new ReadinessEngine();
