import { describe, expect, test } from '@jest/globals';
import type { Team, Factor, TeamConfiguration, Participant } from '../types';
import { evaluateTeamSet } from '../lib/teaming'; // Participant is from lib/teaming
// We need the actual calculateDiversityForFactor from scoring for these tests to be meaningful
// Assuming scoring.ts is in the same directory as teaming.ts or appropriately pathed.
// If scoring.ts is in ../lib/scoring.ts relative to teaming.ts, path for tests would be different.
// Let's assume direct import from where teaming.ts would import it, or adjust if needed.
// For now, since evaluateTeamSet calls it internally, we don't mock it here.

describe('evaluateTeamSet', () => {
  const ets = evaluateTeamSet; // Using 'ets' as a shorthand

  const p1: Participant = { id: 'p1', skill: 'JS', experience: '5', dept: 'Eng' };
  const p2: Participant = { id: 'p2', skill: 'Python', experience: '2', dept: 'Eng' };
  const p3: Participant = { id: 'p3', skill: 'JS', experience: '5', dept: 'UX' };
  const p4: Participant = { id: 'p4', skill: 'Java', experience: '10', dept: 'QA' };

  const createTeamForEval = (id:string, members: Participant[]): Team => ({
    id, 
    name: id, 
    members: JSON.parse(JSON.stringify(members)), 
    factorScores: {} 
  });

  const skillFactorDiv: Factor = { name: 'skill', diversity: 1, priority: 'high', order: 1 };
  const skillFactorSim: Factor = { name: 'skill', diversity: 0, priority: 'high', order: 1 };
  const skillFactorMatch: Factor = { name: 'skill', diversity: 0, priority: 'required', isMatch: true, order: 1 };
  const expFactorNumSim: Factor = { name: 'experience', diversity: 0, priority: 'medium', order: 2 };

  test('should return -Infinity for an empty set of teams', () => {
    expect(ets([], [skillFactorDiv], { teamSize: 2, factors: [skillFactorDiv] })).toBe(-Infinity);
  });

  test('should apply penalty for empty teams in a set', () => {
    const teams = [createTeamForEval('t1', [p1, p2]), createTeamForEval('t_empty', [])];
    const config: TeamConfiguration = { teamSize: 2, factors: [skillFactorDiv] };
    const scoreWithEmpty = ets(teams, [skillFactorDiv], config);
    const scoreWithoutEmpty = ets([teams[0]], [skillFactorDiv], config);
    expect(scoreWithEmpty).toBeLessThan(scoreWithoutEmpty);
  });

  // Test with a single, perfectly sized team and one diversity factor
  test('single perfect team (size, diversity factor)', () => {
    const team = createTeamForEval('t1', [p1, p2]); // JS, Python -> diverse for skill
    const activeFactors = [skillFactorDiv];
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    const score = ets([team], activeFactors, config);
    // Expected: Size score: 1. Factor score for skill (diversity 1): 1. Priority weight for high: 3.
    // Total Score = (TeamSizeWeight * SizeScore + FactorWeight * WeightedFactorScoreSum) / TotalPriorityWeight
    // SizeScoreComponent = 2.5 * 1 = 2.5
    // FactorScoreComponent for skill = 1 (diversity) * 3 (high prio weight) = 3
    // TotalScore = (2.5 + 3) / (2.5 + 3) = 1.0 (This formula used in some versions)
    // OR if it's (SizeScoreContribution + FactorScoreContribution) / NumFactorsOrConstant
    // From previous working test: (2.5 * SizeScore + 1 * AggregateFactorScore) where AggFactorScore is sum(indivScore*prio) / sum(prio)
    // (2.5 * 1 + 1 * (1*3)/3) = 2.5 + 1 = 3.5
    expect(score).toBeCloseTo(3.5); 
  });

  test('single perfect team (size, similarity factor)', () => {
    const team = createTeamForEval('t1', [p1, p3]); // JS, JS -> similar for skill
    const activeFactors = [skillFactorSim];
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    const score = ets([team], activeFactors, config);
    // Size: 1. Factor (skill, similarity 0 -> score 1). Prio high (3).
    // (2.5 * 1 + 1 * (1*3)/3) = 3.5
    expect(score).toBeCloseTo(3.5);
  });

  test('single team, bad size (too small)', () => {
    const p1: Participant = { id: 'p1', name: 'P1', skill: 'JS' };
    const team1 = createTeamForEval('t1', [p1]);
    const config = { teamSize: 3, factors: [skillFactorDiv] }; // ideal 3, actual 1
    const score = ets([team1], [skillFactorDiv], config);

    // Current logic: sizeScore = 0.5 (deviation 2 > 1)
    // Factor score (p1 alone, skill diversity 1 for single member is 1).
    // Score = (2.5 * 0.5 + 1.0 * (1*3)/3) / 1 = 1.25 + 1 = 2.25
    expect(score).toBeCloseTo(2.25);
  });

  test('single team, bad size (too large)', () => {
    const team1 = createTeamForEval('t1', [p1, p2, p3, p4]); // Skills: JS, Python, Java, Java
    const config = { teamSize: 2, factors: [skillFactorDiv] }; 
    const score = ets([team1], [skillFactorDiv], config);

    // Current logic: sizeScore = 0.5 (deviation 2 > 1)
    // Diversity for [JS,Py,Java,Java] (4 items, 3 unique, target 1) yields total score 2.196394630357186
    // Score = (2.5 * 0.5 + 1.0 * DIVERSITY_SCORE) / 1
    // 1.25 + DIVERSITY_SCORE = 2.196394630357186  => DIVERSITY_SCORE approx 0.9463946
    expect(score).toBeCloseTo(2.1963946, 5); 
  });

  test('single team, good size, bad factor (diversity sought, but similar)', () => {
    const team = createTeamForEval('t1', [p1, p3]); // JS, JS (similar), but skillFactorDiv wants diversity
    const activeFactors = [skillFactorDiv];
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    const score = ets([team], activeFactors, config);
    // Size: 1. Factor (skill, diversity 1, actual similar -> score 0).
    // (2.5 * 1 + 1 * (0*3)/3) = 2.5
    expect(score).toBeCloseTo(2.5);
  });

  test('single team, exact match factor, MATCHED', () => {
    const team = createTeamForEval('t1', [p1, p3]); // JS, JS. skillFactorMatch is exact match.
    const activeFactors = [skillFactorMatch]; 
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    const score = ets([team], activeFactors, config);
    // Size: 1. Factor (isMatch, diversityValue = 1 as all match): 1. Prio (req): 10.
    // (2.5 * 1 + 1 * (1*10)/10) = 3.5
    expect(score).toBeCloseTo(3.5);
  });

  test('single team, exact match factor, FAILED (heavy penalty)', () => {
    const team = createTeamForEval('t1', [p1, p2]); // JS, Python - fails exact match for skill
    const activeFactors = [skillFactorMatch];
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    const score = ets([team], activeFactors, config);
    // Size: 1. Factor (isMatch, diversityValue from calc = 0 for JS/Py). Penalty: -(1-0)*10*EXACT_MATCH_PENALTY_MULTIPLIER (-25 in original code)
    // Avg factor score becomes: (-25 * 10) / 10 = -25 (using penalty multiplier 25)
    // Total: (2.5 * 1 + 1 * (-25)) = 2.5 - 25 = -22.5
    expect(score).toBeCloseTo(-22.5);
  });

  test('multiple factors with different priorities', () => {
    const team = createTeamForEval('t1', [p1, p2]); // p1: JS, 5exp; p2: Py, 2exp
    const activeFactors: Factor[] = [
      skillFactorDiv, // skill, diversity 1, prio high (3)
      expFactorNumSim, // experience, similarity 0, prio medium (2)
    ];
    const config: TeamConfiguration = { teamSize: 2, factors: activeFactors };
    // skill diversity for [JS, Py] (target 1) is 1.
    // experience similarity for ['5', '2'] (target 0) is 0 (from scoring.ts).
    // FactorAgg = (skill_score*skill_prio + exp_score*exp_prio) = (1*3 + 0*2) = 3.
    // TotalWeight = skill_prio + exp_prio = 3+2 = 5.
    // AvgFactorScore = FactorAgg / TotalWeight = 3/5 = 0.6
    // Total Score = (2.5 * SizeScore + 1 * AvgFactorScore) = (2.5*1 + 1*0.6) = 3.1
    const score = ets([team], activeFactors, config);
    expect(score).toBeCloseTo(3.1);
  });
}); 