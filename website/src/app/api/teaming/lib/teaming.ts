/**
 * Teaming Algorithm Core Logic
 *
 * This module contains the primary functions for generating balanced teams based on participant data and configurable factors.
 *
 * Key Concepts:
 *
 * Factors:
 *   - Represent columns from the input CSV (e.g., skills, experience, availability).
 *   - Can contain numeric or categorical (text) values.
 *   - Each factor has a configured diversity value (0-1):
 *     - 0 (Similar): The algorithm strives to make all team members have the *same* value for this factor.
 *       If an "Exact Match" (isMatch=true) is specified for a factor, it implies diversity=0 and high priority.
 *     - 1 (Diverse): The algorithm strives to make all team members have *different* values for this factor.
 *     - Intermediate values (e.g., 0.5) represent a blend, seeking some variety but not strictly all different or all same.
 *
 * Factor Priority & Order:
 *   - Factors can be ignored.
 *   - Active factors are processed based on priority and user-defined order:
 *     1. Required Priority (in specified order)
 *     2. High Priority (in specified order)
 *     3. Medium Priority (in specified order)
 *     4. Low Priority (in specified order)
 *   - This order influences how trade-offs are made when perfect satisfaction of all factors isn't possible.
 *
 * Team Size & Unteamed Pool:
 *   - A desired (ideal) team size is specified.
 *   - The algorithm forms teams that are +/- 1 from this ideal size.
 *   - Participants who cannot be placed into a valid team under these size constraints are moved to an "unteamed" pool
 *     for manual assignment or review.
 *
 * Factor Choice Groups (NEW CONCEPT - Future Implementation):
 *   - Scenario: Multiple factors represent ranked choices (e.g., TimeSlot1, TimeSlot2, TimeSlot3).
 *   - Goal: Group these factors and ensure that for each team/participant, at least *one* of the factors in the choice group
 *     is satisfied according to its priority/diversity, attempting them in the specified order within the group.
 *   - Example: If TimeSlot1 is "Required" and a participant can be matched, TimeSlot2 and TimeSlot3 might be ignored for them.
 *     If TimeSlot1 cannot be matched, an algorithm would then try TimeSlot2, and so on.
 *
 * Core Algorithm Steps (High-Level):
 *   1. Pre-processing: Filter participants, handle pinned/pre-assigned members, sort active factors.
 *   2. Participant Grouping (for Exact Matches): Group participants who *must* be together based on "Exact Match" factors.
 *      - Unassigned participants from groups that are too large for any team are added to a preliminary unteamed list.
 *   3. Initial Team Shell Creation: Create an estimated number of empty teams, considering initial teams.
 *   4. Assignment Strategy:
 *      - For exact match groups: Directly assign to suitable teams. Unplaced groups/participants are added to preliminary unteamed.
 *      - For other participants: Employ an optimization algorithm (e.g., simulated annealing) to distribute
 *        them among available/newly created team shells, aiming to maximize a score based on factor satisfaction.
 *   5. Balancing & Unteamed Pool Generation:
 *      - Adjust team sizes to be within the allowed +/- 1 range of the ideal size.
 *      - Move any overflow/underflow participants that cannot be balanced into the final "unteamed" pool.
 *      - Merge preliminary unteamed list with this pool.
 *   6. Scoring: (Optional) Calculate final scores for each team based on factor satisfaction (mainly used during optimization).
 */

import { Team, TeamConfiguration, Factor, Participant } from "../types";
import { assignRemainingParticipantsWithOptimization, generateNeighbor } from "./teamingExtra";
import { calculateDiversityForFactor } from "./scoring";
import { v4 as uuidv4 } from 'uuid';


/**
 * Weights applied to factors based on their priority level during score evaluation.
 */
const PRIORITY_WEIGHTS: Record<string, number> = {
    required: 10,
    high: 3,
    medium: 2,
    low: 1,
  };
  
// 1. Pre-processing helpers
/**
 * Filters out ignored factors and sorts the remaining factors by priority and then by user-defined order.
 * Priority order: Required > High > Medium > Low.
 * @param {Factor[] | undefined} factorConfigs - The initial list of factor configurations.
 * @returns {Factor[]} The sorted list of active factors.
 */
