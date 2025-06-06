'use client';

import { Brain, Users, TrendingUp, CheckCircle, MessageSquare, AlertTriangle, Clock, Activity, Eye, Target, Award } from 'lucide-react';
import { useState, useEffect } from 'react';

const generateRandomEvent = () => {
  const events = [
    {
      type: 'critical',
      icon: AlertTriangle,
      title: 'Critical Intervention',
      description: 'Team Gamma - Expert marked unhelpful by all members',
      action: 'Approve Meeting',
      color: 'red'
    },
    {
      type: 'automation',
      icon: Clock,
      title: 'Automated Nudge',
      description: 'Team Alpha - Assessment due in 3 hours, no submission',
      action: 'Auto-sent',
      color: 'yellow'
    },
    {
      type: 'skill',
      icon: Target,
      title: 'Skill Development',
      description: 'Jordan Kim - Data Analysis lagging 2 weeks behind cohort',
      action: 'Coaching sent',
      color: 'blue'
    },
    {
      type: 'milestone',
      icon: CheckCircle,
      title: 'Milestone Captured',
      description: 'Team Beta - Sprint retrospective completed in Zoom',
      action: 'xAPI logged',
      color: 'green'
    },
    {
      type: 'engagement',
      icon: Activity,
      title: 'Engagement Alert',
      description: 'Sarah Chen - No activity detected for 48 hours',
      action: 'Check-in scheduled',
      color: 'orange'
    },
    {
      type: 'quality',
      icon: Eye,
      title: 'Quality Flag',
      description: 'Team Delta - Code review standards dropping',
      action: 'Mentor assigned',
      color: 'purple'
    }
  ];
  
  const randomEvent = events[Math.floor(Math.random() * events.length)];
  const secondsAgo = Math.floor(Math.random() * 120) + 1; // 1-120 seconds ago
  
  let timeString;
  if (secondsAgo < 60) {
    timeString = `${secondsAgo} sec ago`;
  } else {
    const minutesAgo = Math.floor(secondsAgo / 60);
    timeString = `${minutesAgo} min ago`;
  }
  
  return {
    ...randomEvent,
    time: timeString,
    id: Date.now() + Math.random()
  };
};

