import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface Factor {
  name: string;
  diversity: number;
  priority: 'high' | 'medium' | 'low' | 'required';
  isMatch?: boolean;
}

interface TeamConfiguration {
  teamSize: number;
  factors: Factor[];
}

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface Team {
  id: string;
  name: string;
  members: Record<string, string>[];
  factorScores: Record<string, number>;
  isPinned?: boolean;
}

interface RequestBody {
  csvData: CSVData;
  config: TeamConfiguration;
  pinnedTeams?: Team[];
  excludeIds?: string[];
  teamsWithPinnedMembers?: Record<string, Record<string, string>[]>;
  partiallyPinnedTeams?: Team[];
}

// Priority weights for scoring
const PRIORITY_WEIGHTS = {
  required: 10, // Highest weight for required factors
  high: 3,
  medium: 2,
  low: 1,
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { 
      csvData, 
      config, 
      excludeIds = [], 
      teamsWithPinnedMembers = {},
      partiallyPinnedTeams = []
    } = body;

    // Validate input
    if (!csvData || !config) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!csvData.rows.length) {
      return NextResponse.json(
        { error: 'No data provided in CSV' },
        { status: 400 }
      );
    }

    // Filter out rows that are already in pinned teams or individually pinned
    const availableRows = csvData.rows.filter(row => !excludeIds.includes(row.id));

    // Start creating teams with pinned members
    const initialTeams: Team[] = [];
    
    // Create initial teams for partially pinned teams
    Object.entries(teamsWithPinnedMembers).forEach(([teamId, members]) => {
      if (members.length > 0) {
        initialTeams.push({
          id: teamId,
          name: `Team ${initialTeams.length + 1}`,
          members,
          factorScores: {},
        });
      }
    });

    // Generate teams using the algorithm with only the available participants
    // and taking into account partially filled teams
    const newTeams = generateTeams(
      { ...csvData, rows: availableRows }, 
      config,
      initialTeams
    );

    // Calculate scores for partially pinned teams if provided
    const scoredPartialTeams = partiallyPinnedTeams.length > 0 
      ? calculateTeamScores(partiallyPinnedTeams, config.factors)
      : [];

    return NextResponse.json({ 
      teams: newTeams,
      partiallyPinnedTeams: scoredPartialTeams
    });
  } catch (error) {
    console.error('Team generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate teams' },
      { status: 500 }
    );
  }
}

/**
 * Generate teams based on CSV data and configuration
 */