export function prepareActiveFactors(factorConfigs: Factor[] | undefined): Factor[] {
  const priorityOrder: Record<string, number> = { required: 0, high: 1, medium: 2, low: 3 };
  return (factorConfigs || [])
    .filter(f => !f.ignored)
    .sort((a, b) => {
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      const priorityDiff = priorityA - priorityB;
      if (priorityDiff !== 0) return priorityDiff;
      return (a.order ?? 0) - (b.order ?? 0);
    });
}

/**
 * Identifies participants who are not already members of any initial/pre-configured teams.
 * @param {Participant[]} allParticipants - The complete list of all participants.
 * @param {Team[] | undefined} initialTeams - A list of teams that might already have members assigned.
 * @returns {Participant[]} A list of participants who need to be assigned to teams.
 */
export function getUnassignedParticipants(
  allParticipants: Participant[],
  initialTeams: Team[] | undefined
): Participant[] {
  if (!initialTeams || initialTeams.length === 0) return allParticipants;
  const participantsInPreconfiguredTeams = new Set(
    initialTeams.flatMap(t => t.members?.map(m => m.id) || [])
  );
  return allParticipants.filter(p => !participantsInPreconfiguredTeams.has(p.id));
}

// 2. Participant Grouping for Exact Matches
/**
 * Result structure for the `groupParticipantsByExactMatches` function.
 */
interface ExactMatchGroupingResult {
  /** Groups of participants keyed by a composite string of their exact match factor values. */
  exactMatchGroups: Record<string, Participant[]>;
  /** Participants who did not fit into any exact match group based on factor values. */
  remainingParticipants: Participant[];
  /** Participants who could not be considered for exact match grouping (e.g., missing a required exact match factor value). */
  preliminaryUnteamed: Participant[];
}

/**
 * Groups participants based on shared values for factors marked as 'isMatch = true'.
 * Participants who cannot be grouped (e.g., missing a value for an exact match factor) are put into `preliminaryUnteamed`.
 * Others who don't fall into an exact match group are returned as `remainingParticipants`.
 * @param {Participant[]} participants - The list of participants to group.
 * @param {Factor[]} activeFactors - The list of active, sorted factors.
 * @returns {ExactMatchGroupingResult} An object containing the groups, remaining participants, and preliminary unteamed participants.
 */
export function groupParticipantsByExactMatches(
  participants: Participant[],
  activeFactors: Factor[]
): ExactMatchGroupingResult {
  const exactMatchFactors = activeFactors.filter(f => f.isMatch);
  const preliminaryUnteamed: Participant[] = [];

  if (exactMatchFactors.length === 0) {
    return { exactMatchGroups: {}, remainingParticipants: participants, preliminaryUnteamed };
  }

  const exactMatchGroups: Record<string, Participant[]> = {};
  const assignedToGroup = new Set<string>();

  participants.forEach(participant => {
    const keyParts: string[] = [];
    let canBeMatched = true;
    for (const factor of exactMatchFactors) {
      const value = participant[factor.name];
      if (value === undefined || value === null || value.trim() === '') { // Participant must have a value for an exact match factor
        canBeMatched = false;
        break;
      }
      keyParts.push(`${factor.name}:${value}`);
    }

    if (canBeMatched) {
      const groupKey = keyParts.join('|');
      if (!exactMatchGroups[groupKey]) {
        exactMatchGroups[groupKey] = [];
      }
      exactMatchGroups[groupKey].push(participant);
      assignedToGroup.add(participant.id);
    } else {
      preliminaryUnteamed.push(participant); 
    }
  });

  // Remaining participants are those not assigned to an exact group and not already in preliminary unteamed.
  const remainingParticipants = participants.filter(p => 
    !assignedToGroup.has(p.id) && 
    !preliminaryUnteamed.find(up => up.id === p.id)
  );
  return { exactMatchGroups, remainingParticipants, preliminaryUnteamed };
}

// 3. Initial Team Shell Creation
/**
 * Creates new empty team shells based on the number of participants needing assignment 
 * (from exact match groups and remaining participants) and the ideal team size.
 * It considers existing teams in `initialTeams` to determine how many *new* shells are actually needed.
 * @param {Team[]} initialTeams - Pre-existing teams, which might be empty or partially filled.
 * @param {Record<string, Participant[]>} exactMatchGroups - Groups of participants to be placed based on exact matches.
 * @param {Participant[]} remainingParticipants - Participants to be placed via optimization.
 * @param {number} idealTeamSize - The target ideal size for teams.
 * @returns {Team[]} A list of teams, including initial teams and any newly created empty shells.
 */