export default function P3Dashboard() {
  const [events, setEvents] = useState([
    {
      id: 1,
      type: 'critical',
      icon: AlertTriangle,
      title: 'Critical Intervention',
      description: 'Team Gamma - Expert marked unhelpful by all members',
      action: 'Approve Meeting',
      color: 'red',
      time: '2 min ago'
    },
    {
      id: 2,
      type: 'automation',
      icon: Clock,
      title: 'Automated Nudge',
      description: 'Team Alpha - Assessment due in 3 hours, no submission',
      action: 'Auto-sent',
      color: 'yellow',
      time: '5 min ago'
    },
    {
      id: 3,
      type: 'skill',
      icon: Target,
      title: 'Skill Development',
      description: 'Jordan Kim - Data Analysis lagging 2 weeks behind cohort',
      action: 'Coaching sent',
      color: 'blue',
      time: '8 min ago'
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = generateRandomEvent();
      setEvents(prev => [newEvent, ...prev.slice(0, 4)]);
    }, Math.random() * 20000 + 10000); // 10-30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Command Center</h1>
          <p className="text-slate-600 mt-1">Real-time orchestration across all learning systems</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            All Systems Operational
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            System Health
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            Emergency Override
          </button>
        </div>
      </div>

      {/* Priority Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Moments That Matter */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Moments That Matter</h3>
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">3 urgent</span>
          </div>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4 bg-red-50 p-3 rounded-r">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Team Gamma Crisis</h4>
                  <p className="text-sm text-slate-600">Expert relationship breakdown - immediate action required</p>
                </div>
                <button className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors">Intervene Now</button>
              </div>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4 bg-orange-50 p-3 rounded-r">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Sarah Chen - Engagement Drop</h4>
                  <p className="text-sm text-slate-600">No activity in 4 days, missing deadlines</p>
                </div>
                <button className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 transition-colors">Check In</button>
              </div>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded-r">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Team Delta - Skills Acceleration</h4>
                  <p className="text-sm text-slate-600">Ready for advanced challenges</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">Celebrate</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Interventions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick Interventions</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center group">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-teal-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-teal-700">Team Check-in</span>
              <p className="text-xs text-slate-500 mt-1">Schedule health assessment</p>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center group">
              <Award className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-green-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">Send Kudos</span>
              <p className="text-xs text-slate-500 mt-1">Recognize achievements</p>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center group">
              <Brain className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-purple-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">AI Coaching</span>
              <p className="text-xs text-slate-500 mt-1">Trigger smart guidance</p>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center group">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600 group-hover:text-orange-600" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-orange-700">Expert Connect</span>
              <p className="text-xs text-slate-500 mt-1">Facilitate mentorship</p>
            </button>
          </div>
        </div>
      </div>

      {/* Project Progress Stream */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Active Project Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProjectProgressCard
            title="AI Business Solutions"
            stage="Week 3 of 8"
            progress={38}
            status="on-track"
            teams={6}
            nextMilestone="Solution Design Review"
            daysRemaining={4}
          />
          <ProjectProgressCard
            title="UX Design Challenge"
            stage="Week 5 of 6"
            progress={83}
            status="needs-attention"
            teams={4}
            nextMilestone="User Testing Sessions"
            daysRemaining={2}
          />
          <ProjectProgressCard
            title="Leadership Development"
            stage="Week 2 of 4"
            progress={50}
            status="ahead"
            teams={3}
            nextMilestone="360 Feedback Review"
            daysRemaining={6}
          />
          <ProjectProgressCard
            title="Cybersecurity Capstone"
            stage="Week 7 of 10"
            progress={70}
            status="on-track"
            teams={5}
            nextMilestone="Penetration Testing"
            daysRemaining={3}
          />
        </div>
      </div>

      {/* Real-time AI Orchestration Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-slate-900">AI Orchestration Feed</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600">Live</span>
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.map((event) => {
            const IconComponent = event.icon;
            const colorClasses = {
              red: 'bg-red-50 border-red-400',
              yellow: 'bg-yellow-50 border-yellow-400',
              blue: 'bg-blue-50 border-blue-400',
              green: 'bg-green-50 border-green-400',
              orange: 'bg-orange-50 border-orange-400',
              purple: 'bg-purple-50 border-purple-400'
            };
            const iconColorClasses = {
              red: 'text-red-600',
              yellow: 'text-yellow-600',
              blue: 'text-blue-600',
              green: 'text-green-600',
              orange: 'text-orange-600',
              purple: 'text-purple-600'
            };
            const buttonColorClasses = {
              red: 'bg-red-600',
              yellow: 'bg-yellow-600',
              blue: 'bg-blue-600',
              green: 'bg-green-600',
              orange: 'bg-orange-600',
              purple: 'bg-purple-600'
            };

            return (
              <div key={event.id} className={`flex items-center gap-3 p-3 ${colorClasses[event.color]} border-l-4 rounded transition-all duration-300`}>
                <IconComponent className={`w-5 h-5 ${iconColorClasses[event.color]}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-600">{event.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{event.time}</span>
                  <span className={`text-xs ${buttonColorClasses[event.color]} text-white px-2 py-1 rounded`}>
                    {event.action}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Moments That Matter & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Moments That Matter */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Moments That Matter</h3>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Team Gamma Crisis</h4>
                  <p className="text-sm text-slate-600">Expert relationship breakdown</p>
                </div>
                <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Intervene</button>
              </div>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Sarah Chen - Engagement Drop</h4>
                  <p className="text-sm text-slate-600">No activity in 4 days</p>
                </div>
                <button className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">Check In</button>
              </div>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Team Delta - Skills Acceleration</h4>
                  <p className="text-sm text-slate-600">Ready for advanced challenges</p>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Celebrate</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Interventions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick Interventions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Team Check-in</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Send Kudos</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center">
              <Brain className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">AI Coaching</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Expert Connect</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Automation & System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comprehensive Automation Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Automation Summary</h3>
            <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">12 Active Rules</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-800">Engagement Automation</h4>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 mb-2">94% effectiveness • 48 triggers today</p>
              <div className="text-xs text-green-600">
                • Inactive user detection<br/>
                • Re-engagement campaigns<br/>
                • Activity streak rewards
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-800">Learning Acceleration</h4>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 mb-2">87% effectiveness • 23 interventions</p>
              <div className="text-xs text-blue-600">
                • Skill gap identification<br/>
                • Adaptive content delivery<br/>
                • Peer collaboration matching
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-purple-800">Quality Assurance</h4>
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 mb-2">73% effectiveness • 12 flags</p>
              <div className="text-xs text-purple-600">
                • Feedback quality scoring<br/>
                • Submission completeness<br/>
                • Expert response time
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-orange-800">Team Dynamics</h4>
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-orange-700 mb-2">89% effectiveness • 6 mediations</p>
              <div className="text-xs text-orange-600">
                • Conflict early warning<br/>
                • Collaboration scoring<br/>
                • Communication analysis
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">System-wide automation effectiveness</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full" style={{ width: '86%' }}></div>
                </div>
                <span className="text-sm font-semibold text-slate-900">86%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Health & System Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">System Health</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Data Capture</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Zoom Meetings</span>
                  </div>
                  <span className="text-xs text-slate-600">247 events</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">GitHub Activity</span>
                  </div>
                  <span className="text-xs text-slate-600">1.2k commits</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Document Watchers</span>
                  </div>
                  <span className="text-xs text-slate-600">89 changes</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">AI Services</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3 text-blue-600" />
                    <span className="text-sm">ML Pipeline</span>
                  </div>
                  <span className="text-xs text-blue-600">Active</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-blue-600" />
                    <span className="text-sm">NLP Analysis</span>
                  </div>
                  <span className="text-xs text-blue-600">Processing</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-blue-600" />
                    <span className="text-sm">Recommendation Engine</span>
                  </div>
                  <span className="text-xs text-blue-600">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectProgressCard({ 
  title, 
  stage, 
  progress, 
  status, 
  teams, 
  nextMilestone, 
  daysRemaining 
}: { 
  title: string; 
  stage: string; 
  progress: number; 
  status: 'on-track' | 'needs-attention' | 'ahead'; 
  teams: number; 
  nextMilestone: string; 
  daysRemaining: number;
}) {
  const statusColors = {
    'on-track': 'border-green-200 bg-green-50',
    'needs-attention': 'border-orange-200 bg-orange-50',
    'ahead': 'border-blue-200 bg-blue-50'
  };

  const statusTextColors = {
    'on-track': 'text-green-800',
    'needs-attention': 'text-orange-800',
    'ahead': 'text-blue-800'
  };

  const progressColors = {
    'on-track': 'from-green-500 to-green-600',
    'needs-attention': 'from-orange-500 to-orange-600',
    'ahead': 'from-blue-500 to-blue-600'
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        <span className={`text-xs font-medium ${statusTextColors[status]}`}>
          {teams} teams
        </span>
      </div>
      
      <p className="text-xs text-slate-600 mb-3">{stage}</p>
      
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-600">Progress</span>
          <span className="text-xs font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r ${progressColors[status]}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-700">Next: {nextMilestone}</p>
        <p className="text-xs text-slate-500">{daysRemaining} days remaining</p>
      </div>
    </div>
  );
} 