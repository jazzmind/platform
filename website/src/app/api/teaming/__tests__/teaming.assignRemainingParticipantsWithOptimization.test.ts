import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { Factor, TeamConfiguration, Team, Participant } from '../types';
import { 
  assignRemainingParticipantsWithOptimization as arpoActual,
  // generateNeighbor as generateNeighborActual // We might need this if we want to call the real one elsewhere
} from '../lib/teamingExtra'; 

import * as teamingExtraModuleOrigin from '../lib/teamingExtra'; 
import * as teamingModuleOrigin from '../lib/teaming'; 

// Mock dependencies from teaming.ts (evaluateTeamSet, balanceOptimizedTeams)
jest.mock('../lib/teaming', () => {
  const actualTeaming = jest.requireActual('../lib/teaming') as typeof import('../lib/teaming');
  return {
    ...actualTeaming,
    evaluateTeamSet: jest.fn(),
    balanceOptimizedTeams: jest.fn(),
  };
});

describe('assignRemainingParticipantsWithOptimization', () => {
  const assignRemainingParticipantsWithOptimization = arpoActual;
  
  let mockGenerateNeighbor: jest.SpiedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>;
  const mockEvaluateTeamSet = teamingModuleOrigin.evaluateTeamSet as jest.MockedFunction<typeof teamingModuleOrigin.evaluateTeamSet>;
  const mockBalanceOptimizedTeams = teamingModuleOrigin.balanceOptimizedTeams as jest.MockedFunction<typeof teamingModuleOrigin.balanceOptimizedTeams>;

  beforeEach(() => {
    // Spy on and mock generateNeighbor from the actual imported module
    mockGenerateNeighbor = jest.spyOn(teamingExtraModuleOrigin, 'generateNeighbor');
    mockGenerateNeighbor.mockImplementation((teams: Team[]): Team[] => {
      return teams.map(team => ({ ...team, members: [...(team.members || [])] }));
    });

    mockEvaluateTeamSet.mockClear();
    mockBalanceOptimizedTeams.mockClear();
    
    mockEvaluateTeamSet.mockImplementation(() => 0);
    mockBalanceOptimizedTeams.mockImplementation((teams: Team[]): Team[] => teams);
    
    jest.spyOn(console, 'warn').mockImplementation(() => {}); 
  });

  afterEach(() => {
    jest.restoreAllMocks(); // This will restore spied functions too
  });

  const p1: Participant = { id: 'p1' };
  const p2: Participant = { id: 'p2' };
  const p3: Participant = { id: 'p3' };
  const p4: Participant = { id: 'p4' };

  const emptyFactors: Factor[] = [];
  const basicTeamConfig: TeamConfiguration = { teamSize: 2, factors: emptyFactors };

  const createTeam = (id: string, members: Participant[]): Team => ({ 
    id, 
    name: id, 
    members: [...members],
    factorScores: {} 
  });

  test('should return currentTeams if no participantsToAssign', () => {
    const current = [createTeam('t1', [p1])];
    const result = assignRemainingParticipantsWithOptimization(current, [], emptyFactors, basicTeamConfig, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    expect(result).toEqual(current); 
    expect(result).not.toBe(current);
    expect(mockGenerateNeighbor).not.toHaveBeenCalled();
    expect(mockEvaluateTeamSet).not.toHaveBeenCalled();
  });

  test('initial distribution: assign to existing available teams', () => {
    const current = [createTeam('t1', [p1]), createTeam('t2', [])];
    let scoreCounter = 1;
    mockEvaluateTeamSet.mockImplementation(() => scoreCounter++); 
    
    assignRemainingParticipantsWithOptimization(current, [p2, p3], emptyFactors, basicTeamConfig, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    expect(mockGenerateNeighbor).toHaveBeenCalled();
    expect(mockEvaluateTeamSet).toHaveBeenCalled();
  });

  test('initial distribution: assign to existing full teams with warning', () => {
    const teamSlightlyOverMax = createTeam('t1', [p1,p2,p3]);
    let scoreCounter = 1;
    mockEvaluateTeamSet.mockImplementation(() => scoreCounter++); 

    assignRemainingParticipantsWithOptimization([teamSlightlyOverMax], [p4], emptyFactors, basicTeamConfig, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    expect(console.warn).toHaveBeenCalledWith("Optimization: Had to assign a participant to an already full/nearly full team or only one team exists.");
    expect(mockGenerateNeighbor).toHaveBeenCalled();
  });

  test('initial distribution: create new shells if no currentTeams', () => {
    mockEvaluateTeamSet.mockReturnValue(10);
    assignRemainingParticipantsWithOptimization([], [p1, p2, p3], emptyFactors, basicTeamConfig, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    expect(mockGenerateNeighbor).toHaveBeenCalled();
    expect(mockEvaluateTeamSet).toHaveBeenCalled();
  });

  test('simulated annealing loop runs for maxIterations', () => {
    const participants = [p1, p2, p3, p4];
    const idealSize = 2;
    const config = { teamSize: idealSize, factors: emptyFactors };
    const expectedIterations = 500;

    mockEvaluateTeamSet.mockReturnValue(0);
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    assignRemainingParticipantsWithOptimization([], participants, emptyFactors, config, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    expect(mockGenerateNeighbor).toHaveBeenCalledTimes(expectedIterations);
    expect(mockEvaluateTeamSet).toHaveBeenCalledTimes(expectedIterations + 1);
  });

  test('simulated annealing: accepts better solutions', () => {
    const scores = [10, 20]; // Initial score, then better neighbor score
    let scoreCallCount = 0;
    mockEvaluateTeamSet.mockImplementation(() => scores[scoreCallCount++] || 0);

    const initialTeams = [createTeam('t1', [p1])];
    const participantsToAssign = [p2];
    // Ensure factors array is not empty for the annealing to make sense with scoring
    const tempTeamConfig: TeamConfiguration = { ...basicTeamConfig, factors: [{name: "fake", priority: "low" as const, diversity: 0.5}] };

    assignRemainingParticipantsWithOptimization(initialTeams, participantsToAssign, tempTeamConfig.factors, {
        ...tempTeamConfig, 
    }, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    
    expect(mockEvaluateTeamSet.mock.calls.length).toBeGreaterThanOrEqual(1); 
    // Add more specific assertions if needed, e.g., that best solution was updated
  });

  test('calls balanceOptimizedTeams at the end with the best solution and returns its result', () => {
    const mockBalancedReturn = [createTeam('balanced', [p1, p2])];
    // Use the imported mock directly for setting its behavior
    mockBalanceOptimizedTeams.mockReturnValueOnce(mockBalancedReturn);

    const result = assignRemainingParticipantsWithOptimization([], [p1, p2], emptyFactors, basicTeamConfig, mockGenerateNeighbor as jest.MockedFunction<typeof teamingExtraModuleOrigin.generateNeighbor>);
    
    expect(mockBalanceOptimizedTeams).toHaveBeenCalled();
    // Ensure it's called with an array of teams
    expect(Array.isArray(mockBalanceOptimizedTeams.mock.calls[0][0])).toBe(true);
    expect(result).toEqual(mockBalancedReturn);
  });

}); 