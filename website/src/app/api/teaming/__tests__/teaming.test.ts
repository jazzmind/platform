import { describe, expect, test, jest } from '@jest/globals';
import { POST } from '../generate/route';
import { NextRequest } from 'next/server';

// Mock uuid for consistent test results
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => 'test-uuid'),
}));

describe('Team Formation Algorithm', () => {
  // Helper function to create a mock NextRequest
  function createMockRequest(body: Record<string, unknown>) {
    return {
      json: jest.fn().mockResolvedValue(body as never),
    } as unknown as NextRequest;
  }

  test('should validate input data', async () => {
    // Invalid request - missing data
    const invalidRequest = createMockRequest({});
    const response = await POST(invalidRequest);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  test('should generate teams from CSV data', async () => {
    // Valid request with sample data
    const mockCSVData = {
      headers: ['id', 'email', 'skill', 'experience', 'location'],
      rows: [
        { id: '1', email: 'user1@example.com', skill: 'A', experience: '5', location: 'New York' },
        { id: '2', email: 'user2@example.com', skill: 'B', experience: '3', location: 'Chicago' },
        { id: '3', email: 'user3@example.com', skill: 'A', experience: '2', location: 'San Francisco' },
        { id: '4', email: 'user4@example.com', skill: 'C', experience: '7', location: 'New York' },
        { id: '5', email: 'user5@example.com', skill: 'B', experience: '4', location: 'Boston' },
        { id: '6', email: 'user6@example.com', skill: 'C', experience: '1', location: 'Chicago' },
        { id: '7', email: 'user7@example.com', skill: 'A', experience: '6', location: 'Boston' },
        { id: '8', email: 'user8@example.com', skill: 'B', experience: '3', location: 'San Francisco' },
      ],
    };

    const mockConfig = {
      teamSize: 4,
      factors: [
        { name: 'skill', diversity: 0.8, priority: 'high' as const },
        { name: 'experience', diversity: 0.5, priority: 'medium' as const },
        { name: 'location', diversity: 0.7, priority: 'low' as const },
      ],
    };

    const validRequest = createMockRequest({
      csvData: mockCSVData,
      config: mockConfig,
    });

    const response = await POST(validRequest);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.teams).toBeDefined();
    expect(Array.isArray(data.teams)).toBe(true);
    expect(data.teams.length).toBe(2); // 8 participants with team size 4 = 2 teams
    
    // Check team structure
    const firstTeam = data.teams[0];
    expect(firstTeam.id).toBeDefined();
    expect(firstTeam.name).toBeDefined();
    expect(Array.isArray(firstTeam.members)).toBe(true);
    expect(firstTeam.members.length).toBeLessThanOrEqual(mockConfig.teamSize + 1);
    expect(firstTeam.members.length).toBeGreaterThanOrEqual(mockConfig.teamSize - 1);
    expect(firstTeam.factorScores).toBeDefined();
    expect(Object.keys(firstTeam.factorScores)).toContain('skill');
    expect(Object.keys(firstTeam.factorScores)).toContain('experience');
    expect(Object.keys(firstTeam.factorScores)).toContain('location');
  });

  test('should handle numerical and categorical factors correctly', async () => {
    // Sample data with mixed factor types
    const mockCSVData = {
      headers: ['id', 'email', 'age', 'department'],
      rows: [
        { id: '1', email: 'user1@example.com', age: '25', department: 'Engineering' },
        { id: '2', email: 'user2@example.com', age: '32', department: 'Marketing' },
        { id: '3', email: 'user3@example.com', age: '45', department: 'Sales' },
        { id: '4', email: 'user4@example.com', age: '28', department: 'Engineering' },
        { id: '5', email: 'user5@example.com', age: '36', department: 'HR' },
        { id: '6', email: 'user6@example.com', age: '29', department: 'Marketing' },
      ],
    };

    // Test with high diversity for categorical factor and low diversity for numerical
    const mockConfig = {
      teamSize: 3,
      factors: [
        { name: 'age', diversity: 0.2, priority: 'medium' as const }, // Low diversity (similar ages)
        { name: 'department', diversity: 0.9, priority: 'high' as const }, // High diversity (different departments)
      ],
    };

    const validRequest = createMockRequest({
      csvData: mockCSVData,
      config: mockConfig,
    });

    const response = await POST(validRequest);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.teams).toBeDefined();
    expect(data.teams.length).toBe(2); // 6 participants with team size 3 = 2 teams
    
    // Check scores reflect diversity settings
    // For department (high diversity wanted), the score should be higher when teams have diverse departments
    // For age (low diversity wanted), the score should be higher when team members have similar ages
    
    const team1 = data.teams[0];
    const team2 = data.teams[1];
    
    // Both scores should be reasonable (above 0.3) as the algorithm tries to optimize
    expect(team1.factorScores.department).toBeGreaterThan(0.3);
    expect(team1.factorScores.age).toBeGreaterThan(0.3);
    expect(team2.factorScores.department).toBeGreaterThan(0.3);
    expect(team2.factorScores.age).toBeGreaterThan(0.3);
  });

  test('should balance team sizes', async () => {
    // Sample data with an odd number of participants
    const mockCSVData = {
      headers: ['id', 'email', 'skill'],
      rows: [
        { id: '1', email: 'user1@example.com', skill: 'A' },
        { id: '2', email: 'user2@example.com', skill: 'B' },
        { id: '3', email: 'user3@example.com', skill: 'C' },
        { id: '4', email: 'user4@example.com', skill: 'A' },
        { id: '5', email: 'user5@example.com', skill: 'B' },
        { id: '6', email: 'user6@example.com', skill: 'C' },
        { id: '7', email: 'user7@example.com', skill: 'A' },
      ],
    };

    const mockConfig = {
      teamSize: 3,
      factors: [
        { name: 'skill', diversity: 0.8, priority: 'high' as const },
      ],
    };

    const validRequest = createMockRequest({
      csvData: mockCSVData,
      config: mockConfig,
    });

    const response = await POST(validRequest);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.teams).toBeDefined();
    expect(data.teams.length).toBe(3); // 7 participants with team size 3 = 3 teams (2, 2, 3)
    
    // Check that team sizes are balanced
    const teamSizes = data.teams.map((team: Record<string, unknown>) => 
      (team.members as Array<unknown>).length
    );
    
    // Teams should vary by at most 1 member
    const minSize = Math.min(...teamSizes);
    const maxSize = Math.max(...teamSizes);
    expect(maxSize - minSize).toBeLessThanOrEqual(1);
    
    // Total members should equal original count
    const totalMembers = teamSizes.reduce((sum: number, size: number) => sum + size, 0);
    expect(totalMembers).toBe(mockCSVData.rows.length);
  });

  test('should respect factor diversity and priority settings', async () => {
    // Create a controlled test case with clear factor preferences
    const mockCSVData = {
      headers: ['id', 'email', 'level', 'specialty'],
      rows: [
        { id: '1', email: 'user1@example.com', level: '1', specialty: 'Frontend' },
        { id: '2', email: 'user2@example.com', level: '2', specialty: 'Backend' },
        { id: '3', email: 'user3@example.com', level: '3', specialty: 'DevOps' },
        { id: '4', email: 'user4@example.com', level: '1', specialty: 'Frontend' },
        { id: '5', email: 'user5@example.com', level: '2', specialty: 'Backend' },
        { id: '6', email: 'user6@example.com', level: '3', specialty: 'DevOps' },
        { id: '7', email: 'user7@example.com', level: '1', specialty: 'Frontend' },
        { id: '8', email: 'user8@example.com', level: '2', specialty: 'Backend' },
        { id: '9', email: 'user9@example.com', level: '3', specialty: 'DevOps' },
      ],
    };

    // Test two different configurations
    const diverseSpecialtyConfig = {
      teamSize: 3,
      factors: [
        { name: 'level', diversity: 0.5, priority: 'low' as const },
        { name: 'specialty', diversity: 1.0, priority: 'high' as const }, // High diversity, high priority
      ],
    };

    const similarLevelConfig = {
      teamSize: 3,
      factors: [
        { name: 'level', diversity: 0.0, priority: 'high' as const }, // Low diversity, high priority
        { name: 'specialty', diversity: 0.5, priority: 'low' as const },
      ],
    };

    // Test diverse specialty configuration
    const diverseRequest = createMockRequest({
      csvData: mockCSVData,
      config: diverseSpecialtyConfig,
    });

    const diverseResponse = await POST(diverseRequest);
    const diverseData = await diverseResponse.json();
    
    // Test similar level configuration
    const similarRequest = createMockRequest({
      csvData: mockCSVData,
      config: similarLevelConfig,
    });

    const similarResponse = await POST(similarRequest);
    const similarData = await similarResponse.json();
    
    // Compare the results - we should see different team compositions
    // For diverse specialty teams, each team should ideally have different specialties
    // For similar level teams, each team should have members with the same or similar levels
    
    // This is a simplistic check - in practice, the difference might be more subtle
    expect(diverseData.teams).not.toEqual(similarData.teams);
  });
}); 