function generateTeams(
  csvData: CSVData, 
  config: TeamConfiguration,
  initialTeams: Team[] = []
): Team[] {
  const { rows } = csvData;
  const { teamSize, factors } = config;
  
  // If we have no rows to assign, just return the initial teams
  if (rows.length === 0) {
    return initialTeams;
  }
  
  // First, check if there are any match factors (exact match required)
  const matchFactors = factors.filter(factor => factor.isMatch);
  
  // If there are match factors, pre-group by those factors
  const groupedParticipants: Record<string, Record<string, string>[]> = {};
  
  if (matchFactors.length > 0) {
    // Create a key based on the combination of match factors
    rows.forEach(participant => {
      const matchKey = matchFactors.map(factor => 
        `${factor.name}:${participant[factor.name]}`
      ).join('|');
      
      if (!groupedParticipants[matchKey]) {
        groupedParticipants[matchKey] = [];
      }
      
      groupedParticipants[matchKey].push(participant);
    });
  } else {
    // If no match factors, just put everyone in one group
    groupedParticipants['all'] = [...rows];
  }
  
  // Determine how many teams we need in total (based on total participants and team size)
  const totalParticipants = rows.length;
  const idealNumberOfTeams = Math.ceil(totalParticipants / teamSize);
  
  // Start with the initial teams (might already have some pinned members)
  const teams: Team[] = [...initialTeams];
  
  // Keep track of how many more teams we need to create
  const remainingTeams = Math.max(0, idealNumberOfTeams - teams.length);
  
  // Create empty teams to fill up to the ideal number
  for (let i = 0; i < remainingTeams; i++) {
    teams.push({
      id: uuidv4(),
      name: `Team ${teams.length + 1}`,
      members: [],
      factorScores: {},
    });
  }
  
  // For each group defined by match factors, distribute members optimally
  Object.values(groupedParticipants).forEach(group => {
    // Clone the group to avoid modifying the original data
    const participants = [...group];
    
    // Find teams that aren't full yet
    const availableTeams = teams.filter(team => 
      team.members.length < teamSize + 1
    );
    
    if (availableTeams.length === 0) {
      // All teams are full, we may need to create more teams
      const newTeam: Team = {
        id: uuidv4(),
        name: `Team ${teams.length + 1}`,
        members: [],
        factorScores: {},
      };
      teams.push(newTeam);
      availableTeams.push(newTeam);
    }
    
    // If there are match factors, we need to keep these participants together
    if (matchFactors.length > 0) {
      // Distribute this group across as few teams as possible
      // while respecting the team size constraints
      
      // Sort participants randomly
      const shuffledParticipants = shuffle([...participants]);
      
      // Sort available teams by current size (ascending)
      const sortedTeams = [...availableTeams].sort(
        (a, b) => a.members.length - b.members.length
      );
      
      let currentTeamIndex = 0;
      
      // Distribute participants to teams
      shuffledParticipants.forEach(participant => {
        // If current team is full, move to next
        if (sortedTeams[currentTeamIndex].members.length >= teamSize + 1) {
          currentTeamIndex++;
          
          // If we've run out of teams, create a new one
          if (currentTeamIndex >= sortedTeams.length) {
            const newTeam: Team = {
              id: uuidv4(),
              name: `Team ${teams.length + 1}`,
              members: [],
              factorScores: {},
            };
            teams.push(newTeam);
            sortedTeams.push(newTeam);
          }
        }
        
        // Add participant to current team
        sortedTeams[currentTeamIndex].members.push(participant);
      });
    } else {
      // No match factors, use simulated annealing for optimal distribution
      // Clone the available teams to avoid modifying the original data
      const teamsForOptimization = JSON.parse(JSON.stringify(availableTeams)) as Team[];
      
      // Distribute participants using simulated annealing
      const optimizedTeams = optimizeTeamAssignments(participants, teamsForOptimization, config);
      
      // Update the teams with the optimized assignments
      optimizedTeams.forEach((optimizedTeam, index) => {
        const teamIndex = teams.findIndex(t => t.id === availableTeams[index].id);
        if (teamIndex !== -1) {
          teams[teamIndex].members = optimizedTeam.members;
        }
      });
    }
  });
  
  // Balance team sizes to ensure no team is too large or small
  const balancedTeams = balanceTeamSizes(teams, teamSize);
  
  // Calculate diversity scores for each team
  return calculateTeamScores(balancedTeams, factors);
}

/**
 * Optimize team assignments using simulated annealing
 */
function optimizeTeamAssignments(
  participants: Record<string, string>[],
  initialTeams: Team[],
  config: TeamConfiguration
): Team[] {
  const { teamSize, factors } = config;
  const teams = JSON.parse(JSON.stringify(initialTeams)) as Team[];
  
  // Shuffle participants randomly for initial assignment
  const shuffledParticipants = shuffle([...participants]);
  
  // Initial assignment - distribute evenly
  shuffledParticipants.forEach((participant, index) => {
    const teamIndex = index % teams.length;
    teams[teamIndex].members.push(participant);
  });
  
  // Simulated annealing parameters
  const initialTemperature = 100;
  const coolingRate = 0.95;
  const iterations = 1000;
  
  let currentSolution = JSON.parse(JSON.stringify(teams)) as Team[];
  let bestSolution = JSON.parse(JSON.stringify(teams)) as Team[];
  let bestScore = evaluateSolution(currentSolution, factors, teamSize);
  
  let temperature = initialTemperature;
  
  // Simulated annealing main loop
  for (let i = 0; i < iterations; i++) {
    // Generate a neighboring solution by swapping two random participants
    const newSolution = generateNeighborSolution(currentSolution);
    
    // Calculate scores
    const currentScore = evaluateSolution(currentSolution, factors, teamSize);
    const newScore = evaluateSolution(newSolution, factors, teamSize);
    
    // Decide whether to accept the new solution
    const acceptanceProbability = 
      newScore > currentScore ? 1 : Math.exp((newScore - currentScore) / temperature);
    
    if (Math.random() < acceptanceProbability) {
      currentSolution = newSolution;
      
      // Update best solution if current is better
      if (newScore > bestScore) {
        bestSolution = JSON.parse(JSON.stringify(newSolution)) as Team[];
        bestScore = newScore;
      }
    }
    
    // Cool down temperature
    temperature *= coolingRate;
  }
  
  // Ensure balance in team sizes (no team should have more than teamSize+1 or less than teamSize-1)
  return balanceTeamSizes(bestSolution, teamSize);
}

