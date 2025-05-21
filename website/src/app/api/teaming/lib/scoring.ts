import { Factor, Team } from "../types";
import { v4 as uuidv4 } from 'uuid';

export function calculateDiversityForFactor(
  members: Record<string, string>[], factorName: string, diversityTarget: number, isMatch: boolean = false): number {
  if (members.length <= 1) return 1;
  const values = members.map(member => member[factorName]);
  if (isMatch) return values.every(value => value === values[0]) ? 1 : 0;
  if (values.every(value => !isNaN(Number(value)))) return calculateNumericalDiversity(values.map(Number), diversityTarget);
  return calculateCategoricalDiversity(values, diversityTarget);
}
  
export function calculateNumericalDiversity(values: number[], diversityTarget: number): number {
  if (values.length <= 1) return 1;
  if (values.every(val => val === values[0])) return diversityTarget < 0.5 ? 1 : 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  let normalizedStdDev;
  const ABSOLUTE_SIMILARITY_THRESHOLD_STDDEV = 1e-4; // If std dev is less than this, consider it very similar

  if (stdDev < ABSOLUTE_SIMILARITY_THRESHOLD_STDDEV) {
    normalizedStdDev = 0;
  } else {
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const maxPossibleStdDev = (maxValue - minValue) / 2;
    // Ensure maxPossibleStdDev is not effectively zero before division if stdDev itself is not tiny
    normalizedStdDev = maxPossibleStdDev > 1e-9 ? Math.min(stdDev / maxPossibleStdDev, 1) : 0; 
  }

  return diversityTarget < 0.5 ? 1 - normalizedStdDev : normalizedStdDev;
}
  
export function calculateCategoricalDiversity(values: string[], diversityTarget: number): number {
  if (values.length <= 1) return 1;
  const counts: Record<string, number> = {};
  values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
  const uniqueValueCount = Object.keys(counts).length;
  if (uniqueValueCount === 1) return diversityTarget < 0.5 ? 1 : 0;
  let entropy = 0;
  Object.values(counts).forEach(count => {
    const probability = count / values.length;
    entropy -= probability * Math.log2(probability);
  });
  const maxEntropy = Math.log2(uniqueValueCount); 
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  return diversityTarget < 0.5 ? 1 - normalizedEntropy : normalizedEntropy;
}
  
export function calculateTeamScores(teams: Team[], activeFactors: Factor[]): Team[] {
  return teams.map(team => {
    if (!team || team.members.length === 0) return {...(team || { id: uuidv4(), name: 'Empty Team', members:[]}), factorScores: {}}; 
    const factorScores: Record<string, number> = {};
    activeFactors.forEach(factor => {
      factorScores[factor.name] = calculateDiversityForFactor(team.members, factor.name, factor.diversity, factor.isMatch || false);
    });
    return { ...team, factorScores };
  });
}
  
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
} 