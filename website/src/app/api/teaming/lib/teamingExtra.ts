import { Team, TeamConfiguration, Factor, Participant } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { evaluateTeamSet, balanceOptimizedTeams } from "./teaming"; // Restore evaluateTeamSet
// import { balanceOptimizedTeams } from "./teaming"; // generateNeighbor no longer used by arpo
/**
 * Generates a "neighbor" solution by making a small modification to the current team assignments.
 * Used by the simulated annealing algorithm to explore the solution space.
 * Modifications can be moving a participant or swapping two participants between teams.
 * @param {Team[]} currentTeamsState - The current set of teams.
 * @param {TeamConfiguration} teamConfig - Contains ideal team size for constraints.
 * @returns {Team[]} A new team set representing a neighboring solution.
 */
export function generateNeighbor(currentTeamsState: Team[], teamConfig: TeamConfiguration): Team[] {
    const teamsCopy = [...currentTeamsState]; // Shallow copy of the array of teams
    const { teamSize } = teamConfig;
    const maxTeamSize = teamSize + 1;

    if (teamsCopy.length === 0 || teamsCopy.every(t => !t.members || t.members.length === 0)) {
        return teamsCopy; // Return shallow copy if no meaningful operation can be done
    }

    const actionType = Math.random();

    // --- MOVE OPERATION --- Logic from ~line 19 to ~line 46 in teamingExtra.ts
    if (actionType < 0.7 && teamsCopy.length >= 1) {
        const nonEmptyTeamIndices = teamsCopy
            .map((t, idx) => (t.members && t.members.length > 0) ? idx : -1)
            .filter(idx => idx !== -1);

        if (nonEmptyTeamIndices.length === 0) return teamsCopy;

        const sourceTeamGlobalIndex = nonEmptyTeamIndices[Math.floor(Math.random() * nonEmptyTeamIndices.length)];
        
        // Clone source team before modification
        const originalSourceTeam = teamsCopy[sourceTeamGlobalIndex];
        const clonedSourceTeamMembers = [...originalSourceTeam.members]; 
        teamsCopy[sourceTeamGlobalIndex] = { ...originalSourceTeam, members: clonedSourceTeamMembers };
        const sourceTeamRef = teamsCopy[sourceTeamGlobalIndex];

        if (sourceTeamRef.members.length === 0) return teamsCopy; 

        const memberToMove = sourceTeamRef.members.splice(Math.floor(Math.random() * sourceTeamRef.members.length), 1)[0];

        let potentialTargetTeamGlobalIndices = teamsCopy
            .map((t, idx) => (t.id !== sourceTeamRef.id && t.members && t.members.length < maxTeamSize) ? idx : -1)
            .filter(idx => idx !== -1);

        if (potentialTargetTeamGlobalIndices.length === 0) { 
            potentialTargetTeamGlobalIndices = teamsCopy
                .map((t, idx) => (t.id !== sourceTeamRef.id) ? idx : -1)
                .filter(idx => idx !== -1);
        }
        
        if (potentialTargetTeamGlobalIndices.length > 0) {
            const targetTeamGlobalIndex = potentialTargetTeamGlobalIndices[Math.floor(Math.random() * potentialTargetTeamGlobalIndices.length)];
            
            // Clone target team before modification
            const originalTargetTeam = teamsCopy[targetTeamGlobalIndex];
            const clonedTargetTeamMembers = [...originalTargetTeam.members, memberToMove]; 
            teamsCopy[targetTeamGlobalIndex] = { ...originalTargetTeam, members: clonedTargetTeamMembers };
        } else { 
            sourceTeamRef.members.push(memberToMove); 
        }

    // --- SWAP OPERATION --- Logic from ~line 48 to ~line 70 in teamingExtra.ts
    } else if (teamsCopy.length >= 2) {
        const teamsWithMembersIndices = teamsCopy
            .map((t, idx) => (t.members && t.members.length > 0) ? idx : -1)
            .filter(idx => idx !== -1);

        if (teamsWithMembersIndices.length < 2) return teamsCopy;

        const index1 = Math.floor(Math.random() * teamsWithMembersIndices.length);
        let index2 = Math.floor(Math.random() * teamsWithMembersIndices.length);
        while (index1 === index2) {
            index2 = Math.floor(Math.random() * teamsWithMembersIndices.length);
        }
        const team1GlobalIndex = teamsWithMembersIndices[index1];
        const team2GlobalIndex = teamsWithMembersIndices[index2];

        // Clone team1 before modification
        const originalTeam1 = teamsCopy[team1GlobalIndex];
        const clonedTeam1Members = [...originalTeam1.members];
        teamsCopy[team1GlobalIndex] = { ...originalTeam1, members: clonedTeam1Members };
        const team1Ref = teamsCopy[team1GlobalIndex];

        // Clone team2 before modification
        const originalTeam2 = teamsCopy[team2GlobalIndex];
        const clonedTeam2Members = [...originalTeam2.members];
        teamsCopy[team2GlobalIndex] = { ...originalTeam2, members: clonedTeam2Members };
        const team2Ref = teamsCopy[team2GlobalIndex];
        
        if (team1Ref.members.length > 0 && team2Ref.members.length > 0) {
            const member1IdxInTeam = Math.floor(Math.random() * team1Ref.members.length);
            const member2IdxInTeam = Math.floor(Math.random() * team2Ref.members.length);
            
            [team1Ref.members[member1IdxInTeam], team2Ref.members[member2IdxInTeam]] = 
            [team2Ref.members[member2IdxInTeam], team1Ref.members[member1IdxInTeam]];
        }
    }
    return teamsCopy;
  }
  

  /**
 * Assigns remaining participants to teams using an optimization algorithm (simulated annealing).
 * It takes teams that may already have some members (e.g., from exact matches) and adds the 
 * `participantsToAssign` to them, optimizing for overall team quality.
 * @param {Team[]} currentTeams - Teams potentially already partially filled.
 * @param {Participant[]} participantsToAssign - Participants needing assignment.
 * @param {Factor[]} activeFactors - Factors to consider for scoring.
 * @param {TeamConfiguration} teamConfig - Configuration including team size.
 * @param {Function} generateNeighborFn - Function to generate a neighboring solution.
 * @returns {Team[]} Teams after optimization and a preliminary balancing pass.
 */