export function createAndPrepareTeamShells(
  initialTeams: Team[],
  exactMatchGroups: Record<string, Participant[]>,
  remainingParticipants: Participant[],
  idealTeamSize: number
): Team[] {
  const workingTeams: Team[] = JSON.parse(JSON.stringify(initialTeams));
  let totalParticipantsToAssign = remainingParticipants.length;
  Object.values(exactMatchGroups).forEach(group => { totalParticipantsToAssign += group.length; });

  // If no new participants to assign and initial teams are already reasonably full, no new shells needed.
  if (totalParticipantsToAssign === 0 && workingTeams.every(t => t.members && t.members.length >= idealTeamSize - 1)) {
    return workingTeams;
  }

  const expectedTeamCountForNewAssignments = totalParticipantsToAssign > 0 ? Math.ceil(totalParticipantsToAssign / idealTeamSize) : 0;
  // Count shells among existing teams that can potentially accept new members.
  const existingPotentiallyUsableShellsCount = workingTeams.filter(t => t.members && t.members.length < idealTeamSize + 1).length;
  let newShellsToCreate = Math.max(0, expectedTeamCountForNewAssignments - existingPotentiallyUsableShellsCount);

  // Edge case: if participants need assignment but no usable shells exist (either initially or after calculation for new ones),
  // ensure enough shells are created for the new assignments.
  if (expectedTeamCountForNewAssignments > 0 && existingPotentiallyUsableShellsCount === 0 && workingTeams.length === 0) {
    newShellsToCreate = expectedTeamCountForNewAssignments;
  } else if (expectedTeamCountForNewAssignments > 0 && workingTeams.length > 0 && newShellsToCreate === 0 && !workingTeams.some(t => t.members && t.members.length < idealTeamSize + 1)){
    // Participants to assign, initial teams exist but are all full, and newShellsToCreate was calculated as 0.
    newShellsToCreate = expectedTeamCountForNewAssignments;
  }

  for (let i = 0; i < newShellsToCreate; i++) {
    workingTeams.push({
      id: uuidv4(),
      name: `New Team ${initialTeams.length + i + 1}`, // Name can be improved later
      members: [],
      factorScores: {},
    });
  }
  return workingTeams;
}

// 4.a. Assign Exact Match Groups
/**
 * Result structure for `assignExactMatchGroupsToTeams`.
 */
interface AssignExactMatchResult {
  /** The list of teams after attempting to assign exact match groups. */
  updatedTeams: Team[];
  /** Participants from exact match groups that could not be placed (e.g., group too large, no suitable team). */
  unplacedFromExactGroups: Participant[];
}

/**
 * Attempts to assign pre-defined groups of participants (based on exact match factors) to suitable teams.
 * A suitable team is either empty or contains members with the same exact match factor values and has space.
 * Groups are processed largest first.
 * @param {Team[]} teams - The current list of teams (shells), including initial and newly created ones.
 * @param {Record<string, Participant[]>} groups - Exact match groups to assign.
 * @param {number} idealTeamSize - The ideal team size, used to calculate max team size.
 * @param {Factor[]} exactMatchFactors - The list of factors that define an exact match, used for compatibility checks.
 * @returns {AssignExactMatchResult} The updated list of teams and any participants from groups that couldn't be placed.
 */
