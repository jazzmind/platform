import { describe, expect, test, jest } from '@jest/globals';
import type { Team, Participant } from '../types'; // Team is from types.ts
import { createAndPrepareTeamShells } from '../lib/teaming'; // Participant is from lib/teaming

// Mocking uuid because createAndPrepareTeamShells might call it for new team IDs
// Ensure this mock is consistent with how it's used in the main test file if IDs are asserted.
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).substring(2, 10)}`)
}));

describe('createAndPrepareTeamShells', () => {
  // Using 'caps' as a shorthand
  const caps = createAndPrepareTeamShells;

  const p1: Participant = { id: 'p1' };
  const p2: Participant = { id: 'p2' };
  const p3: Participant = { id: 'p3' };
  const p4: Participant = { id: 'p4' };
  const p5: Participant = { id: 'p5' };

  const emptyInitialTeams: Team[] = [];
  const emptyExactMatchGroups: Record<string, Participant[]> = {};
  const emptyRemainingParticipants: Participant[] = [];

  test('should return empty array if no inputs and no participants', () => {
    const result = caps(emptyInitialTeams, emptyExactMatchGroups, emptyRemainingParticipants, 3);
    expect(result).toEqual([]);
  });

  test('should create shells for remainingParticipants only', () => {
    const result = caps(emptyInitialTeams, emptyExactMatchGroups, [p1, p2, p3, p4], 2);
    // ceil(4/2) = 2 shells
    expect(result.length).toBe(2);
    result.forEach(team => {
      expect(team.members).toEqual([]);
      expect(team.name).toMatch(/^New Team \d+$/);
    });
  });

  test('should create shells for exactMatchGroups only', () => {
    const groups = { 'group1': [p1, p2], 'group2': [p3, p4, p5] }; // 2 + 3 = 5 participants
    const result = caps(emptyInitialTeams, groups, emptyRemainingParticipants, 3);
    // ceil(5/3) = 2 shells
    expect(result.length).toBe(2);
    result.forEach(team => {
        expect(team.name).toMatch(/^New Team \d+$/);
    });
  });

  test('should create shells for combined exactMatchGroups and remainingParticipants', () => {
    const groups = { 'group1': [p1, p2] }; // 2 participants
    const remaining = [p3, p4, p5]; // 3 participants
    // Total 5 participants. idealSize 2. ceil(5/2) = 3 shells.
    const result = caps(emptyInitialTeams, groups, remaining, 2);
    expect(result.length).toBe(3);
    result.forEach(team => {
        expect(team.name).toMatch(/^New Team \d+$/);
    });
  });

  test('should return initialTeams if no new participants and initialTeams are full enough', () => {
    const initial: Team[] = [{ id: 't1', name: 'T1', members: [p1, p2], factorScores:{} }]; // idealSize 2, min 1. This team is full enough.
    const result = caps(initial, emptyExactMatchGroups, emptyRemainingParticipants, 2);
    expect(result).toEqual(initial); // Should return the original team object if no changes
    expect(result.length).toBe(1);
  });

  test('should return initialTeams even if not full, if no new participants to assign', () => {
    const initial: Team[] = [{ id: 't1', name: 'T1', members: [p1], factorScores:{} }]; // idealSize 3, min 2. Team is NOT full.
    const result = caps(initial, emptyExactMatchGroups, emptyRemainingParticipants, 3);
    // Expect it to return the initial team as is, because totalParticipantsToAssign is 0.
    expect(result).toEqual(initial);
    expect(result.length).toBe(1); 
  });

  test('should use initialTeams that have space before creating new shells', () => {
    const initial: Team[] = [
      { id: 't1', name: 'T1', members: [p1], factorScores:{} }, // Has space for idealSize 3 (max 4)
      { id: 't2', name: 'T2', members: [p2,p3,p4,p5], factorScores:{} } // Full for idealSize 3 (max 4)
    ];
    const remaining = [p1,p2,p3,p4,p5]; // 5 participants to assign
    const idealSize = 3;
    const result = caps(initial, emptyExactMatchGroups, remaining, idealSize);
    expect(result.length).toBe(3); // initial (2) + new (1)
    expect(result.find(t => t.id === 't1')).toBeDefined();
    expect(result.find(t => t.id === 't2')).toBeDefined();
    expect(result.filter(t => t.name.startsWith('New Team')).length).toBe(1); 
  });

  test('should create all new shells if initialTeams are full', () => {
    const initial: Team[] = [{ id: 't1', name: 'T1', members: [p1,p2,p3,p4], factorScores:{} }]; // Full for idealSize 3
    const remaining = [p1,p2,p3]; // 3 participants to assign
    const idealSize = 3;
    const result = caps(initial, emptyExactMatchGroups, remaining, idealSize);
    expect(result.length).toBe(2); // initial (1) + new (1)
    expect(result.find(t => t.id === 't1')).toBeDefined();
    expect(result.filter(t => t.name.startsWith('New Team')).length).toBe(1);
  });

  test('should handle idealTeamSize of 1 by creating shells for each participant', () => {
    const resultForIdealSize1 = caps(emptyInitialTeams, emptyExactMatchGroups, [p1, p2, p3], 1);
    expect(resultForIdealSize1.length).toBe(3); // ceil(3/1) = 3 shells
    resultForIdealSize1.forEach(team => {
        expect(team.name).toMatch(/^New Team \d+$/);
    });
  });
}); 