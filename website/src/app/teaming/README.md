# Team Formation Tool

The Team Formation Tool is a utility that helps create balanced teams from a list of participants based on multiple factors. The tool can be used for:

- Classroom group assignments
- Project team formation
- Workshop breakout groups
- Research study team balancing
- Event team distribution

## Features

- **CSV Upload**: Import participant data with arbitrary factors
- **Configurable Factors**: Set diversity and priority for each factor
- **Exact Match Option**: Force teams to have identical values for critical factors
- **Flexible Team Size**: Configure ideal team size with automatic adjustment for optimal matching
- **Visual Results**: See team assignments with satisfaction metrics
- **Advanced Algorithm**: Uses simulated annealing to find optimal team distributions
- **Member Details**: Hover over team members to see their complete profile
- **Team Management**:
  - Pin entire teams to preserve them during remixing
  - Pin individual members to specific teams
  - Drag and drop members between teams
- **CSV Export**: Export team assignments in CSV format for easy distribution

## How to Use

1. **Prepare Your CSV File**
   - Create a CSV file with participant data
   - Required columns: `id` and `email`
   - Add any number of additional columns as factors (e.g., skills, experience, location)
   - Each row represents one participant
   - You can download an example CSV from the tool interface

2. **Upload the CSV**
   - Click "Upload CSV" button in the interface
   - The system will extract factor columns from your data

3. **Configure Team Settings**
   - Set ideal team size
   - For each factor, configure:
     - **Exact Match**: Toggle on to require all team members to have the same value
     - **Diversity Level**: Slider from 0 (similar) to 1 (diverse)
     - **Priority**: Low, Medium, High, or Required importance

4. **Generate Teams**
   - Click "Generate Teams" button
   - The algorithm will create optimal team assignments
   - Review results in the visual team cards

5. **Review and Refine Teams**
   - Hover over members to see their complete profiles
   - Pin entire teams you want to keep (they'll be highlighted with purple border)
   - Pin individual members to specific teams
   - Drag and drop members between teams to make manual adjustments
   - Click "Remix Unpinned Teams" to regenerate only the non-pinned teams and members
   - Repeat until satisfied with all team compositions

6. **Export Team Assignments**
   - Click "Export to CSV" button
   - Download the CSV file with team assignments (id, email, team name)
   - Use for communication, registration, or further processing

## Factor Settings

### Regular Factors
Factors can be configured with a combination of diversity and priority:
- **Diversity**: Slider from 0.0 (similar values) to 1.0 (diverse values)
- **Priority**: How important the factor is relative to others
  - **Low**: Minimal influence on team formation
  - **Medium**: Standard influence on team formation
  - **High**: Strong influence on team formation
  - **Required**: Highest priority, must be satisfied

### Exact Match Factors
The "Exact Match" toggle creates teams where all members have identical values for that factor:
- Automatically sets diversity to 0 and priority to "Required"
- Participants will only be grouped with others who have the same value
- Useful for factors like language, location, or scheduling constraints
- Overrides other factor settings when teams are formed

## Algorithm Details

The team formation algorithm uses a sophisticated approach to balance multiple factors:

- **Simulated Annealing**: Avoids getting stuck in local optima
- **Factor Weighting**: Applies user-defined priorities
- **Match Enforcement**: Ensures exact matches for critical factors
- **Diversity Scoring**:
  - For categorical factors (e.g., department): Uses entropy-based measures
  - For numerical factors (e.g., experience): Uses standard deviation
- **Team Balancing**: Ensures team sizes are within ±1 of ideal size
- **Pinned Team Support**: Respects previously pinned teams and members during remixing

## Example Scenarios

### Technical Workshops
For technical workshops where participants need shared language but diverse skills:
- Set language as "Exact Match" to ensure all team members speak the same language
- Set skill diversity to 0.8-1.0 with high priority for diverse technical abilities
- Set experience diversity to 0.5 with medium priority for balanced expertise levels

### Cross-Functional Teams
To create balanced cross-functional teams:
- Set department diversity to 0.8-1.0 with high priority
- Set location as "Exact Match" if teams need to work in the same physical location
- Set experience diversity to 0.3-0.5 for a mix of junior and senior members

## Iterative Team Building

For complex use cases, use the iterative approach:
1. Generate initial teams with balanced priorities
2. Pin any teams that look particularly well-balanced
3. Pin specific members who need to stay in particular teams
4. Move members between teams with drag and drop for manual adjustments
5. Adjust diversity settings and exact match factors
6. Remix the unpinned teams with new settings
7. Repeat until all teams are satisfactory

## Technical Implementation

The tool is built with:
- Next.js 15 (React framework)
- TypeScript for type safety
- CSV parsing with csv-parse
- Tailwind CSS for styling
- Custom team formation algorithm
- Drag and drop capabilities for member management

## Testing

The implementation includes comprehensive tests that verify:
- CSV processing and validation
- Team size balancing
- Diversity scoring for different factor types
- Priority weighting and team optimization
- Exact match factor enforcement 