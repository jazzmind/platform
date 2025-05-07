'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

interface Factor {
  name: string;
  diversity: number;
  priority: 'high' | 'medium' | 'low' | 'required';
  isMatch?: boolean;
}

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface TeamConfiguration {
  teamSize: number;
  factors: Factor[];
}

interface Team {
  id: string;
  name: string;
  members: Record<string, string>[];
  factorScores: Record<string, number>;
  isPinned?: boolean;
}

export default function TeamingPage() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<TeamConfiguration>({
    teamSize: 4,
    factors: [],
  });
  const [hoveredMember, setHoveredMember] = useState<Record<string, string> | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [draggedMember, setDraggedMember] = useState<{member: Record<string, string>, teamId: string} | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  const [pinnedMembers, setPinnedMembers] = useState<{[memberId: string]: string}>({});
  const [namingTheme, setNamingTheme] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [generatingNameForTeamId, setGeneratingNameForTeamId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/teaming/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload CSV file');
      }

      const data = await response.json();
      setCsvData(data);

      // Initialize factors based on headers (skip id and email)
      const factorsList: Factor[] = data.headers
        .filter((header: string) => header !== 'id' && header !== 'email')
        .map((header: string) => ({
          name: header,
          diversity: 0.5, // Default middle value
          priority: 'medium' as const, // Default medium priority
          isMatch: false,
        }));

      setConfig(prev => ({
        ...prev,
        factors: factorsList,
      }));
      
      // Reset other states when new file is uploaded
      setTeams([]);
      setPinnedMembers({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiversityChange = (factorName: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      factors: prev.factors.map(factor => 
        factor.name === factorName ? 
          { ...factor, diversity: factor.isMatch ? 0 : value } : 
          factor
      ),
    }));
  };

  const handlePriorityChange = (factorName: string, value: 'high' | 'medium' | 'low' | 'required') => {
    setConfig(prev => ({
      ...prev,
      factors: prev.factors.map(factor => 
        factor.name === factorName ? 
          { ...factor, priority: factor.isMatch ? 'required' : value } : 
          factor
      ),
    }));
  };

  const toggleMatchFactor = (factorName: string) => {
    setConfig(prev => ({
      ...prev,
      factors: prev.factors.map(factor => 
        factor.name === factorName ? {
          ...factor,
          isMatch: !factor.isMatch,
          // When toggling match on, set diversity to 0 and priority to required
          diversity: !factor.isMatch ? 0 : factor.diversity,
          priority: !factor.isMatch ? 'required' : factor.priority
        } : factor
      ),
    }));
  };

  const handleTeamSizeChange = (value: number) => {
    setConfig(prev => ({
      ...prev,
      teamSize: value,
    }));
  };

  const handleGenerateTeams = async () => {
    if (!csvData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get the pinned teams if any
      const pinnedTeams = teams.filter(team => team.isPinned);
      
      // Get members that are pinned to specific teams
      const pinnedMemberIds = Object.keys(pinnedMembers);
      
      // Members that are part of fully pinned teams or individually pinned
      const excludeIds = [
        ...pinnedTeams.flatMap(team => team.members.map(member => member.id)),
        ...pinnedMemberIds
      ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
      
      // Create a map of teams with pinned members
      const teamsWithPinnedMembers: Record<string, Record<string, string>[]> = {};
      
      // Group pinned members by their team ID
      Object.entries(pinnedMembers).forEach(([memberId, teamId]) => {
        if (!teamsWithPinnedMembers[teamId]) {
          teamsWithPinnedMembers[teamId] = [];
        }
        const member = csvData.rows.find(row => row.id === memberId);
        if (member) {
          teamsWithPinnedMembers[teamId].push(member);
        }
      });

      // Create partially pinned teams to send to the API for score calculation
      const partiallyPinnedTeams: Team[] = [];
      Object.entries(teamsWithPinnedMembers).forEach(([teamId, members]) => {
        // Only include teams that aren't already fully pinned
        if (!pinnedTeams.some(team => team.id === teamId) && members.length > 0) {
          const existingTeam = teams.find(team => team.id === teamId);
          if (existingTeam) {
            partiallyPinnedTeams.push({
              ...existingTeam,
              members,
              factorScores: {} // Will be recalculated by the API
            });
          }
        }
      });

      // Prepare body with all pinning info
      const requestBody = {
        csvData,
        config,
        pinnedTeams,
        excludeIds,
        teamsWithPinnedMembers,
        partiallyPinnedTeams // Add the partially pinned teams for score calculation
      };

      const response = await fetch('/api/teaming/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to generate teams');
      }

      const data = await response.json();
      
      // Start with pinned teams
      const newTeams = [...pinnedTeams];
      
      // Track team IDs we've already used to avoid duplicates
      const usedTeamIds = new Set(newTeams.map(team => team.id));
      
      // Add partially pinned teams with scores calculated by the API
      if (data.partiallyPinnedTeams) {
        data.partiallyPinnedTeams.forEach((team: Team) => {
          usedTeamIds.add(team.id);
          newTeams.push(team);
        });
      } else {
        // Fallback to old behavior if API doesn't support partial team score calculation
        Object.keys(teamsWithPinnedMembers).forEach(teamId => {
          // Check if this team is not already a fully pinned team
          if (!newTeams.some(team => team.id === teamId)) {
            const existingTeam = teams.find(team => team.id === teamId);
            if (existingTeam) {
              // Keep the same team but only with pinned members
              newTeams.push({
                ...existingTeam,
                members: teamsWithPinnedMembers[teamId],
                factorScores: {} // This is what was causing the scores to be lost
              });
              usedTeamIds.add(existingTeam.id);
            }
          }
        });
      }
      
      // Add the newly generated teams with uniqueness check
      data.teams.forEach((team: Team) => {
        // If this ID is already in use, generate a new unique ID
        if (usedTeamIds.has(team.id)) {
          team.id = uuidv4();
        }
        usedTeamIds.add(team.id);
        newTeams.push(team);
      });
      
      setTeams(newTeams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemixTeams = async () => {
    // Just call the same function - it handles pinned teams and members
    handleGenerateTeams();
  };

  const togglePinTeam = (teamId: string) => {
    setTeams(prevTeams => 
      prevTeams.map(team => {
        // If we're pinning a team, also pin all its members
        if (team.id === teamId && !team.isPinned) {
          const newPinnedMembers = { ...pinnedMembers };
          team.members.forEach(member => {
            newPinnedMembers[member.id] = team.id;
          });
          setPinnedMembers(newPinnedMembers);
        }
        
        // If we're unpinning a team, also unpin all its members
        if (team.id === teamId && team.isPinned) {
          const newPinnedMembers = { ...pinnedMembers };
          team.members.forEach(member => {
            if (newPinnedMembers[member.id] === team.id) {
              delete newPinnedMembers[member.id];
            }
          });
          setPinnedMembers(newPinnedMembers);
        }
        
        return team.id === teamId ? { ...team, isPinned: !team.isPinned } : team;
      })
    );
  };

  const togglePinMember = (member: Record<string, string>, teamId: string) => {
    const memberId = member.id;
    
    setPinnedMembers(prev => {
      const newPinnedMembers = { ...prev };
      
      // If already pinned to this team, unpin it
      if (newPinnedMembers[memberId] === teamId) {
        delete newPinnedMembers[memberId];
      } 
      // If pinned to another team, move the pin to this team
      else if (newPinnedMembers[memberId]) {
        newPinnedMembers[memberId] = teamId;
      } 
      // If not pinned anywhere, pin to this team
      else {
        newPinnedMembers[memberId] = teamId;
      }
      
      return newPinnedMembers;
    });
  };

  const handleMemberMouseEnter = (member: Record<string, string>, event: React.MouseEvent) => {
    if (!draggedMember) {
      setHoveredMember(member);
      setHoverPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMemberMouseLeave = () => {
    if (!draggedMember) {
      setHoveredMember(null);
    }
  };

  const handleDragStart = (event: React.DragEvent, member: Record<string, string>, teamId: string) => {
    // Don't allow dragging if the entire team is pinned
    const team = teams.find(t => t.id === teamId);
    if (team?.isPinned) return;
    
    setDraggedMember({ member, teamId });
    
    // Set a drag image/ghost (optional)
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', member.email);
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (event: React.DragEvent, teamId: string) => {
    event.preventDefault();
    if (draggedMember && draggedMember.teamId !== teamId) {
      setDragOverTeamId(teamId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTeamId(null);
  };

  const handleDrop = (event: React.DragEvent, targetTeamId: string) => {
    event.preventDefault();
    
    // Don't allow dropping if the target team is pinned
    const targetTeam = teams.find(t => t.id === targetTeamId);
    if (targetTeam?.isPinned) {
      setDragOverTeamId(null);
      setDraggedMember(null);
      return;
    }
    
    if (draggedMember && draggedMember.teamId !== targetTeamId) {
      const { member, teamId: sourceTeamId } = draggedMember;
      
      // Move member between teams
      setTeams(prevTeams => {
        return prevTeams.map(team => {
          // Remove from source team
          if (team.id === sourceTeamId) {
            return {
              ...team,
              members: team.members.filter(m => m.id !== member.id)
            };
          }
          // Add to target team
          if (team.id === targetTeamId) {
            return {
              ...team,
              members: [...team.members, member]
            };
          }
          return team;
        });
      });
      
      // If the member was pinned to the source team, update pin to target team
      if (pinnedMembers[member.id] === sourceTeamId) {
        setPinnedMembers(prev => ({
          ...prev,
          [member.id]: targetTeamId
        }));
      }
    }
    
    setDragOverTeamId(null);
    setDraggedMember(null);
  };

  const exportToCSV = () => {
    if (!teams.length) return;

    // Create CSV content
    const headers = 'id,email,team_name\n';
    const rows = teams.flatMap(team => 
      team.members.map(member => 
        `${member.id},${member.email},"${team.name}"`
      )
    ).join('\n');
    
    const csvContent = headers + rows;
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'team_assignments.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'required': return 'bg-purple-200 text-purple-900';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-green-300';
    if (score >= 0.4) return 'bg-yellow-300';
    if (score >= 0.2) return 'bg-orange-300';
    return 'bg-red-300';
  };

  const handleEditTeamName = (teamId: string, currentName: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const saveTeamName = (teamId: string) => {
    if (editingTeamName.trim() === '') return;
    
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === teamId ? { ...team, name: editingTeamName } : team
      )
    );
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const cancelEditTeamName = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const generateTeamName = async (teamId: string) => {
    if (!namingTheme.trim()) {
      setError("Please enter a naming theme first");
      return;
    }
    
    setGeneratingNameForTeamId(teamId);
    
    try {
      // Find the team
      const team = teams.find(t => t.id === teamId);
      if (!team) return;
      
      // Find factors where team has a high score (which means they have common values)
      const commonFactors: string[] = [];
      Object.entries(team.factorScores).forEach(([factor, score]) => {
        const factorConfig = config.factors.find(f => f.name === factor);
        
        // If diversity is low (< 0.5) or it's a match factor with high score, it means common values
        if ((factorConfig && factorConfig.diversity < 0.5 && score > 0.7) || 
            (factorConfig?.isMatch && score > 0.85)) {
          // Find the common value for this factor
          const values = new Set(team.members.map(member => member[factor]));
          if (values.size === 1) {
            // If all members have the same value, include it
            const value = team.members[0][factor];
            commonFactors.push(`${factor}: ${value}`);
          } else if (values.size <= 3) {
            // If only a few values, list them all
            commonFactors.push(`${factor}: ${Array.from(values).join(', ')}`);
          }
        }
      });
      
      const response = await fetch('/api/teaming/generate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: namingTheme,
          commonFactors
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate team name');
      }
      
      const data = await response.json();
      
      if (data.teamName) {
        // Update the team with the new name
        setTeams(prevTeams => 
          prevTeams.map(team => 
            team.id === teamId ? { ...team, name: data.teamName } : team
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setGeneratingNameForTeamId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Team Formation Tool</h1>
      
      {/* CSV Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Step 1: Upload Participant Data</h2>
        <p className="mb-4 text-gray-600">
          Upload a CSV file with participant data. The file should have headers including &quot;id&quot;, &quot;email&quot;, 
          and any number of factors you want to use for team formation.
        </p>
        
        <div className="flex items-center mb-4">
          <Link href="/teaming/example.csv" className="text-blue-600 hover:underline" download>
            Download example CSV
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            disabled={isLoading}
          >
            {isLoading ? 'Uploading...' : 'Upload CSV'}
          </button>
          {csvData && (
            <span className="text-green-600">
              ✓ Uploaded {csvData.rows.length} participants with {csvData.headers.length} fields
            </span>
          )}
        </div>
        
        {error && (
          <div className="mt-4 text-red-600">
            Error: {error}
          </div>
        )}
      </div>
      
      {/* Configuration Section - Only show if CSV is uploaded */}
      {csvData && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Step 2: Configure Team Formation</h2>
          
          {/* Team Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ideal Team Size
            </label>
            <input
              type="number"
              min={2}
              max={10}
              value={config.teamSize}
              onChange={(e) => handleTeamSizeChange(parseInt(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Teams may vary by ±1 member to optimize for factor diversity
            </p>
          </div>
          
          {/* Factor Configuration */}
          <div>
            <h3 className="font-medium text-lg mb-3">Factor Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {config.factors.map((factor) => (
                <div key={factor.name} className={`border rounded-md p-4 ${factor.isMatch ? 'bg-purple-50 border-purple-200' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{factor.name}</h4>
                    <div className="flex items-center">
                      <label className="mr-2 text-sm">Exact Match</label>
                      <div 
                        className={`w-10 h-5 relative rounded-full transition-colors duration-300 cursor-pointer ${factor.isMatch ? 'bg-purple-600' : 'bg-gray-300'}`}
                        onClick={() => toggleMatchFactor(factor.name)}
                      >
                        <span 
                          className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform duration-300 ${factor.isMatch ? 'transform translate-x-5 left-0.5' : 'left-0.5'}`} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Diversity Slider - disabled if Match is enabled */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-700 mb-1">
                      Diversity: {factor.diversity.toFixed(1)}
                    </label>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">Similar</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={factor.diversity}
                        onChange={(e) => handleDiversityChange(factor.name, parseFloat(e.target.value))}
                        className={`flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${factor.isMatch ? 'opacity-50' : ''}`}
                        disabled={factor.isMatch}
                      />
                      <span className="text-xs text-gray-500 ml-2">Diverse</span>
                    </div>
                  </div>
                  
                  {/* Priority Selection - disabled if Match is enabled */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['low', 'medium', 'high', 'required'] as const).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => !factor.isMatch && handlePriorityChange(factor.name, priority)}
                          className={`px-3 py-1 text-sm rounded ${
                            factor.priority === priority
                              ? getPriorityColor(priority) + ' font-medium'
                              : 'bg-gray-100 text-gray-600'
                          } ${factor.isMatch ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={factor.isMatch}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Generate Teams Button */}
          <div className="mt-8">
            <button
              onClick={handleGenerateTeams}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Teams'}
            </button>
          </div>
        </div>
      )}
      
      {/* Teams Display Section - Only show if teams are generated */}
      {teams.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Step 3: Team Results</h2>
            <div className="space-x-3">
              <button
                onClick={handleRemixTeams}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Remix Unpinned Teams'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Export to CSV
              </button>
            </div>
          </div>
          
          {/* Team Naming Theme Input */}
          <div className="mb-6 flex items-center">
            <label className="mr-3 font-medium">Team Naming Theme:</label>
            <input
              type="text"
              value={namingTheme}
              onChange={(e) => setNamingTheme(e.target.value)}
              placeholder="e.g., Space, Animals, Colors, Superheroes"
              className="px-3 py-2 border border-gray-300 rounded flex-grow mr-2"
            />
            <span className="text-sm text-gray-500">
              Enter a theme for AI-generated team names
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div 
                key={team.id} 
                className={`border rounded-md p-4 shadow-sm hover:shadow-md transition ${
                  team.isPinned ? 'border-2 border-purple-500' : ''
                } ${dragOverTeamId === team.id ? 'bg-blue-50' : ''}`}
                onDragOver={(e) => handleDragOver(e, team.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, team.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  {editingTeamId === team.id ? (
                    <div className="flex flex-grow mr-2">
                      <input
                        type="text"
                        value={editingTeamName}
                        onChange={(e) => setEditingTeamName(e.target.value)}
                        className="w-full p-1 border rounded text-lg font-bold"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveTeamName(team.id)}
                      />
                      <div className="flex">
                        <button 
                          onClick={() => saveTeamName(team.id)}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button 
                          onClick={cancelEditTeamName}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Cancel"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h3 className="text-lg font-bold">{team.name}</h3>
                      <button 
                        onClick={() => handleEditTeamName(team.id, team.name)}
                        className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        title="Edit Team Name"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <button 
                      onClick={() => generateTeamName(team.id)}
                      className={`p-1 mr-1 rounded-full ${
                        namingTheme ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={namingTheme ? "Generate AI Team Name" : "Enter a theme first"}
                      disabled={!namingTheme || generatingNameForTeamId === team.id}
                    >
                      {generatingNameForTeamId === team.id ? (
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => togglePinTeam(team.id)}
                      className={`p-1 rounded-full ${
                        team.isPinned 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      title={team.isPinned ? "Unpin Team" : "Pin Team"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Team Members */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Members ({team.members.length})
                  </h4>
                  <ul className="text-sm">
                    {team.members.map((member, idx) => (
                      <li 
                        key={idx} 
                        className={`py-1 border-b border-gray-100 last:border-0 hover:bg-gray-50 
                          ${pinnedMembers[member.id] === team.id ? 'bg-purple-50' : ''} 
                          ${!team.isPinned ? 'cursor-grab' : 'cursor-default'}`}
                        onMouseEnter={(e) => handleMemberMouseEnter(member, e)}
                        onMouseLeave={handleMemberMouseLeave}
                        draggable={!team.isPinned}
                        onDragStart={(e) => handleDragStart(e, member, team.id)}
                      >
                        <div className="flex justify-between items-center">
                          <span>{member.email}</span>
                          <button
                            onClick={() => togglePinMember(member, team.id)}
                            className={`p-1 rounded-full ${
                              pinnedMembers[member.id] === team.id
                                ? 'text-purple-600'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            title={pinnedMembers[member.id] === team.id ? "Unpin Member" : "Pin Member"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Team Factor Scores */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    Factor Satisfaction
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(team.factorScores).map(([factor, score]) => {
                      // Check if this factor is a match factor
                      const isMatchFactor = config.factors.find(f => f.name === factor)?.isMatch;
                      
                      return (
                        <div key={factor} className="flex items-center">
                          <span className="text-sm w-24 truncate">
                            {factor}:
                            {isMatchFactor && <span className="ml-1 text-purple-600 text-xs">match</span>}
                          </span>
                          <div className="ml-2 flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isMatchFactor && score > 0.95 ? 'bg-purple-500' : getScoreColor(score)}`} 
                              style={{width: `${score * 100}%`}}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs font-medium text-gray-600">
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Member Details Tooltip/Popover */}
      {hoveredMember && (
        <div 
          className="fixed bg-white p-3 rounded shadow-lg border z-50"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y + 10}px`,
            maxWidth: '300px'
          }}
        >
          <h4 className="font-medium text-sm mb-2">{hoveredMember.email}</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(hoveredMember).map(([key, value]) => {
              // Skip id and email as they're already shown
              if (key === 'id' || key === 'email') return null;
              
              return (
                <div key={key} className="grid grid-cols-2 gap-2">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-600">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 