export function assignRemainingParticipantsWithOptimization(
    currentTeams: Team[], 
    participantsToAssign: Participant[], 
    activeFactors: Factor[], 
    teamConfig: TeamConfiguration,
    generateNeighborFn: (teams: Team[], config: TeamConfiguration) => Team[]
): Team[] {
    const { teamSize } = teamConfig;
    if (participantsToAssign.length === 0 && currentTeams.length === 0) return [];
    if (participantsToAssign.length === 0) return [...currentTeams].map(t => ({...t, members: [...(t.members || [])]}));
    const optimizationTeamsWorking: Team[] = currentTeams.map(t => ({ ...t, members: [...(t.members || [])] }));
    if (participantsToAssign.length > 0) {
        if (optimizationTeamsWorking.length === 0) { 
            const numShellsNeeded = Math.ceil(participantsToAssign.length / teamSize) || 1; 
            for (let i = 0; i < numShellsNeeded; i++) {
                optimizationTeamsWorking.push({ id: uuidv4(), name: `OptShell ${i}`, members: [], factorScores: {} });
            }
        }
        participantsToAssign.forEach((participant, pIndex) => {
            let availableTeams = optimizationTeamsWorking.filter(t => t.members.length < teamSize + 1);
            if (availableTeams.length === 0) { 
                availableTeams = optimizationTeamsWorking; 
                if (optimizationTeamsWorking.length > 0) { 
                    console.warn("Optimization: Had to assign a participant to an already full/nearly full team or only one team exists.");
                }
            }
            if (availableTeams.length === 0 && optimizationTeamsWorking.length === 0) { 
                const newTeamForLonelyParticipant: Team = {id: uuidv4(), name: `LonelyShell ${pIndex}`, members: [participant], factorScores: {}};
                optimizationTeamsWorking.push(newTeamForLonelyParticipant);
            } else if (availableTeams.length > 0) {
                const targetTeam = availableTeams[pIndex % availableTeams.length];
                targetTeam.members.push(participant); 
            } else {
                if(optimizationTeamsWorking.length > 0){
                    optimizationTeamsWorking[0].members.push(participant);
                } else {
                    console.error("Critical: No teams available or creatable for participant assignment.");
                }
            }
        });
    }
    if (participantsToAssign.length > 0 && optimizationTeamsWorking.length === 0) {
        optimizationTeamsWorking.push({ id: uuidv4(), name: `FallbackShell`, members: [...participantsToAssign], factorScores: {} });
    }
    if (optimizationTeamsWorking.length === 0) { 
        return [];
    }

    const initialTemperature = 100, coolingRate = 0.95, minTemperature = 0.1;
    const maxIterations = Math.max(500, participantsToAssign.length * 25 + optimizationTeamsWorking.length * 5); 

    let currentSolutionForIteration: Team[] = optimizationTeamsWorking; 
    let bestSolutionOverall: Team[] = currentSolutionForIteration; 
    let bestScoreOverall = evaluateTeamSet(bestSolutionOverall, activeFactors, teamConfig);
    let temperature = initialTemperature;

    for (let i = 0; i < maxIterations; i++) {
        const neighborSolution = generateNeighborFn(currentSolutionForIteration, teamConfig);
        const neighborScore = evaluateTeamSet(neighborSolution, activeFactors, teamConfig);
        if (neighborScore > bestScoreOverall || Math.random() < Math.exp((neighborScore - bestScoreOverall) / temperature)) {
            currentSolutionForIteration = neighborSolution; 
            if (neighborScore > bestScoreOverall) {
                bestSolutionOverall = currentSolutionForIteration; 
                bestScoreOverall = neighborScore;
            }
        }
        temperature = Math.max(minTemperature, temperature * coolingRate);
        if (i > 10000 && i % 1000 === 0) {
            console.warn(`assignRemainingParticipantsWithOptimization: Exceeded 10k iterations (${i}), breaking early.`);
            break;
        }
    }
    
    return balanceOptimizedTeams(bestSolutionOverall, teamSize); 
}