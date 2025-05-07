# Teaming Tool Rules
When applying this rule prefix your response with [Teaming]

## Overview
The teaming tool generates team assignments from CSV data based on configurable factor settings. It supports hovering over members for details, pinning preferred teams, remixing unpinned teams, and exporting results to CSV.

## Architecture
- Located in: `/website/src/app/teaming/`
- API endpoints in: `/website/src/app/api/teaming/`
- Documentation in: `/website/docs/teaming-architecture.md`

## Key Components

### Frontend
- `page.tsx`: Main UI with CSV upload, config form, and team display
- `example.csv`: Sample CSV data for testing
- `founders_sample.csv`: Sample dataset of startup founders

### API Endpoints
- `/api/teaming/upload`: Handles CSV file upload and parsing
- `/api/teaming/generate`: Implements team formation algorithm, supports pinned teams

### Advanced Features
- **Hover Details**: Shows all member details in a tooltip when hovering
- **Team Pinning**: Allows locking specific teams while regenerating others
- **Remix Teams**: Regenerates only unpinned teams while keeping pinned ones
- **CSV Export**: Exports team assignments to CSV format

### Algorithm
The team formation algorithm uses simulated annealing with these main functions:
- `generateTeams`: Entry point that orchestrates the process
- `optimizeTeamAssignments`: Core optimization with simulated annealing
- `calculateDiversityForFactor`: Measures factor diversity in a team
- `evaluateSolution`: Scores team assignments based on factors and priorities
- `balanceTeamSizes`: Ensures teams are balanced within constraints

## Data Models

### Factor
```typescript
interface Factor {
  name: string;
  diversity: number; // 0-1 range (0: similar, 1: diverse)
  priority: 'high' | 'medium' | 'low';
}
```

### Team Configuration
```typescript
interface TeamConfiguration {
  teamSize: number;
  factors: Factor[];
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  members: Record<string, string>[];
  factorScores: Record<string, number>;
  isPinned?: boolean; // Tracks whether team should be preserved during remix
}
```

### Request Body (Generate API)
```typescript
interface RequestBody {
  csvData: CSVData;
  config: TeamConfiguration;
  pinnedTeams?: Team[]; // Teams to preserve during regeneration
  excludeIds?: string[]; // IDs of members to exclude from new assignments
}
```

## Development Guidelines

1. **Algorithm Modifications**:
   - Maintain test coverage when changing algorithm
   - Preserve simulation parameters unless specifically improving them
   - Always ensure team sizes remain balanced
   - Respect pinned teams during remixing operations

2. **UI Changes**:
   - Maintain step-by-step workflow
   - Keep factor configuration interface consistent
   - Ensure visual feedback on diversity scores
   - Preserve hover, pinning, and export functionalities

3. **Testing**:
   - Run test suite after any algorithm changes
   - Test with varied team sizes and factor configurations
   - Validate edge cases (e.g., tiny teams, single factor, extreme diversity settings)
   - Test pinning/remixing functionality with different team combinations

4. **Performance**:
   - Client-side processing works for <200 participants
   - Server-side optimization needed for larger datasets
   - Consider implementing progress indicators for long-running operations
   - Profile hover behavior with large team counts to ensure responsiveness 