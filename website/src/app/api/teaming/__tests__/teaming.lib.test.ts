import { describe, expect, test, jest } from '@jest/globals';
import type { TeamConfiguration, Team, Participant } from '../types';
// import * as teamingFunctions from '../lib/teaming'; // Removed as no longer directly used here for mock access

// Mocking uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).substring(2, 10)}`)
}));

// Global mock for functions that are dependencies for higher-order functions like
// assignRemainingParticipantsWithOptimization and generateTeams.
// Unit tests for these mocked functions (evaluateTeamSet, balanceOptimizedTeams) 
// and other helper functions will use jest.requireActual to get their real implementations.
jest.mock('../lib/teaming', () => {
  const actual = jest.requireActual('../lib/teaming') as typeof import('../lib/teaming');
  return {
    ...actual, // Spread actual to keep other functions real by default
    generateNeighbor: jest.fn((teams) => JSON.parse(JSON.stringify(teams))), // Mocked globally
    evaluateTeamSet: jest.fn(() => 0), // Default global mock for evaluateTeamSet
    balanceOptimizedTeams: jest.fn((teams) => teams), // Default global mock for balanceOptimizedTeams
  };
});


describe('Teaming Library - generateTeams Integration Tests', () => {
  const { generateTeams: generateTeamsActual } = jest.requireActual('../lib/teaming') as typeof import('../lib/teaming');
  // These tests use generateTeamsActual. 
  // generateTeamsActual internally calls assignRemainingParticipantsWithOptimization (actual).
  // assignRemainingParticipantsWithOptimization will then use the *globally mocked* versions of 
  // generateNeighbor, evaluateTeamSet, and balanceOptimizedTeams due to the top-level jest.mock.

  test('should run with empty inputs and produce no teams and no unteamed', () => {
    const participants: Participant[] = [];
    const config: TeamConfiguration = {
      teamSize: 3,
      factors: [],
    };
    const { teams, unteamed } = generateTeamsActual(participants, config, []);
    expect(teams).toEqual([]);
    expect(unteamed).toEqual([]);
  });

  test('should assign all participants to unteamed if fewer than min team size (idealSize -1)', () => {
    const participants: Participant[] = [{id: '1', name: 'A'}, {id: '2', name: 'B'}];
    const config: TeamConfiguration = {
      teamSize: 4, // min size 3
      factors: [],
    };
    const { teams, unteamed } = generateTeamsActual(participants, config, []);
    expect(teams.length).toBe(0);
    expect(unteamed.length).toBe(2);
    expect(unteamed.map(u=>u.id).sort()).toEqual(['1', '2']);
  });

  test('should create one team for participants matching an exact factor', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', location: 'NY' },
      { id: 'p2', name: 'Bob', location: 'NY' },
      { id: 'p3', name: 'Charlie', location: 'SF' },
    ];
    const config: TeamConfiguration = {
      teamSize: 2,
      factors: [
        { name: 'location', diversity: 0, priority: 'required', isMatch: true, order: 1 }
      ],
    };
    const { teams, unteamed } = generateTeamsActual(participants, config, []);
    
    expect(teams.length).toBe(1);
    const nyTeam = teams.find(t => t.members.some(m => m.location === 'NY'));
    expect(nyTeam).toBeDefined();
    expect(nyTeam!.members.length).toBe(2);
    expect(nyTeam!.members.map(m => m.id).sort()).toEqual(['p1', 'p2']);

    expect(unteamed.length).toBe(1);
    expect(unteamed[0].id).toBe('p3');
  });

  test('should handle multiple exact match groups', () => {
    const participants: Participant[] = [
      { id: 'p1', class: 'A', skill: 'X' },
      { id: 'p2', class: 'A', skill: 'Y' }, 
      { id: 'p3', class: 'B', skill: 'X' },
      { id: 'p4', class: 'B', skill: 'Y' }, 
      { id: 'p5', class: 'C', skill: 'Z' }, 
    ];
    const config: TeamConfiguration = {
      teamSize: 2,
      factors: [
        { name: 'class', diversity: 0, priority: 'required', isMatch: true, order: 1 }
      ],
    };
    const { teams, unteamed } = generateTeamsActual(participants, config, []);

    expect(teams.length).toBe(2); 
    const teamA = teams.find(t => t.members.some(m => m.class === 'A'));
    const teamB = teams.find(t => t.members.some(m => m.class === 'B'));

    expect(teamA).toBeDefined();
    expect(teamA!.members.length).toBe(2);
    expect(teamA!.members.map(m=>m.id).sort()).toEqual(['p1','p2']);

    expect(teamB).toBeDefined();
    expect(teamB!.members.length).toBe(2);
    expect(teamB!.members.map(m=>m.id).sort()).toEqual(['p3','p4']);
    
    expect(unteamed.length).toBe(1);
    expect(unteamed[0].id).toBe('p5');
  });

  test('should correctly handle the 5 participants, ideal size 2 scenario (expect 2 teams of 2, 1 unteamed)', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }, { id: 'p3', name: 'P3' },
      { id: 'p4', name: 'P4' }, { id: 'p5', name: 'P5' },
    ];
    const config: TeamConfiguration = { teamSize: 2, factors: [] };
    const { teams, unteamed } = generateTeamsActual(participants, config, []);

    expect(teams.length).toBe(2);
    teams.forEach((team: Team) => expect(team.members.length).toBe(2));
    expect(unteamed.length).toBe(1);
    const allOutputParticipantIds = [
      ...teams.flatMap((t: Team) => t.members.map((m: Participant) => m.id)),
      ...unteamed.map((u: Participant) => u.id)
    ].sort();
    const allInputParticipantIds = participants.map(p => p.id).sort();
    expect(allOutputParticipantIds).toEqual(allInputParticipantIds);
  });

  test('should preserve pinned teams and form new teams from remaining participants', () => {
    const allParticipants: Participant[] = [
      { id: 'p1', name: 'Pinned Alpha' }, { id: 'p2', name: 'Pinned Beta' },
      { id: 'p3', name: 'Process Gamma' }, { id: 'p4', name: 'Process Delta' }, { id: 'p5', name: 'Process Epsilon' },
    ];
    const pinnedTeam1: Team = {
      id: 'pinned-team-A', name: 'Team Alpha (Pinned)',
      members: [allParticipants[0], allParticipants[1]], 
      factorScores: {}, isPinned: true
    };
    const config: TeamConfiguration = { teamSize: 2, factors: [] };
    const { teams, unteamed } = generateTeamsActual(allParticipants, config, [pinnedTeam1]);

    const foundPinnedTeam = teams.find((t: Team) => t.id === 'pinned-team-A');
    expect(foundPinnedTeam).toBeDefined();
    expect(foundPinnedTeam?.members.map((m: Participant) => m.id).sort()).toEqual(['p1', 'p2'].sort());

    const newTeams = teams.filter((t: Team) => t.id !== 'pinned-team-A');
    expect(newTeams.length).toBe(1);
    expect(newTeams[0].members.length).toBe(2);
    expect(unteamed.length).toBe(1);

    const allOutputParticipantIds = [
      ...teams.flatMap((t: Team) => t.members.map((m: Participant) => m.id)),
      ...unteamed.map((u: Participant) => u.id)
    ].sort();
    const allInputParticipantIds = allParticipants.map(p => p.id).sort();
    expect(allOutputParticipantIds).toEqual(allInputParticipantIds);
  });
});

// The describe block for balanceTeamsAndCreateUnteamedPool, starting around line 152, will be removed entirely.
// describe('balanceTeamsAndCreateUnteamedPool', () => { ... entire block ... });
// Ensure no trailing code from this block remains. 