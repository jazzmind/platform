/**
 * Represents a participant in the team formation process.
 * Extends a generic record of string key-value pairs with a mandatory 'id'.
 */
export interface Participant extends Record<string, string> {
    id: string;
}

export interface Factor {
    name: string;
    diversity: number;
    priority: 'high' | 'medium' | 'low' | 'required';
    isMatch?: boolean;
    ignored?: boolean;
    order?: number;
  }
  
  export interface TeamConfiguration {
    teamSize: number;
    factors: Factor[];
  }
  
  export interface CSVData {
    headers: string[];
    rows: Record<string, string>[];
  }
  
  export interface Team {
    id: string;
    name: string;
    members: Participant[];
    factorScores: Record<string, number>;
    isPinned?: boolean;
  }