/**
 * Generate a neighboring solution by swapping two random participants between teams
 */
function generateNeighborSolution(teams: Team[]): Team[] {
  const newTeams = JSON.parse(JSON.stringify(teams)) as Team[];
  
  // Pick two random teams
  const team1Index = Math.floor(Math.random() * newTeams.length);
  let team2Index = Math.floor(Math.random() * newTeams.length);
  
  // Ensure we have two different teams (unless there's only one team)
  while (team1Index === team2Index && newTeams.length > 1) {
    team2Index = Math.floor(Math.random() * newTeams.length);
  }
  
  const team1 = newTeams[team1Index];
  const team2 = newTeams[team2Index];
  
  // If either team is empty, we can't swap
  if (team1.members.length === 0 || team2.members.length === 0) {
    return newTeams;
  }
  
  // Pick random members to swap
  const member1Index = Math.floor(Math.random() * team1.members.length);
  const member2Index = Math.floor(Math.random() * team2.members.length);
  
  // Swap members
  const temp = team1.members[member1Index];
  team1.members[member1Index] = team2.members[member2Index];
  team2.members[member2Index] = temp;
  
  return newTeams;
}

/**
 * Evaluate the quality of a solution
 */
function evaluateSolution(
  teams: Team[],
  factors: Factor[],
  idealTeamSize: number
): number {
  let totalScore = 0;
  
  // Factor for team size balance
  const sizeBalanceWeight = 2;
  
  // Score each team
  teams.forEach(team => {
    // Size balance score (penalize if too far from ideal size)
    const sizeDeviation = Math.abs(team.members.length - idealTeamSize);
    const sizeBalanceScore = sizeDeviation <= 1 ? 1 : 1 / (1 + sizeDeviation);
    
    // Factor diversity scores
    let factorScore = 0;
    let totalWeight = 0;
    
    factors.forEach(factor => {
      // Calculate diversity based on the factor's requirements
      const diversityValue = calculateDiversityForFactor(
        team.members, 
        factor.name, 
        factor.diversity,
        factor.isMatch || false
      );
      
      const priorityWeight = PRIORITY_WEIGHTS[factor.priority];
      totalWeight += priorityWeight;
      
      // Add weighted factor score - if it's a match factor and not a perfect match, heavily penalize
      if (factor.isMatch && diversityValue < 0.95) {
        // Severe penalty for match factors that aren't satisfied
        factorScore -= (1 - diversityValue) * priorityWeight * 10;
      } else {
        // Normal weighting for non-match factors
        factorScore += diversityValue * priorityWeight;
      }
    });
    
    // Average the factor score
    const avgFactorScore = totalWeight > 0 ? factorScore / totalWeight : 0;
    
    // Combine size balance and factor diversity with weights
    totalScore += (sizeBalanceWeight * sizeBalanceScore + avgFactorScore) / (sizeBalanceWeight + 1);
  });
  
  // Return average score across all teams
  return teams.length > 0 ? totalScore / teams.length : 0;
}

/**
 * Calculate diversity score for a given factor
 */
