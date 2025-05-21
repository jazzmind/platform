import { describe, expect, test, jest } from '@jest/globals';
import { Team, Participant, TeamConfiguration } from '../types'; // Added Participant and TeamConfiguration
import { generateNeighbor as gn } from '../lib/teamingExtra';

// Mocking uuid potentially if generateNeighbor or helpers use it, though less likely for this specific function.
// jest.mock('uuid', () => ({
//   v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).substring(2, 10)}`)
// }));

describe('generateNeighbor_MainSuite', () => { // Renamed describe block to avoid conflict if any
  // Helper to create a simple team
  const createTeam = (id: string, name: string, members: Participant[] = []): Team => ({ 
    id, 
    name, 
    // members: JSON.parse(JSON.stringify(members)), // Keep for test data integrity if needed, or remove if causing issues with new logic expectations
    members: members.map(m => ({...m})), // Shallow copy of members to ensure test data is not mutated by reference issues across tests.
    factorScores: {},
    // isPinned: false // Add if relevant to your Team type
  });

  beforeEach(() => {
    // Reset Math.random mock before each test if it's spied on
    jest.restoreAllMocks(); 
  });

  test('should return an empty array if given an empty array', () => {
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;
    expect(gn([], config)).toEqual([]);
  });

  test('should return a new array instance even if no mutation occurs for non-empty input', () => {
    const p1: Participant = { id: 'p1', name: 'P1' };
    const teams: Team[] = [createTeam('t1', 'Team 1', [p1])];
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;
    
    // Mock Math.random to ensure no operational path is taken if possible, or rely on small chances for simple inputs.
    // For this test, the primary check is that the outer array is a new instance.
    const result = gn(teams, config);
    expect(result).toEqual(teams); // Values should be the same if no mutation effectively happened
    expect(result).not.toBe(teams); // Array instance must be new due to [...currentTeamsState]
  });

  test('modified team objects should be new instances, unmodified should be same instances', () => {
    const p1: Participant = { id: 'p1', name: 'P1' };
    const p2: Participant = { id: 'p2', name: 'P2' };
    const p3: Participant = { id: 'p3', name: 'P3' };
    const initialTeams: Team[] = [
      createTeam('t1', 'Team 1', [p1, p2]), // This team will be modified
      createTeam('t2', 'Team 2', [p3])       // This team will be unmodified
    ];
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;

    // Force a move from t1 to t2 (or attempt to)
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // Select 'move'
      .mockReturnValueOnce(0)    // Select source team (index 0 of non-empty, so initialTeams[0])
      .mockReturnValueOnce(0)    // Select member (p1 from t1)
      .mockReturnValueOnce(0);   // Select target team (index 0 of potential targets, which is initialTeams[1] if t1 is source)

    const result = gn(initialTeams, config); 

    expect(result.length).toBe(2);
    const resultT1 = result.find(t => t.id === 't1');
    const resultT2 = result.find(t => t.id === 't2');
    const originalT1 = initialTeams.find(t => t.id === 't1');
    const originalT2 = initialTeams.find(t => t.id === 't2');

    expect(resultT1).toBeDefined();
    expect(resultT2).toBeDefined();
    
    // t1 was source, t2 was target, both should have been modified and thus be new objects.
    expect(resultT1).not.toBe(originalT1);
    expect(resultT2).not.toBe(originalT2);
  });
  
  test('should preserve total number of participants', () => {
    const p1: Participant = { id: 'p1', name: 'P1' };
    const p2: Participant = { id: 'p2', name: 'P2' };
    const p3: Participant = { id: 'p3', name: 'P3' };
    const teams: Team[] = [
      createTeam('t1', 'Team 1', [p1, p2]),
      createTeam('t2', 'Team 2', [p3]),
    ];
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;
    const result = gn(teams, config);
    const totalParticipantsBefore = teams.reduce((sum, t) => sum + t.members.length, 0);
    const totalParticipantsAfter = result.reduce((sum, t) => sum + t.members.length, 0);
    expect(totalParticipantsAfter).toBe(totalParticipantsBefore);
  });

  // Test 'move' operation
  test('should perform a move operation (forced path)', () => {
    const p1: Participant = { id: 'p1', name: 'P1' };
    const p2: Participant = { id: 'p2', name: 'P2' };
    const p3: Participant = { id: 'p3', name: 'P3' };
    const initialTeamsRaw: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1, p2], factorScores: {} },
      { id: 't2', name: 'Team 2', members: [p3], factorScores: {} },
    ];
    // Create fresh copies for the test to avoid inter-test contamination via shared participant objects if any test modifies them
    const initialTeams: Team[] = initialTeamsRaw.map(t => ({...t, members: t.members.map(m => ({...m}))}));

    const config = { teamSize: 2, factors: [] } as TeamConfiguration;

    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)     // Action: move
      .mockReturnValueOnce(0)       // Source team index (from non-empty teams)
      .mockReturnValueOnce(0)       // Member index in source team (p1 from t1)
      .mockReturnValueOnce(0);      // Target team index (from potential targets)

    const result = gn(initialTeams, config); 

    const t1After = result.find(t => t.id === 't1');
    const t2After = result.find(t => t.id === 't2');

    expect(t1After).toBeDefined();
    expect(t2After).toBeDefined();
    expect(t1After!.members.map(m=>m.id)).toEqual([p2.id]);
    expect(t2After!.members.map(m=>m.id).sort()).toEqual([p1.id, p3.id].sort());
  });

  // Test 'swap' operation
  test('should perform a swap operation (forced path)', () => {
    // UNCOMMENT THE TEST LOGIC
    const p1: Participant = { id: 'p1', name: 'P1' };
    const p2: Participant = { id: 'p2', name: 'P2' };
    const p3: Participant = { id: 'p3', name: 'P3' };
    const p4: Participant = { id: 'p4', name: 'P4' };

    const initialTeamsRaw: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1, p2], factorScores: {} },
      { id: 't2', name: 'Team 2', members: [p3, p4], factorScores: {} },
    ];
    // Create fresh copies for the test to avoid inter-test contamination
    const initialTeams: Team[] = initialTeamsRaw.map(t => ({...t, members: t.members.map(m => ({...m}))}));
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;

    const mockMath = jest.spyOn(Math, 'random');
    const randomValues = [
      0.8,   // Action: swap
      0.01,  // Team1 index (selects t1 - index 0 of teamsWithMembersIndices)
      0.01,  // Initial Team2 index (selects t1 again - index 0 of teamsWithMembersIndices)
      0.6,   // Math.random() in while loop for Team2 (selects t2 - index 1 of teamsWithMembersIndices)
      0.01,  // Member1 index in t1 (selects p1 - index 0)
      0.01   // Member2 index in t2 (selects p3 - index 0)
    ];
    let callCount = 0;
    mockMath.mockImplementation(() => {
      const val = randomValues[callCount];
      // console.log(`Math.random call ${callCount + 1}: returning ${val}`); // For debugging
      callCount++;
      return val !== undefined ? val : 0.5; // Default if list exhausted (should not happen for this test)
    });

    const result = gn(initialTeams, config); 

    const t1After = result.find(t => t.id === 't1');
    const t2After = result.find(t => t.id === 't2');

    expect(t1After).toBeDefined();
    expect(t2After).toBeDefined();
    // After p1 from t1 is swapped with p3 from t2:
    // t1 should have [p3, p2]
    // t2 should have [p1, p4]
    expect(t1After!.members.map(m=>m.id).sort()).toEqual([p3.id, p2.id].sort());
    expect(t2After!.members.map(m=>m.id).sort()).toEqual([p1.id, p4.id].sort());
  });
});

// Keep the original simple test to ensure it still works or adapt if necessary
describe('generateNeighbor_Simple', () => {
  test('should return a valid neighbor for simple case', () => {
    const teams: Team[] = [
      { id: 's1', name: 'Simple Team 1', members: [], factorScores: {} },
      { id: 's2', name: 'Simple Team 2', members: [], factorScores: {} },
    ]
    const config = { teamSize: 2, factors: [] } as TeamConfiguration;
    const result = gn(teams, config);
    expect(result).toEqual(teams); 
    expect(result).not.toBe(teams); // Ensure it's a new array instance
  });
});