import React from 'react';
import { Brain, Users, TrendingUp, CheckCircle, MessageSquare, AlertTriangle, Clock, Activity, Eye, Target, Award } from 'lucide-react';
import HelpBadge from '../../components/HelpBadge';

export default function P3Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">AI Command Center</h1>
          <HelpBadge topic="ai-orchestration" content="" position="bottom" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            All Systems Operational
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Emergency Override
          </button>
        </div>
      </div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Learning Velocity</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">+23%</p>
                <HelpBadge topic="learning-velocity" content="" position="bottom" />
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">AI Interventions</p>
              <p className="text-2xl font-bold">142</p>
            </div>
            <Brain className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Capture Sources</p>
              <p className="text-2xl font-bold">8</p>
            </div>
            <Eye className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Engagement</p>
              <p className="text-2xl font-bold">94%</p>
            </div>
            <Activity className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Real-time AI Orchestration Feed */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">AI Orchestration Feed</h2>
          <HelpBadge topic="ai-orchestration" content="" />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-400 rounded">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Critical Intervention</p>
              <p className="text-sm text-gray-600">Team Gamma - Expert marked unhelpful by all members</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">2 min ago</span>
              <button className="text-xs bg-red-600 text-white px-2 py-1 rounded">Approve Meeting</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Automated Nudge</p>
              <p className="text-sm text-gray-600">Team Alpha - Assessment due in 3 hours, no submission</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">5 min ago</span>
              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Auto-sent</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <Target className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Skill Development</p>
              <p className="text-sm text-gray-600">Jordan Kim - Data Analysis lagging 2 weeks behind cohort</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">8 min ago</span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Coaching sent</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Milestone Captured</p>
              <p className="text-sm text-gray-600">Team Beta - Sprint retrospective completed in Zoom</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">12 min ago</span>
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">xAPI logged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Moments That Matter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Moments That Matter</h3>
            <HelpBadge topic="moments-that-matter" content="" />
          </div>
          
          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Team Gamma Crisis</h4>
                  <p className="text-sm text-gray-600">Expert relationship breakdown</p>
                </div>
                <button className="bg-red-600 text-white px-3 py-1 rounded text-sm">Intervene</button>
              </div>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Sarah Chen - Engagement Drop</h4>
                  <p className="text-sm text-gray-600">No activity in 4 days</p>
                </div>
                <button className="bg-orange-600 text-white px-3 py-1 rounded text-sm">Check In</button>
              </div>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Team Delta - Skills Acceleration</h4>
                  <p className="text-sm text-gray-600">Ready for advanced challenges</p>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Celebrate</button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Interventions</h3>
            <HelpBadge topic="intervention-system" content="" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Team Check-in</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Send Kudos</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center">
              <Brain className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">AI Coaching</span>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Expert Connect</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automation Status & Integration Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Automation Status</h3>
            <HelpBadge topic="automation-effectiveness" content="" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Engagement Nudges</span>
              </div>
              <span className="text-sm text-gray-600">94% effective</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Deadline Reminders</span>
              </div>
              <span className="text-sm text-gray-600">87% effective</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-medium">Quality Interventions</span>
              </div>
              <span className="text-sm text-gray-600">73% effective</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Integration Health</h3>
            <HelpBadge topic="xapi-integration" content="" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Zoom Capture</span>
              </div>
              <span className="text-sm text-gray-600">Online</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">GitHub Analytics</span>
              </div>
              <span className="text-sm text-gray-600">Synced</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">MR Analytics</span>
              </div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">xAPI Adapter</span>
              </div>
              <span className="text-sm text-gray-600">Receiving</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Priority Actions</h3>
          <HelpBadge topic="intervention-system" content="" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-medium text-gray-900">Team Gamma - Expert Escalation Required</h4>
                <p className="text-sm text-gray-600">AI recommends immediate meeting with industry mentor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High Priority</span>
              <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Schedule</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-gray-900">Review Automation Effectiveness</h4>
                <p className="text-sm text-gray-600">Quality intervention success rate dropped to 73%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Medium</span>
              <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">Review</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 