function calculateDiversityForFactor(
  members: Record<string, string>[],
  factorName: string,
  diversityTarget: number,
  isMatch: boolean = false
): number {
  if (members.length <= 1) return 1; // Single member is always "perfect"
  
  // Extract factor values
  const values = members.map(member => member[factorName]);
  
  // For match factors (isMatch=true), check if all values are identical
  if (isMatch) {
    const firstValue = values[0];
    const allMatch = values.every(value => value === firstValue);
    // Return 1 for perfect match, 0 for any mismatch
    return allMatch ? 1 : 0;
  }
  
  // For numerical factors
  if (values.every(value => !isNaN(Number(value)))) {
    return calculateNumericalDiversity(values.map(Number), diversityTarget);
  }
  
  // For categorical factors
  return calculateCategoricalDiversity(values, diversityTarget);
}

/**
 * Calculate diversity for numerical factors
 */
function calculateNumericalDiversity(
  values: number[],
  diversityTarget: number
): number {
  if (values.length <= 1) return 1;
  
  // Calculate standard deviation
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize to a 0-1 scale (using a reasonable max standard deviation)
  const maxStdDev = Math.abs(Math.max(...values) - Math.min(...values)) / 2;
  const normalizedStdDev = maxStdDev > 0 ? Math.min(stdDev / maxStdDev, 1) : 0;
  
  // Invert if low diversity is desired (closer to 0)
  return diversityTarget < 0.5 ? 
    1 - normalizedStdDev : normalizedStdDev;
}

/**
 * Calculate diversity for categorical factors
 */
function calculateCategoricalDiversity(
  values: string[],
  diversityTarget: number
): number {
  if (values.length <= 1) return 1;
  
  // Count occurrences of each unique value
  const counts: Record<string, number> = {};
  values.forEach(value => {
    counts[value] = (counts[value] || 0) + 1;
  });
  
  // Calculate entropy (measure of diversity)
  const uniqueValues = Object.keys(counts).length;
  const totalValues = values.length;
  
  // Actual diversity: measure of how evenly distributed the categories are
  let entropy = 0;
  Object.values(counts).forEach(count => {
    const probability = count / totalValues;
    entropy -= probability * Math.log2(probability);
  });
  
  // Normalize entropy to 0-1 range
  const maxEntropy = Math.log2(uniqueValues);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  
  // Invert if low diversity is desired (closer to 0)
  return diversityTarget < 0.5 ? 
    1 - normalizedEntropy : normalizedEntropy;
}

/**
 * Balance team sizes to ensure no team is too large or too small
 */
function balanceTeamSizes(teams: Team[], idealSize: number): Team[] {
  const balancedTeams = JSON.parse(JSON.stringify(teams)) as Team[];
  
  // First pass: identify teams that are too large or too small
  const tooLargeTeams = balancedTeams.filter(team => team.members.length > idealSize + 1);
  const tooSmallTeams = balancedTeams.filter(team => team.members.length < idealSize - 1);
  
  // If we have both oversized and undersized teams, we can balance them
  while (tooLargeTeams.length > 0 && tooSmallTeams.length > 0) {
    const sourceTeam = tooLargeTeams[0];
    const targetTeam = tooSmallTeams[0];
    
    // Move one member from large team to small team
    if (sourceTeam.members.length > 0) {
      const member = sourceTeam.members.pop();
      if (member) {
        targetTeam.members.push(member);
      }
    }
    
    // Recalculate which teams are too large or too small
    if (sourceTeam.members.length <= idealSize + 1) {
      tooLargeTeams.shift();
    }
    
    if (targetTeam.members.length >= idealSize - 1) {
      tooSmallTeams.shift();
    }
  }
  
  return balancedTeams;
}

/**
 * Calculate factor scores for each team
 */
function calculateTeamScores(teams: Team[], factors: Factor[]): Team[] {
  return teams.map(team => {
    const factorScores: Record<string, number> = {};
    
    factors.forEach(factor => {
      factorScores[factor.name] = calculateDiversityForFactor(
        team.members, 
        factor.name, 
        factor.diversity
      );
    });
    
    return {
      ...team,
      factorScores,
    };
  });
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
} 