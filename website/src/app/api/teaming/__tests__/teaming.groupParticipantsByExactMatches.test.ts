import { describe, expect, test } from '@jest/globals';
import type { Factor, Participant } from '../types'; // Factor is from types.ts
import { groupParticipantsByExactMatches } from '../lib/teaming'; // Participant is from lib/teaming

describe('groupParticipantsByExactMatches', () => {
  // Using 'gpbm' as a shorthand
  const gpbm = groupParticipantsByExactMatches;

  const p1: Participant = { id: 'p1', location: 'NY', dept: 'Sales' };
  const p2: Participant = { id: 'p2', location: 'NY', dept: 'Sales' };
  const p3: Participant = { id: 'p3', location: 'SF', dept: 'Sales' };
  const p4: Participant = { id: 'p4', location: 'NY', dept: 'Engineering' };
  const p5: Participant = { id: 'p5', location: 'SF', dept: 'Sales' };
  const p6_missing_dept: Participant = { id: 'p6', location: 'NY' }; // Missing dept
  const p7_missing_loc: Participant = { id: 'p7', dept: 'Sales' }; // Missing location
  const p8_all_missing: Participant = { id: 'p8' }; // Missing all relevant factors
  const p9_unique_val: Participant = { id: 'p9', location: 'LA', dept: 'Marketing'};

  const allTestParticipants = [p1, p2, p3, p4, p5, p6_missing_dept, p7_missing_loc, p8_all_missing, p9_unique_val];

  test('should return empty results and all participants as remaining if no exact match factors', () => {
    const factors: Factor[] = [{ name: 'location', priority: 'high', diversity: 0, isMatch: false, order: 1 }];
    const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = gpbm(allTestParticipants, factors);
    expect(Object.keys(exactMatchGroups).length).toBe(0);
    expect(preliminaryUnteamed.length).toBe(0);
    expect(remainingParticipants.map(p=>p.id).sort()).toEqual(allTestParticipants.map(p=>p.id).sort());
  });

  test('should group by a single exact match factor', () => {
    const factors: Factor[] = [{ name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 }];
    const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = gpbm(
      [p1, p2, p3, p4, p5, p6_missing_dept, p7_missing_loc, p9_unique_val],
      factors
    );
    expect(exactMatchGroups['location:NY'].map((p:Participant)=>p.id).sort()).toEqual(['p1', 'p2', 'p4', 'p6'].sort());
    expect(exactMatchGroups['location:SF'].map((p:Participant)=>p.id).sort()).toEqual(['p3', 'p5'].sort());
    expect(exactMatchGroups['location:LA'].map((p:Participant)=>p.id).sort()).toEqual(['p9'].sort());
    expect(preliminaryUnteamed.map(p=>p.id)).toEqual(['p7']);
    expect(remainingParticipants.length).toBe(0);
  });

  test('should group by multiple exact match factors', () => {
    const factors: Factor[] = [
      { name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 },
      { name: 'dept', priority: 'required', diversity: 0, isMatch: true, order: 2 },
    ];
    const testSubset = [p1, p2, p3, p4, p5, p6_missing_dept, p7_missing_loc, p8_all_missing, p9_unique_val];
    const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = gpbm(testSubset, factors);

    expect(exactMatchGroups['location:NY|dept:Sales'].map((p:Participant)=>p.id).sort()).toEqual(['p1', 'p2'].sort());
    expect(exactMatchGroups['location:SF|dept:Sales'].map((p:Participant)=>p.id).sort()).toEqual(['p3', 'p5'].sort());
    expect(exactMatchGroups['location:NY|dept:Engineering'].map((p:Participant)=>p.id).sort()).toEqual(['p4'].sort());
    expect(exactMatchGroups['location:LA|dept:Marketing'].map((p:Participant)=>p.id).sort()).toEqual(['p9'].sort());
    
    expect(preliminaryUnteamed.map(p=>p.id).sort()).toEqual(['p6', 'p7', 'p8'].sort());
    expect(remainingParticipants.length).toBe(0);
  });

  test('should put participants missing ANY exact match factor value into preliminaryUnteamed', () => {
    const factors: Factor[] = [
      { name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 },
      { name: 'dept', priority: 'required', diversity: 0, isMatch: true, order: 2 },
    ];
    const { preliminaryUnteamed } = gpbm([p1, p6_missing_dept, p7_missing_loc, p8_all_missing], factors);
    expect(preliminaryUnteamed.map(p=>p.id).sort()).toEqual(['p6', 'p7', 'p8'].sort());
  });

  test('participants with all exact factors but unique values end up in exactMatchGroups alone', () => {
    const factors: Factor[] = [
        { name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 },
        { name: 'dept', priority: 'required', diversity: 0, isMatch: true, order: 2 },
    ];
    const testSet = [p1,p2,p3,p4,p9_unique_val]; 
    const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = gpbm(testSet, factors);

    expect(exactMatchGroups['location:NY|dept:Sales'].length).toBe(2);
    expect(exactMatchGroups['location:SF|dept:Sales'].length).toBe(1); // p3 unique
    expect(exactMatchGroups['location:NY|dept:Engineering'].length).toBe(1); // p4 unique
    expect(exactMatchGroups['location:LA|dept:Marketing'].length).toBe(1); // p9_unique_val unique
    expect(remainingParticipants.length).toBe(0);
    expect(preliminaryUnteamed.length).toBe(0);
  });
  
  test('should handle empty participant list', () => {
    const factors: Factor[] = [{ name: 'location', priority: 'required', diversity: 0, isMatch: true, order: 1 }];
    const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = gpbm([], factors);
    expect(Object.keys(exactMatchGroups).length).toBe(0);
    expect(remainingParticipants.length).toBe(0);
    expect(preliminaryUnteamed.length).toBe(0);
  });
}); 