export function assignExactMatchGroupsToTeams(
  teams: Team[],
  groups: Record<string, Participant[]>,
  idealTeamSize: number,
  exactMatchFactors: Factor[]
): AssignExactMatchResult {
  const updatedTeams: Team[] = JSON.parse(JSON.stringify(teams));
  const unplacedFromExactGroups: Participant[] = [];
  const maxTeamSize = idealTeamSize + 1;

  // Sort groups by size (largest first) to try and fit them optimally.
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  for (const groupKey of sortedGroupKeys) {
    const groupParticipants = groups[groupKey];
    if (groupParticipants.length === 0) continue;

    // If the group itself is larger than any team can accommodate, these participants become unplaced.
    if (groupParticipants.length > maxTeamSize) {
      console.warn(`Exact match group ${groupKey} (size ${groupParticipants.length}) is too large for max team size ${maxTeamSize}. Adding to unplaced.`);
      unplacedFromExactGroups.push(...groupParticipants);
      continue;
    }

    // Find a compatible team: empty with space, or partially filled with matching members and space.
    const targetTeam = updatedTeams.find(team => {
      if (team.members.length === 0 && groupParticipants.length <= maxTeamSize) return true;
      if (team.members.length > 0 && (team.members.length + groupParticipants.length) <= maxTeamSize) {
        // Check compatibility with existing members based on exact match factors.
        const firstMemberOfTeam = team.members[0];
        const firstMemberOfGroup = groupParticipants[0]; // All in group share same exact values for these factors.
        return exactMatchFactors.every(factor => firstMemberOfTeam[factor.name] === firstMemberOfGroup[factor.name]);
      }
      return false;
    });

    if (targetTeam) {
      targetTeam.members.push(...groupParticipants);
    } else {
      // No suitable team found for this group.
      console.warn(`Could not find a suitable team for exact match group ${groupKey} (size ${groupParticipants.length}). Adding to unplaced.`);
      unplacedFromExactGroups.push(...groupParticipants);
    }
  }
  return { updatedTeams, unplacedFromExactGroups };
}

// 4.b. Optimization Algorithm Components
/**
 * Evaluates the overall quality of a given set of teams based on factor satisfaction and size balance.
 * This score is used by the optimization algorithm to guide its search.
 * @param {Team[]} teamsToEvaluate - The set of teams to score.
 * @param {Factor[]} activeFactors - Active factors to consider for scoring.
 * @param {TeamConfiguration} teamConfig - Contains ideal team size and other relevant settings.
 * @returns {number} The calculated score for the team set. Higher is better.
 */
export function evaluateTeamSet(
  teamsToEvaluate: Team[], activeFactors: Factor[], teamConfig: TeamConfiguration ): number {
  const { teamSize } = teamConfig;
  let totalScore = 0;
  const sizeBalanceWeight = 2.5; // Relative importance of team size balance
  const diversityWeight = 1.0;   // Relative importance of factor diversity scores
  const penaltyForEmptyTeam = -5; // Penalty for having empty teams in a solution

  if (teamsToEvaluate.length === 0) return -Infinity; // Or a very low number

  teamsToEvaluate.forEach(team => {
    if (!team.members || team.members.length === 0) {
      totalScore += penaltyForEmptyTeam; return;
    }

    // Score for team size balance
    const sizeDeviation = Math.abs(team.members.length - teamSize);
    let sizeScore = 1.0;
    if (sizeDeviation > 1) { // Penalize deviations greater than +/-1 from ideal
      sizeScore = 1.0 / (1 + Math.pow(sizeDeviation - 1, 2));
    } else if (team.members.length < Math.max(1, teamSize - 1) && teamSize > 1) { // Further penalize if below min allowed (unless ideal is 1)
      sizeScore = 0.5;
    }

    // Aggregate score for factor satisfaction
    let factorAggScore = 0; let totalFactorWeight = 0;
    activeFactors.forEach(factor => {
      const diversityValue = calculateDiversityForFactor(team.members as Participant[], factor.name, factor.diversity, factor.isMatch || false);
      const priorityW = PRIORITY_WEIGHTS[factor.priority] || 1; // Default weight if priority is somehow undefined
      totalFactorWeight += priorityW;

      if (factor.isMatch && diversityValue < 0.999) { // Heavy penalty for failed exact matches
        factorAggScore -= (1 - diversityValue) * priorityW * 25;
      } else {
        factorAggScore += diversityValue * priorityW;
      }
    });

    const avgFactorScore = totalFactorWeight > 0 ? factorAggScore / totalFactorWeight : 1.0; // Default to 1 if no factors or weights
    totalScore += (sizeBalanceWeight * sizeScore + diversityWeight * avgFactorScore);
  });

  return teamsToEvaluate.length > 0 ? totalScore / teamsToEvaluate.length : -Infinity; // Average score per team
}


