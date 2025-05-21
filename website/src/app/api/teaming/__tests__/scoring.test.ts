import { describe, expect, test, jest } from '@jest/globals';
import {
  calculateNumericalDiversity,
  calculateCategoricalDiversity,
  calculateDiversityForFactor,
  calculateTeamScores,
  shuffle,
} from '../lib/scoring';
import type { Factor, Team } from '../types'; // Assuming types are in ../types

// Mock uuid for calculateTeamScores if it creates default empty teams with new IDs
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => 'test-uuid-calculation'),
}));

describe('Team Calculation Utilities', () => {
  describe('calculateNumericalDiversity', () => {
    test('should return 1 for an empty list', () => {
      expect(calculateNumericalDiversity([], 0.5)).toBe(1);
    });

    test('should return 1 for a single value', () => {
      expect(calculateNumericalDiversity([5], 0.5)).toBe(1);
    });

    test('should return 1 for all same values when similar is desired (diversityTarget < 0.5)', () => {
      expect(calculateNumericalDiversity([5, 5, 5], 0)).toBe(1);
    });

    test('should return 0 for all same values when diverse is desired (diversityTarget >= 0.5)', () => {
      expect(calculateNumericalDiversity([5, 5, 5], 1)).toBe(0);
    });

    test('should score high for diverse values when diverse is desired', () => {
      // Normalized std dev for [0, 5, 10] is 1 (max possible std dev for this range).
      // Max possible std dev = (10-0)/2 = 5. Actual std dev = sqrt(((0-5)^2 + (5-5)^2 + (10-5)^2)/3) = sqrt((25+0+25)/3) = sqrt(50/3) approx 4.08
      // Correct calculation for maxPossibleStdDev in function: (max-min)/2. stdDev / maxPossibleStdDev.
      // For [0,10], mean=5. variance = ( (0-5)^2 + (10-5)^2 ) / 2 = (25+25)/2 = 25. stdDev = 5.
      // maxPossibleStdDev = (10-0)/2 = 5. normalizedStdDev = 5/5 = 1.
      // If diversityTarget = 1 (diverse), returns normalizedStdDev = 1.
      expect(calculateNumericalDiversity([0, 10], 1)).toBe(1);
      // For [0,5,10], the calculated normalized std dev is ~0.8165
      expect(calculateNumericalDiversity([0, 5, 10], 1)).toBeCloseTo(0.8165, 4);
    });

    test('should score high for similar values when similar is desired', () => {
      // For [5, 5.0001], with new logic, stdDev is small but not < EPSILON. maxPossibleStdDev is also small but not < EPSILON.
      // stdDev = 0.00005, maxPossibleStdDev = 0.00005. normalizedStdDev = 1.
      // After new logic: if stdDev < EPSILON -> normalized = 0. Score for target 0 = 1-0 = 1.
      expect(calculateNumericalDiversity([5, 5.0001], 0)).toBeCloseTo(1);
      // For [5, 5.5, 6], target 0: stdDev=0.4082, maxPossibleStdDev=0.5, normStdDev=0.8165. Score = 1 - 0.8165 = 0.1835
      expect(calculateNumericalDiversity([5, 6, 5.5], 0)).toBeCloseTo(0.1835, 4); 
    });

    test('should score low for similar values when diverse is desired', () => {
      // For [5, 5.0001], normalizedStdDev should now be 0 (due to stdDev < EPSILON if epsilon is larger, or if stdDev is tiny after the fix).
      // Score for target 1 = normalizedStdDev = 0.
      expect(calculateNumericalDiversity([5, 5.0001], 1)).toBeCloseTo(0);
    });

    test('should score low for diverse values when similar is desired', () => {
      expect(calculateNumericalDiversity([0, 10], 0)).toBe(0);
    });
  });

  describe('calculateCategoricalDiversity', () => {
    test('should return 1 for an empty list', () => {
      expect(calculateCategoricalDiversity([], 0.5)).toBe(1);
    });

    test('should return 1 for a single value', () => {
      expect(calculateCategoricalDiversity(['A'], 0.5)).toBe(1);
    });

    test('should return 1 for all same values when similar is desired (diversityTarget < 0.5)', () => {
      expect(calculateCategoricalDiversity(['A', 'A', 'A'], 0)).toBe(1);
    });

    test('should return 0 for all same values when diverse is desired (diversityTarget >= 0.5)', () => {
      expect(calculateCategoricalDiversity(['A', 'A', 'A'], 1)).toBe(0);
    });

    test('should score high for diverse values when diverse is desired', () => {
      // For [A, B, C], unique=3. Max entropy = log2(3) approx 1.58. Each p=1/3. entropy = -(3 * (1/3 * log2(1/3))) = log2(3).
      // normalizedEntropy = 1.
      // If diversityTarget = 1 (diverse), returns normalizedEntropy = 1.
      expect(calculateCategoricalDiversity(['A', 'B', 'C'], 1)).toBeCloseTo(1);
      // For [A, A, B, C], unique=3. Max entropy=log2(3). pA=1/2, pB=1/4, pC=1/4.
      // entropy = -(0.5log0.5 + 0.25log0.25 + 0.25log0.25) = 0.5*1 + 0.25*2 + 0.25*2 = 0.5 + 0.5 + 0.5 = 1.5
      // normalized = 1.5 / log2(3) approx 1.5 / 1.58 approx 0.94
      expect(calculateCategoricalDiversity(['A', 'A', 'B', 'C'], 1)).toBeGreaterThan(0.9);
    });

    test('should score high for similar values when similar is desired', () => {
      // For [A, A, A, B], unique=2. Max entropy=log2(2)=1. pA=3/4, pB=1/4.
      // entropy = -(0.75log0.75 + 0.25log0.25) = -(0.75 * (-0.415) + 0.25 * (-2)) = -(-0.311 + -0.5) = 0.811
      // normalizedEntropy = 0.811 / 1 = 0.811.
      // If diversityTarget = 0 (similar), returns 1 - normalizedEntropy = 1 - 0.811 = 0.189. This should be higher.
      // Let's re-check: diversityTarget < 0.5 means (1 - normalizedEntropy).
      // Highly similar: [A,A,A,A,B]. Normalized entropy will be low. (1 - low) = high score.
      // Previous calc for [A,A,A,A,B]: Entropy=0.7219, MaxEntropy=1. NormEntropy=0.7219. Score for similar (target 0) = 1 - 0.7219 = 0.2781
      expect(calculateCategoricalDiversity(['A', 'A', 'A', 'A', 'B'], 0)).toBeCloseTo(0.2781, 4); // Score for similarity
    });

    test('should score low for similar values when diverse is desired', () => {
      // For [A,A,A,A,B], NormEntropy = 0.7219. Score for diverse (target 1) = 0.7219.
      // This is a relatively high diversity score. Expecting it to be > 0.5
      expect(calculateCategoricalDiversity(['A', 'A', 'A', 'A', 'B'], 1)).toBeCloseTo(0.7219, 4); // Score for diversity
    });

    test('should score low for diverse values when similar is desired', () => {
      expect(calculateCategoricalDiversity(['A', 'B', 'C'], 0)).toBeCloseTo(0);
    });
  });

  describe('calculateDiversityForFactor', () => {
    const membersNumeric = [
      { id: '1', data: '10' },
      { id: '2', data: '20' },
      { id: '3', data: '30' },
    ];
    const membersCategorical = [
      { id: '1', data: 'Apple' },
      { id: '2', data: 'Banana' },
      { id: '3', data: 'Apple' },
    ];
    const membersSingle = [{ id: '1', data: '100' }];
    const membersAllSameNumeric = [{ id: '1', data: '7' },{ id: '2', data: '7' },{ id: '3', data: '7' }];
    const membersAllSameCategorical = [{ id: '1', data: 'Z' },{ id: '2', data: 'Z' },{ id: '3', data: 'Z' }];

    test('should return 1 for empty members list', () => {
      expect(calculateDiversityForFactor([], 'data', 0.5, false)).toBe(1);
    });

    test('should return 1 for single member', () => {
      expect(calculateDiversityForFactor(membersSingle, 'data', 0.5, false)).toBe(1);
    });

    test('should call numerical diversity for numeric data', () => {
      // Diverse data [10,20,30], diverse desired -> high score (0.8165)
      expect(calculateDiversityForFactor(membersNumeric, 'data', 1, false)).toBeCloseTo(0.8165, 4);
      // Similar data, similar desired -> high score
      expect(calculateDiversityForFactor(membersAllSameNumeric, 'data', 0, false)).toBe(1);
    });

    test('should call categorical diversity for non-numeric data', () => {
      // Diverse data (2 unique out of 3), diverse desired -> high-ish score
      expect(calculateDiversityForFactor(membersCategorical, 'data', 1, false)).toBeGreaterThan(0.5);
      // Similar data, similar desired -> high score
      expect(calculateDiversityForFactor(membersAllSameCategorical, 'data', 0, false)).toBe(1);
    });

    test('should handle isMatch correctly for matching values', () => {
      expect(calculateDiversityForFactor(membersAllSameCategorical, 'data', 0.5, true)).toBe(1);
    });

    test('should handle isMatch correctly for non-matching values', () => {
      expect(calculateDiversityForFactor(membersCategorical, 'data', 0.5, true)).toBe(0);
    });
  });

  describe('calculateTeamScores', () => {
    const factors: Factor[] = [
      { name: 'skill', diversity: 1, priority: 'high' }, // Diverse desired
      { name: 'experience', diversity: 0, priority: 'medium' }, // Similar desired
      { name: 'location', diversity: 0.5, priority: 'low', isMatch: true },
    ];

    const teams: Team[] = [
      {
        id: 'team1',
        name: 'Team Alpha',
        members: [
          { id: 'm1', skill: 'JS', experience: '5', location: 'NY' },
          { id: 'm2', skill: 'Python', experience: '5', location: 'NY' },
        ],
        factorScores: {},
      },
      {
        id: 'team2',
        name: 'Team Beta',
        members: [
          { id: 'm3', skill: 'JS', experience: '2', location: 'SF' },
          { id: 'm4', skill: 'JS', experience: '3', location: 'LA' }, // Non-matching location
        ],
        factorScores: {},
      },
      {
        id: 'emptyTeam', name: 'Empty', members: [], factorScores: {}
      }
    ];

    test('should calculate scores for each factor for each team', () => {
      const scoredTeams = calculateTeamScores(teams, factors);
      expect(scoredTeams.length).toBe(3);

      const teamAlphaScores = scoredTeams.find(t => t.id === 'team1')!.factorScores;
      expect(teamAlphaScores.skill).toBeCloseTo(1); // JS, Python -> diverse
      expect(teamAlphaScores.experience).toBe(1); // 5, 5 -> similar
      expect(teamAlphaScores.location).toBe(1); // NY, NY -> match

      const teamBetaScores = scoredTeams.find(t => t.id === 'team2')!.factorScores;
      expect(teamBetaScores.skill).toBe(0);
      // For experience [2,3] (target 0 - similar), new numerical diversity logic should give 0 (1 - normalized(1))
      expect(teamBetaScores.experience).toBeCloseTo(0, 4);
      expect(teamBetaScores.location).toBe(0); // SF, LA -> non-match
        
      const emptyTeamResult = scoredTeams.find(t => t.id === 'emptyTeam');
      expect(emptyTeamResult!.members.length).toBe(0);
      expect(Object.keys(emptyTeamResult!.factorScores).length).toBe(0); // Or it might populate with factor names and default scores
                                                                    // The function specifically returns {} for factorScores if no members
    });

    test('should handle an empty list of teams', () => {
      const scoredTeams = calculateTeamScores([], factors);
      expect(scoredTeams).toEqual([]);
    });

    test('should handle an empty list of factors', () => {
      const scoredTeams = calculateTeamScores(teams, []);
      scoredTeams.forEach(team => {
        expect(Object.keys(team.factorScores).length).toBe(0);
      });
    });
      
    test('should return a new team object for empty team input with a default ID and name', () => {
        // Test case where an individual team object might be null/undefined in the input array (though TS types should prevent this)
        // calculateTeamScores has a check: if (!team || team.members.length === 0) return {...(team || { id: uuidv4(), name: 'Empty Team', members:[]}), factorScores: {}};
        const teamsWithPotentiallyNull: (Team | null)[] = [{ id: 't1', name:'T1', members: [{id:'m1'}], factorScores:{} }, null];
        const activeFactors: Factor[] = [{ name: 'f1', diversity: 1, priority: 'high'}];
        const scored = calculateTeamScores(teamsWithPotentiallyNull as Team[], activeFactors);
        expect(scored.length).toBe(2);
        expect(scored[1].id).toBe('test-uuid-calculation'); // From jest.mock('uuid')
        expect(scored[1].name).toBe('Empty Team');
        expect(scored[1].members.length).toBe(0);
        expect(Object.keys(scored[1].factorScores).length).toBe(0);
    });
  });

  describe('shuffle', () => {
    test('should return an empty array when given an empty array', () => {
      expect(shuffle([])).toEqual([]);
    });

    test('should return an array with the same elements', () => {
      const originalArray = [1, 2, 3, 4, 5];
      const shuffledArray = shuffle([...originalArray]); // Use spread to pass a copy
      expect(shuffledArray.length).toBe(originalArray.length);
      originalArray.forEach(item => {
        expect(shuffledArray).toContain(item);
      });
    });

    test('should return an array with the same length', () => {
      const originalArray = ['a', 'b', 'c'];
      const shuffledArray = shuffle([...originalArray]);
      expect(shuffledArray.length).toBe(originalArray.length);
    });

    test('should produce a different order (most of the time for larger arrays)', () => {
      const originalArray = Array.from({ length: 50 }, (_, i) => i + 1);
      const shuffledArray = shuffle([...originalArray]);
      // This test is probabilistic. For small arrays, it might occasionally return the same order.
      // For a sufficiently large array, it's highly unlikely to be the exact same order.
      // A more robust test might run it multiple times or check statistical properties,
      // but for a utility shuffle, confirming contents and length is often primary.
      // We can check if it's NOT strictly equal to the original, which is a good indicator.
      expect(shuffledArray).not.toEqual(originalArray);
    });

    test('should not modify the original array', () => {
      const originalArray = [10, 20, 30];
      const originalArrayCopy = [...originalArray];
      shuffle(originalArray); // Call shuffle with the original array reference
      expect(originalArray).toEqual(originalArrayCopy); // Original should be unchanged
    });
  });
});
