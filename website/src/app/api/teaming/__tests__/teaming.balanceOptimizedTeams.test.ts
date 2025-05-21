import { describe, expect, test, jest } from '@jest/globals';
import type { Team, Participant } from '../types';
import { balanceOptimizedTeams } from '../lib/teaming';

// Mocking uuid because balanceOptimizedTeams uses it for new team IDs
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).substring(2, 10)}`)
}));

describe('balanceOptimizedTeams', () => {
  const bot = balanceOptimizedTeams; // Shorthand

  const p1: Participant = { id: 'p1' };
  const p2: Participant = { id: 'p2' };
  const p3: Participant = { id: 'p3' };
  const p4: Participant = { id: 'p4' };
  const p5: Participant = { id: 'p5' };
  const p6: Participant = { id: 'p6' };

  // Helper to create teams, ensuring deep copy of members for test isolation
  const createTeam = (id: string, name: string, members: Participant[], factorScores: Record<string, number> = {}): Team => ({
    id,
    name,
    members: JSON.parse(JSON.stringify(members)),
    factorScores,
  });

  test('should return an empty array for empty input teamsToBalance', () => {
    expect(bot([], 3)).toEqual([]);
  });

  test('should return an empty array if input teams have no members', () => {
    expect(bot([createTeam('t1', 'Team 1', [])], 3)).toEqual([]);
  });

  test('should return an empty array if flatMap results in no members (e.g. teams with undefined members)', () => {
    // This tests robustness against malformed Team objects if members array is undefined
    const teamsWithUndefinedMembers = [{ id: 't1', name: 'Team 1', members: undefined as unknown as Participant[], factorScores: {} }];
    expect(bot(teamsWithUndefinedMembers, 3)).toEqual([]);
  });

  test('basic balancing: 2 teams, 6 members, ideal size 3 -> 2 teams of 3', () => {
    const teams = [
      createTeam('t1', 'Team 1', [p1, p2, p3]),
      createTeam('t2', 'Team 2', [p4, p5, p6])
    ];
    const result = bot(teams, 3);
    expect(result.length).toBe(2);
    result.forEach(team => expect(team.members.length).toBe(3));
  });

  test('balancing with uneven distribution: 1 team (5 members), 1 team (1 member), ideal size 3 -> 2 teams of 3', () => {
    const teams = [
      createTeam('t1', 'Team 1', [p1,p2,p3,p4,p5]),
      createTeam('t2', 'Team 2', [p6])
    ];
    const result = bot(teams, 3);
    expect(result.length).toBe(2);
    result.forEach(team => expect(team.members.length).toBe(3));
  });

  test('balancing leading to more teams: 1 team (6 members), ideal size 2 -> 3 teams of 2', () => {
    const teams = [createTeam('t1', 'Team 1', [p1,p2,p3,p4,p5,p6])];
    const result = bot(teams, 2);
    expect(result.length).toBe(3);
    result.forEach(team => expect(team.members.length).toBe(2));
  });

  test('balancing leading to fewer teams: 2 teams (1 member each), ideal size 3 -> 1 team of 2', () => {
    const teams = [
      createTeam('t1', 'Team 1', [p1]),
      createTeam('t2', 'Team 2', [p2])
    ];
    const result = bot(teams, 3);
    expect(result.length).toBe(1);
    expect(result[0].members.length).toBe(2);
  });

  test('ideal size 1: all members in their own team', () => {
    const teams = [createTeam('t1', 'Team 1', [p1,p2,p3])];
    const result = bot(teams, 1);
    expect(result.length).toBe(3);
    result.forEach(team => expect(team.members.length).toBe(1));
  });

  test('ID and Name reuse when output teams <= input teams', () => {
    const teams = [
      createTeam('orig_t1', 'Original Team 1', [p1,p2,p3], { score: 10 }),
      createTeam('orig_t2', 'Original Team 2', [p4,p5,p6], { score: 20 }),
    ];
    const result = bot(teams, 3);
    expect(result.length).toBe(2);
    expect(result.map(t => t.id).sort()).toEqual(['orig_t1', 'orig_t2'].sort());
    expect(result.map(t => t.name).sort()).toEqual(['Original Team 1', 'Original Team 2'].sort());
    // Check if factorScores are preserved (first team should get first original team's scores if IDs match)
    expect(result.find(t => t.id === 'orig_t1')?.factorScores).toEqual({ score: 10 });
    expect(result.find(t => t.id === 'orig_t2')?.factorScores).toEqual({ score: 20 });
  });

  test('New ID and Name generation when output teams > input teams', () => {
    const teams = [createTeam('orig_t1', 'Original T1', [p1,p2,p3,p4])]; // 4 members
    const result = bot(teams, 2); // ideal 2 -> 2 output teams
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('orig_t1');
    expect(result[0].name).toBe('Original T1');
    expect(result[1].id).toMatch(/^mock-uuid-.+/); // New team gets mocked UUID
    expect(result[1].name).toBe('Balanced Opt Team 2'); // Default new name pattern
    // Factor scores are reset for new teams or if strategy changes them
    expect(result[0].factorScores).toEqual({}); // Factor scores from orig_t1 are taken by first output team.
    expect(result[1].factorScores).toEqual({}); // New teams get empty factorScores.
  });

  test('FactorScores are carried over correctly when team shells are reused', () => {
    const teams = [
      createTeam('t1', 'T1', [p1, p2], { metricA: 5, metricB: 10 }),
      createTeam('t2', 'T2', [p3], { metricC: 15 }),
    ];
    const result = bot(teams, 3); // 3 total members, ideal 3 -> 1 output team using t1 shell
    expect(result.length).toBe(1);
    expect(result[0].factorScores).toEqual({ metricA: 5, metricB: 10 }); // Should take t1's scores
    expect(result[0].id).toBe('t1'); // Should reuse t1's ID
  });

  test('All participants are preserved and correctly distributed (round-robin)', () => {
    const inputTeams = [
      createTeam('teamA', 'Team Alpha', [p1, p2]),         // factorScore for teamA
      createTeam('teamB', 'Team Bravo', [p3, p4, p5], {b:2}),   // factorScore for teamB
      createTeam('teamC', 'Team Charlie', [p6], {c:3}),         // factorScore for teamC
    ]; // 6 participants total
    const idealSize = 2;
    const result = bot(inputTeams, idealSize); // Expect 3 teams of 2
    
    expect(result.length).toBe(3);
    result.forEach(team => expect(team.members.length).toBe(2));

    const allOutputParticipants = result.flatMap(t => t.members).map(p => p.id).sort();
    const allInputParticipants = [p1,p2,p3,p4,p5,p6].map(p => p.id).sort();
    expect(allOutputParticipants).toEqual(allInputParticipants);

    // Check round-robin distribution and factor score preservation
    const teamShellA = result.find(t => t.id === 'teamA');
    const teamShellB = result.find(t => t.id === 'teamB');
    const teamShellC = result.find(t => t.id === 'teamC');

    expect(teamShellA?.members.map(m=>m.id).sort()).toEqual([p1.id, p4.id].sort());
    expect(teamShellA?.factorScores).toEqual({}); // Original teamA had no factor scores

    expect(teamShellB?.members.map(m=>m.id).sort()).toEqual([p2.id, p5.id].sort());
    expect(teamShellB?.factorScores).toEqual({b:2});

    expect(teamShellC?.members.map(m=>m.id).sort()).toEqual([p3.id, p6.id].sort());
    expect(teamShellC?.factorScores).toEqual({c:3});
  });

  test('should handle teams with empty or null factorScores gracefully during reuse', () => {
    const teams = [
      createTeam('t1', 'T1', [p1], {}), // Empty factorScores
      { id: 't2', name: 'T2', members: [p2], factorScores: null as unknown as Record<string, number> }, // Null factorScores
      createTeam('t3', 'T3', [p3]) // Undefined (default) factorScores
    ];
    const result = bot(teams, 2); // 3 members, ideal 2 -> 2 teams. t1 reused, t2 reused (or new if t2 invalid)
    
    expect(result.length).toBe(2);
    const t1Result = result.find(t=>t.id === 't1');
    const t2Result = result.find(t=>t.id === 't2'); // Second team will reuse t2 shell

    expect(t1Result?.factorScores).toEqual({});
    expect(t2Result?.factorScores).toEqual({}); // Should default to empty if null was input
  });
}); 