/**
 * Performs a simple balancing of team sizes after the main optimization phase.
 * It redistributes all members from the optimized teams into a new set of teams, aiming for sizes closer to ideal.
 * This is a preparatory step before the final, more complex balancing that creates the unteamed pool.
 * @param {Team[]} teamsToBalance - The teams output by the optimization algorithm.
 * @param {number} idealSize - The ideal team size.
 * @returns {Team[]} A new list of teams with more balanced member counts.
 */
export function balanceOptimizedTeams(teamsToBalance: Team[], idealSize: number): Team[] {
  const teams = JSON.parse(JSON.stringify(teamsToBalance.filter(t => t.members && t.members.length > 0))) as Team[];
  if (teams.length === 0) return [];

  const allMembersFlat: Participant[] = teams.flatMap(t => t.members as Participant[]); // Ensure members are treated as Participants
      if (allMembersFlat.length === 0) return [];
  
      const totalMembers = allMembersFlat.length;
      const numOutputTeams = totalMembers > 0 ? Math.max(1, Math.ceil(totalMembers / idealSize)) : 0;
  if (numOutputTeams === 0) return []; 

  // Create new team shells, trying to reuse IDs/names if team count is similar
  const newBalancedTeams: Team[] = Array.from({ length: numOutputTeams }, (_, i) => {
    const originalTeam = i < teams.length ? teams[i] : null;
    return { 
      id: originalTeam?.id || uuidv4(), 
      name: originalTeam?.name || `Balanced Opt Team ${i + 1}`, 
          members: [],
      factorScores: originalTeam?.factorScores || {} 
    };
  });

  // Distribute all members round-robin into the new shells
  allMembersFlat.forEach((member, index) => newBalancedTeams[index % newBalancedTeams.length].members.push(member));
  return newBalancedTeams.filter(t => t.members && t.members.length > 0);
}



// 5. Final Balancing & Unteamed Pool Generation
/**
 * Performs the final balancing of all teams to ensure they meet size constraints (+/- 1 of idealSize).
 * Moves participants who cannot be placed in valid teams to an "unteamed" pool.
 * Includes special handling for specific scenarios like 5 participants with an ideal size of 2.
 * @param {Team[]} teamsFromAlgorithm - All teams formed after previous assignment steps.
 * @param {number} idealSize - The ideal target team size.
 * @param {number} originalTotalParticipants - The total count of participants at the start (used for special rules).
 * @returns {{ balancedTeams: Team[], unteamed: Participant[] }} The final set of valid teams and the pool of unteamed participants.
 */
