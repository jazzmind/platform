import { NextRequest, NextResponse } from 'next/server';
import { generateTeams } from '../lib/teaming';
import { calculateTeamScores } from '../lib/scoring';
import { CSVData, Team, TeamConfiguration, Participant } from '../types';


interface RequestBody {
  csvData: CSVData;
  config: TeamConfiguration;
  pinnedTeams?: Team[];
  excludeIds?: string[];
  teamsWithPinnedMembers?: Record<string, Record<string, string>[]>;
  partiallyPinnedTeams?: Team[];
}

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

    if (!csvData || !config || !csvData.rows || !config.factors) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!csvData.rows.length) {
      return NextResponse.json({ error: 'No data provided in CSV' }, { status: 400 });
    }

    // Map all incoming participant data to ensure it conforms to the Participant type.
    const mapToParticipant = (p: Record<string, string> | Participant): Participant => {
      let name: string;
      // Check if p has a name property that is a non-empty string
      if ('name' in p && typeof p.name === 'string' && p.name.trim() !== '') {
        name = p.name;
      } else {
        // Fallback to id (which should exist) or a generic name
        name = p.id || 'Unnamed Participant'; 
      }
      // Spread all properties of p, then ensure id and name are correctly typed.
      // p.id should always exist as per CSVData structure and filtering.
      return { ...p, id: p.id!, name } as Participant;
    };
    
    const availableRowsAsParticipants: Participant[] = csvData.rows
      .filter(row => !excludeIds.includes(row.id))
      .map(mapToParticipant);

    const initialTeamsFromPinnedAndPartial: Team[] = [];
    
    Object.entries(teamsWithPinnedMembers).forEach(([teamId, members]) => {
      if (members.length > 0) {
        const existingTeam = partiallyPinnedTeams.find(t => t.id === teamId);
        initialTeamsFromPinnedAndPartial.push({
          id: teamId,
          name: existingTeam?.name || `Team ${initialTeamsFromPinnedAndPartial.length + 1}`,
          members: members.map(mapToParticipant),
          factorScores: existingTeam?.factorScores || {},
          isPinned: existingTeam?.isPinned
        });
      }
    });

    partiallyPinnedTeams.forEach(pTeam => {
        if(!initialTeamsFromPinnedAndPartial.find(t => t.id === pTeam.id)){
            initialTeamsFromPinnedAndPartial.push({
                ...pTeam,
                members: pTeam.members.map(mapToParticipant)
            });
        }
    });

    const { teams: newTeamsFromAlgo, unteamed } = generateTeams(
      availableRowsAsParticipants,
      config,
      initialTeamsFromPinnedAndPartial
    );
    
    const activeFactors = config.factors.filter(f => !f.ignored);
    const scoredNewTeams = calculateTeamScores(newTeamsFromAlgo, activeFactors);

    const finalPartiallyPinnedAndScored: Team[] = [];
    partiallyPinnedTeams.forEach(pTeam => {
      const mappedPTeam = initialTeamsFromPinnedAndPartial.find(it => it.id === pTeam.id);
      if (mappedPTeam && !scoredNewTeams.find(nt => nt.id === mappedPTeam.id)) {
        finalPartiallyPinnedAndScored.push(calculateTeamScores([mappedPTeam], activeFactors)[0]);
      } else if (!mappedPTeam && !scoredNewTeams.find(nt => nt.id === pTeam.id)) {
        const membersMapped = pTeam.members.map(mapToParticipant);
        finalPartiallyPinnedAndScored.push(calculateTeamScores([{...pTeam, members: membersMapped}], activeFactors)[0]);
      }
    });

    return NextResponse.json({ 
      teams: scoredNewTeams,
      partiallyPinnedTeams: finalPartiallyPinnedAndScored, 
      unteamed
    });
  } catch (error) {
    console.error('Team generation error:', error);
    const typedError = error as Error;
    return NextResponse.json({ error: 'Failed to generate teams', details: typedError.message, stack: typedError.stack }, { status: 500 });
  }
}

