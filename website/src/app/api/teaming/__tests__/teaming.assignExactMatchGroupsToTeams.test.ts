import { describe, expect, test } from '@jest/globals';
import type { Team, Factor, Participant } from '../types';
import { assignExactMatchGroupsToTeams } from '../lib/teaming';

describe('assignExactMatchGroupsToTeams', () => {
  // Using 'agtt' as a shorthand
  const agtt = assignExactMatchGroupsToTeams;

  const p1: Participant = { id: 'p1', location: 'NY' };
  const p2: Participant = { id: 'p2', location: 'NY' };
  const p3: Participant = { id: 'p3', location: 'SF' };
  const p4: Participant = { id: 'p4', location: 'SF' };
  const p5: Participant = { id: 'p5', location: 'NY' };

  const nyFactor: Factor = { name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 };
  const exactMatchFactorsList = [nyFactor];

  const createTeamShell = (id: string, name: string, members: Participant[] = []): Team => ({
    id,
    name,
    members: JSON.parse(JSON.stringify(members)), // Ensure deep copy for members in tests
    factorScores: {},
  });

  test('should return empty results if no groups or no teams', () => {
    const teams = [createTeamShell('t1', 'T1')];
    const groups = {};
    const res1 = agtt(teams, groups, 3, exactMatchFactorsList);
    expect(res1.updatedTeams[0].members.length).toBe(0);
    expect(res1.unplacedFromExactGroups.length).toBe(0);

    const res2 = agtt([], { 'group1': [p1] }, 3, exactMatchFactorsList);
    expect(res2.updatedTeams.length).toBe(0);
    expect(res2.unplacedFromExactGroups.map(p=>p.id)).toEqual([p1.id]);
  });

  test('should assign a single group to an empty team', () => {
    const teams = [createTeamShell('t1', 'T1')];
    const groups = { 'loc:NY': [p1, p2] };
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, 2, exactMatchFactorsList);
    expect(updatedTeams[0].members.map(m=>m.id).sort()).toEqual(['p1', 'p2'].sort());
    expect(unplacedFromExactGroups.length).toBe(0);
  });

  test('should assign multiple groups to multiple empty teams', () => {
    const teams = [createTeamShell('t1', 'T1'), createTeamShell('t2', 'T2')];
    const groups = { 'loc:NY': [p1, p2], 'loc:SF': [p3, p4] }; // Sorted largest first by function
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, 2, exactMatchFactorsList);
    
    const teamWithNY = updatedTeams.find(t => t.members.some(m => m.location === 'NY'));
    const teamWithSF = updatedTeams.find(t => t.members.some(m => m.location === 'SF'));

    expect(teamWithNY?.members.map(m=>m.id).sort()).toEqual(['p1', 'p2'].sort());
    expect(teamWithSF?.members.map(m=>m.id).sort()).toEqual(['p3', 'p4'].sort());
    expect(unplacedFromExactGroups.length).toBe(0);
  });

  test('should add group to a compatible, partially filled team', () => {
    const teams = [createTeamShell('t1', 'T1', [p1])]; // p1 is NY
    const groups = { 'loc:NY': [p2, p5] }; // p2, p5 are NY
    const idealSize = 3; // max 4. Team t1 has 1, group has 2. Total 3. Fits.
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    expect(updatedTeams[0].members.map(m=>m.id).sort()).toEqual(['p1', 'p2', 'p5'].sort());
    expect(unplacedFromExactGroups.length).toBe(0);
  });

  test('should NOT add group to an incompatible (mismatched factor value) partially filled team', () => {
    const teams = [createTeamShell('t1', 'T1', [p3])]; // p3 is SF
    const groups = { 'loc:NY': [p1, p2] }; // Group is NY
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, 3, exactMatchFactorsList);
    expect(updatedTeams[0].members.map(m=>m.id)).toEqual([p3.id]); // Team unchanged
    expect(unplacedFromExactGroups.map(m=>m.id).sort()).toEqual(['p1','p2'].sort()); // Group unplaced
  });

  test('should NOT add group if it exceeds max team size (ideal + 1)', () => {
    const teams = [createTeamShell('t1', 'T1')];
    const groups = { 'loc:NY': [p1, p2, p5] }; // Group of 3
    const idealSize = 1; // max size 2
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    expect(updatedTeams[0].members.length).toBe(0); // Team unchanged
    expect(unplacedFromExactGroups.map(m=>m.id).sort()).toEqual(['p1','p2','p5'].sort());
  });
  
  test('should add group to partially filled team if it just fits max size', () => {
    const teams = [createTeamShell('t1', 'T1', [p1])]; // Team has 1 member (NY)
    const groups = { 'loc:NY': [p2, p5] }; // Group of 2 (NY)
    const idealSize = 2; // max size 3. Team has 1, group has 2. 1+2=3. Fits.
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    expect(updatedTeams[0].members.map(m=>m.id).sort()).toEqual(['p1','p2','p5'].sort());
    expect(unplacedFromExactGroups.length).toBe(0);
  });

  test('should correctly place groups when some teams are empty and some are compatible-partial', () => {
    const teams = [
      createTeamShell('t_empty', 'Empty'), 
      createTeamShell('t_partial_NY', 'Partial NY', [p1]) // p1 NY
    ];
    const groups = {
      'loc:SF': [p3, p4],       // Group of 2 (SF)
      'loc:NY_extra': [p2, p5]  // Group of 2 (NY)
    };
    const idealSize = 3; // max 4
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    
    const sfTeam = updatedTeams.find(t => t.members.some(m => m.location === 'SF'));
    const nyTeam = updatedTeams.find(t => t.members.some(m => m.id === 'p1')); // Original p1 team

    expect(sfTeam?.members.map(m=>m.id).sort()).toEqual(['p3','p4'].sort());
    expect(nyTeam?.members.map(m=>m.id).sort()).toEqual(['p1','p2','p5'].sort());
    expect(unplacedFromExactGroups.length).toBe(0);
  });

  test('should mark group as unplaced if it is larger than maxTeamSize from the start', () => {
    const teams = [createTeamShell('t1','T1')];
    const groups = { 'loc:NY': [p1,p2,p5, {id:'p_extra', location:'NY'}] }; // Group of 4
    const idealSize = 2; // maxTeamSize = 3
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    expect(updatedTeams[0].members.length).toBe(0);
    expect(unplacedFromExactGroups.length).toBe(4);
  });

  test('groups are processed largest first; smaller group unplaced if no space after larger one', () => {
    const teams = [createTeamShell('t1', 'T1')]; // 1 empty team
    const groups = {
      'loc:NY_large': [p1, p2, p5], // Group of 3 (NY)
      'loc:SF_small': [p3]          // Group of 1 (SF)
    };
    const idealSize = 2; // maxTeamSize = 3. NY_large (3) will take t1.
    const { updatedTeams, unplacedFromExactGroups } = agtt(teams, groups, idealSize, exactMatchFactorsList);
    
    const nyTeam = updatedTeams.find(t => t.members.some(m=>m.location === 'NY'));
    expect(nyTeam?.members.map(m=>m.id).sort()).toEqual(['p1','p2','p5'].sort());
    expect(unplacedFromExactGroups.map(m=>m.id)).toEqual([p3.id]);
  });
}); 