export function balanceTeamsAndCreateUnteamedPool(
  teamsFromAlgorithm: Team[], idealSize: number, originalTotalParticipants: number ): { balancedTeams: Team[], unteamed: Participant[] } {
  // Start with a deep copy of teams that have members
  let currentTeams = JSON.parse(JSON.stringify(teamsFromAlgorithm.filter(t => t.members && t.members.length > 0))) as Team[];
  const unteamedPool: Participant[] = [];
    const minAllowedSize = Math.max(1, idealSize - 1);
    const maxAllowedSize = idealSize + 1;
    let changesMadeInPass: boolean;
  
  // Iteratively balance teams: handle overflows then underfills until no more changes can be made.
    do { 
      changesMadeInPass = false;
    currentTeams.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0)); // Largest first for overflows

    // Handle overflows
      const teamIdsForOverflowPass = currentTeams.map(t => t.id);
      for (const teamId of teamIdsForOverflowPass) {
        const team = currentTeams.find(t => t.id === teamId);
        if (!team) continue; // Team might have been removed or changed
      while (team.members && team.members.length > maxAllowedSize) {
        const memberToMove = team.members.pop() as Participant;
        if (!memberToMove) continue;
          let moved = false;
        currentTeams.sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0)); // Smallest first for recipient search
          for (const recipient of currentTeams) {
          if (recipient.id !== team.id && recipient.members && recipient.members.length < maxAllowedSize) {
            recipient.members.push(memberToMove); moved = true; changesMadeInPass = true; break;
          }
        }
        if (!moved) unteamedPool.push(memberToMove); // No suitable team, move to unteamed
        currentTeams.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0)); // Re-sort by largest after a change
      }
    }

    // Handle underfills (similar loop structure consideration might be needed if it also re-sorts main list mid-loop)
    currentTeams.sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0)); // Smallest first for underfills
      const teamIdsForUnderfillPass = currentTeams.map(t => t.id);
      for (const teamId of teamIdsForUnderfillPass) {
        const team = currentTeams.find(t => t.id === teamId);
        if (!team) continue; // Team might have been removed or changed
      if (!team.members || team.members.length === 0) continue; // Already became empty

        while (team.members.length < minAllowedSize) {
          let pulled = false;
        if (unteamedPool.length > 0) { // Try unteamed pool first
          const memberToPull = unteamedPool.pop() as Participant;
          if (memberToPull) { team.members.push(memberToPull); pulled = true; changesMadeInPass = true; }
        } else { // Try to pull from other (larger) teams
          currentTeams.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0)); // Largest first for donors
            for (const donor of currentTeams) {
            if (donor.id !== team.id && donor.members && donor.members.length > minAllowedSize) {
              const memberToPull = donor.members.pop() as Participant;
              if (memberToPull) { team.members.push(memberToPull); pulled = true; changesMadeInPass = true; break; }
            }
          }
        }
        if (!pulled) break; // Cannot fill this team further in this pass
        currentTeams.sort((a, b) => (a.members?.length || 0) - (b.members?.length || 0)); // Re-sort by smallest after a change
      }
    }
    currentTeams = currentTeams.filter(t => t.members && t.members.length > 0); // Remove any teams that became empty
    } while (changesMadeInPass);
  
  // Final validation: any teams not meeting strict size criteria are disbanded into unteamed pool.
  const finalValidTeams: Team[] = [];
    currentTeams.forEach(team => {
    let currentMinAllowedSize = minAllowedSize;
    if (idealSize > 1 && team.members && team.members.length === 1) {
      currentMinAllowedSize = idealSize;
    }

    if (team.members && team.members.length >= currentMinAllowedSize && team.members.length <= maxAllowedSize) {
      finalValidTeams.push(team);
    } else if (team.members && team.members.length > 0) {
      console.log(`[BalanceFinal] Disbanding team ${team.id} (members: ${team.members.map(m=>m.id).join(', ')}) due to size ${team.members.length} vs adjustedMin ${currentMinAllowedSize}/ideal ${idealSize}.`);
      unteamedPool.push(...(team.members as Participant[]));
    }
  });
  
  let finalTeamsForReturn = finalValidTeams; // Use finalValidTeams directly, but make it let for splice below

  // Special rule for 5 participants, ideal team size 2:
    if (idealSize === 2 && minAllowedSize === 1 && originalTotalParticipants === 5) {
    // Count teams of one and two *from the potentially modified list*
    const teamsOfOne = finalTeamsForReturn.filter(t => t.members?.length === 1);
    const teamsOfTwo = finalTeamsForReturn.filter(t => t.members?.length === 2);
    
    // Calculate current unteamed count for this specific rule check
    const tempUnteamedMap = new Map<string, Participant>();
    unteamedPool.forEach(p => { if (p && p.id) tempUnteamedMap.set(p.id, p); });
    const currentUnteamedForSpecialRule = Array.from(tempUnteamedMap.values());

    if (teamsOfOne.length === 1 && teamsOfTwo.length === 2 && currentUnteamedForSpecialRule.length === 0) {
            const teamToDisband = teamsOfOne[0];
      console.log(`Applying 5-participant rule: disbanding team ${teamToDisband.id} with member ${teamToDisband.members[0].id}`);
      if (teamToDisband.members) unteamedPool.push(...(teamToDisband.members as Participant[]));
      const indexToRemove = finalTeamsForReturn.findIndex(t => t.id === teamToDisband.id);
      if (indexToRemove > -1) {
        finalTeamsForReturn = finalTeamsForReturn.splice(indexToRemove, 1);
      }
    }
  }

  // Deduplicate unteamed pool by participant ID
  const uniqueUnteamedMap = new Map<string, Participant>();
  unteamedPool.forEach(p => { if (p && p.id) uniqueUnteamedMap.set(p.id, p); });
    return { 
    balancedTeams: finalTeamsForReturn.filter(t => t.members && t.members.length > 0),
    unteamed: Array.from(uniqueUnteamedMap.values()) 
  };
}

