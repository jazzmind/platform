import { describe, expect, test } from '@jest/globals';
import type { Team, Participant } from '../types';
import { getUnassignedParticipants } from '../lib/teaming';

describe('getUnassignedParticipants', () => {
  // Using 'gup' as a shorthand as in the original file
  const gup = getUnassignedParticipants;

  const p1: Participant = { id: '1', name: 'P1' };
  const p2: Participant = { id: '2', name: 'P2' };
  const p3: Participant = { id: '3', name: 'P3' };
  const p4: Participant = { id: '4', name: 'P4' };
  const allTestDataParticipants = [p1, p2, p3, p4];

  test('should return all participants if initialTeams is undefined', () => {
    const result = gup(allTestDataParticipants, undefined);
    expect(result).toEqual(allTestDataParticipants);
    expect(result.length).toBe(4);
  });

  test('should return all participants if initialTeams is empty', () => {
    const result = gup(allTestDataParticipants, []);
    expect(result).toEqual(allTestDataParticipants);
    expect(result.length).toBe(4);
  });

  test('should return only participants not in initialTeams', () => {
    const initialTeams: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1], factorScores: {} },
    ];
    const result = gup(allTestDataParticipants, initialTeams);
    expect(result.map(p=>p.id).sort()).toEqual(['2', '3', '4'].sort());
    expect(result.length).toBe(3);
  });

  test('should handle multiple initial teams and multiple members', () => {
    const initialTeams: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1, p2], factorScores: {} },
      { id: 't2', name: 'Team 2', members: [p3], factorScores: {} },
    ];
    const result = gup(allTestDataParticipants, initialTeams);
    expect(result.map(p=>p.id).sort()).toEqual(['4'].sort());
    expect(result.length).toBe(1);
  });

  test('should return an empty array if all participants are in initialTeams', () => {
    const initialTeams: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1, p2, p3, p4], factorScores: {} },
    ];
    const result = gup(allTestDataParticipants, initialTeams);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  test('should handle initial teams with empty or undefined members arrays gracefully', () => {
    const initialTeams: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1], factorScores: {} },
      { id: 't2', name: 'Team 2', members: [], factorScores: {} }, // Empty members
      { id: 't3', name: 'Team 3', members: undefined as unknown as Participant[], factorScores: {} }, // Undefined members
    ];
    const result = gup(allTestDataParticipants, initialTeams);
    expect(result.map(p=>p.id).sort()).toEqual(['2', '3', '4'].sort());
    expect(result.length).toBe(3);
  });

  test('should return an empty array if allParticipants is empty', () => {
    const initialTeams: Team[] = [
      { id: 't1', name: 'Team 1', members: [p1], factorScores: {} },
    ];
    const result = gup([], initialTeams);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });
}); 