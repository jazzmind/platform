import React from 'react';
import { Plus, Zap, Brain, Target, TrendingUp, Clock, Settings, Play, Pause, Edit } from 'lucide-react';

export default function AutomationsPage() {
  const automationRules = [
    {
      id: 1,
      name: "Engagement Drop Detection",
      type: "engagement",
      status: "active",
      effectiveness: 94,
      triggers: 48,
      description: "Automatically detects when learners haven't engaged for 24+ hours",
      actions: ["Send personalized nudge", "Notify coach", "Suggest peer connection"],
      lastTriggered: "2 min ago",
      successRate: "89%"
    },
    {
      id: 2,
      name: "Team Conflict Early Warning",
      type: "teamwork",
      status: "active",
      effectiveness: 89,
      triggers: 6,
      description: "Monitors communication sentiment and participation balance",
      actions: ["Schedule mediation", "Send communication tips", "Alert facilitator"],
      lastTriggered: "1 hour ago",
      successRate: "92%"
    },
    {
      id: 3,
      name: "Deadline Proximity Reminders",
      type: "deadlines",
      status: "active",
      effectiveness: 87,
      triggers: 23,
      description: "Smart reminders based on task complexity and user patterns",
      actions: ["Send reminder", "Break down tasks", "Suggest time management"],
      lastTriggered: "15 min ago",
      successRate: "76%"
    },
    {
      id: 4,
      name: "Quality Score Intervention",
      type: "quality",
      status: "paused",
      effectiveness: 73,
      triggers: 12,
      description: "Triggers when feedback quality drops below threshold",
      actions: ["Provide examples", "Schedule coaching", "Peer review assignment"],
      lastTriggered: "3 hours ago",
      successRate: "68%"
    }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Intelligent Automations</h1>
          <p className="text-slate-600 mt-1">AI-powered rules that adapt and learn from learner behavior patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Suggestions
          </button>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </div>

      {/* Automation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Rules</p>
              <p className="text-2xl font-bold text-slate-900">12</p>
            </div>
            <Zap className="w-8 h-8 text-teal-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Across all categories</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Triggers Today</p>
              <p className="text-2xl font-bold text-slate-900">89</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">+15% from yesterday</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avg Effectiveness</p>
              <p className="text-2xl font-bold text-slate-900">86%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Above 80% target</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Time Saved</p>
              <p className="text-2xl font-bold text-slate-900">47h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">This week</p>
        </div>
      </div>

      {/* AI Automation Builder */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-900">Conversational Automation Builder</h2>
          <Zap className="w-5 h-5 text-teal-500" />
        </div>
        <p className="text-slate-600 mb-4">
          Describe what you want to automate in plain English. AI will create the rule logic and suggest optimal triggers.
        </p>
        <div className="bg-white rounded-lg p-4 mb-4 border border-teal-200">
          <textarea 
            placeholder="Example: 'When a team hasn't submitted anything for 2 days and their deadline is in 3 days, send them a motivational message and break down their remaining tasks...'"
            className="w-full h-20 text-sm border-none resize-none focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
            Generate Automation
          </button>
          <button className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            Use Template
          </button>
        </div>
      </div>

      {/* Active Automation Rules */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Automation Rules</h2>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1 bg-teal-100 text-teal-800 rounded-lg">All</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">Active</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">Paused</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">Learning</button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-200">
          {automationRules.map((rule) => (
            <div key={rule.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rule.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.status === 'active' ? (
                        <><Play className="w-3 h-3 inline mr-1" />Active</>
                      ) : (
                        <><Pause className="w-3 h-3 inline mr-1" />Paused</>
                      )}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {rule.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">{rule.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{rule.effectiveness}%</p>
                      <p className="text-xs text-slate-600">Effectiveness</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{rule.triggers}</p>
                      <p className="text-xs text-slate-600">Triggers Today</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-lg font-bold text-slate-900">{rule.successRate}</p>
                      <p className="text-xs text-slate-600">Success Rate</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{rule.lastTriggered}</p>
                      <p className="text-xs text-slate-600">Last Triggered</p>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Automated Actions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {rule.actions.map((action, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className={`p-2 rounded ${
                    rule.status === 'active' 
                      ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-100' 
                      : 'text-green-600 hover:text-green-900 hover:bg-green-100'
                  }`}>
                    {rule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Learning Insights */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Learning Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-start space-x-2">
              <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Pattern Recognition</p>
                <p className="text-xs text-blue-700 mt-1">AI identified that Friday engagement drops are 23% more likely to lead to project delays. Suggest implementing &quot;Friday motivation boost&quot; automation.</p>
                <button className="mt-2 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">
                  Create Suggested Rule
                </button>
              </div>
            </div>
          </div>
          
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Optimization Opportunity</p>
                <p className="text-xs text-green-700 mt-1">Teams with early conflict detection have 34% better final outcomes. Consider reducing intervention threshold from 48h to 24h.</p>
                <button className="mt-2 text-xs bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200">
                  Optimize Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 