// Main Orchestrator Function
/**
 * Orchestrates the entire team generation process.
 * 1. Prepares factors and identifies participants needing assignment.
 * 2. Groups participants by exact match criteria, managing any preliminary unteamed members.
 * 3. Creates necessary team shells based on initial teams and participants to be assigned.
 * 4. Assigns exact match groups to teams, managing any unplaced from these groups.
 * 5. Assigns remaining participants using an optimization algorithm (simulated annealing).
 * 6. Performs a final balancing of all teams to meet size constraints and forms the final unteamed pool.
 * @param {Participant[]} allParticipants - The complete list of participants.
 * @param {TeamConfiguration} teamGenConfig - Configuration for team size and factors.
 * @param {Team[]} initialTeamsInput - Any teams that are pre-configured or pinned.
 * @returns {{ teams: Team[], unteamed: Participant[] }} The generated teams and unteamed participants.
 */
export function generateTeams(
  allParticipants: Participant[],
  teamGenConfig: TeamConfiguration,
  initialTeamsInput: Team[] = [] // These are pinned teams
): { teams: Team[], unteamed: Participant[] } {

  const pinnedTeams: Team[] = JSON.parse(JSON.stringify(initialTeamsInput)); // Deep clone for safety
  const pinnedParticipantIds = new Set(pinnedTeams.flatMap((t: Team) => t.members?.map(m => m.id) || []));

  const participantsToProcess = allParticipants.filter(p => !pinnedParticipantIds.has(p.id));

  const activeFactors = prepareActiveFactors(teamGenConfig.factors);

  // If no participants to process after filtering out pinned ones, return pinned teams and no unteamed.
  if (participantsToProcess.length === 0) {
    console.log(`No participants to process after accounting for ${pinnedTeams.length} pinned teams. Returning pinned teams.`);
    return { teams: pinnedTeams, unteamed: [] };
  }

  // Step 2: Group by exact matches (using participantsToProcess)
  const { exactMatchGroups, remainingParticipants, preliminaryUnteamed } = 
    groupParticipantsByExactMatches(participantsToProcess, activeFactors);
  
  const currentUnteamedPool: Participant[] = [...preliminaryUnteamed];

  // Step 3: Create team shells (for participantsToProcess, starting with empty initialTeams for this run)
  let workingTeams = createAndPrepareTeamShells(
    [], // No initial teams for this processing run of unpinned participants
    exactMatchGroups, 
    remainingParticipants, 
    teamGenConfig.teamSize
  );
  
  // Step 4a: Assign exact match groups
  const exactMatchFactorList = activeFactors.filter(f => f.isMatch);
  const assignExactMatchesResult = assignExactMatchGroupsToTeams(
    workingTeams, 
    exactMatchGroups, 
    teamGenConfig.teamSize,
    exactMatchFactorList
  );
  workingTeams = assignExactMatchesResult.updatedTeams;
  currentUnteamedPool.push(...assignExactMatchesResult.unplacedFromExactGroups);
  
  // Step 4b: Assign remaining participants using optimization
  workingTeams = assignRemainingParticipantsWithOptimization(
    workingTeams, 
    remainingParticipants, 
    activeFactors, 
    teamGenConfig,
    generateNeighbor
  );

  // Step 5: Final balancing and unteamed pool creation
  const { balancedTeams: newlyFormedTeams, unteamed: unteamedFromNewProcessing } = balanceTeamsAndCreateUnteamedPool(
    workingTeams, 
    teamGenConfig.teamSize, 
    participantsToProcess.length // Use count of participants processed in THIS run for rules like 5-person case
  );
  
  // Combine unteamed from this run's stages and ensure uniqueness
  const finalCombinedUnteamedFromNew = [...currentUnteamedPool, ...unteamedFromNewProcessing];
  const uniqueFinalUnteamedMap = new Map<string, Participant>();
  finalCombinedUnteamedFromNew.forEach(p => { if (p && p.id) uniqueFinalUnteamedMap.set(p.id, p); });
  
  const finalUnteamed = Array.from(uniqueFinalUnteamedMap.values());
  const finalTeams = [...pinnedTeams, ...newlyFormedTeams];

  console.log(`Generated ${finalTeams.length} total teams (${pinnedTeams.length} pinned, ${newlyFormedTeams.length} new). ${finalUnteamed.length} unteamed from processing.`);

  return { teams: finalTeams, unteamed: finalUnteamed };
}
