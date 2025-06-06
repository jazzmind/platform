import React from 'react';
import { Zap, Clock, Users, TrendingUp, Settings, Plus, Play, Pause, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import HelpBadge from '../../../components/HelpBadge';

export default function AutomationsPage() {
  const automations = [
    {
      id: 1,
      name: "Engagement Nudges",
      description: "Send reminders to students who haven't engaged in 48h",
      status: "active",
      effectiveness: "94%",
      triggered: 23,
      category: "Engagement"
    },
    {
      id: 2, 
      name: "Assessment Deadline Alerts",
      description: "Remind teams 24h and 2h before assessments due",
      status: "active",
      effectiveness: "87%",
      triggered: 15,
      category: "Timeliness"
    },
    {
      id: 3,
      name: "Expert Response Follow-up", 
      description: "Nudge experts who haven't provided feedback in 72h",
      status: "active",
      effectiveness: "76%",
      triggered: 8,
      category: "Quality"
    },
    {
      id: 4,
      name: "Team Conflict Detection",
      description: "Schedule mediation when peer survey indicates conflict",
      status: "paused",
      effectiveness: "89%",
      triggered: 2,
      category: "Team Dynamics"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Automation Management</h1>
          <HelpBadge topic="automation-effectiveness" content="" position="bottom" />
        </div>
        <Link 
          href="/p3/automations/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Create Automation
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Rules</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today&apos;s Triggers</p>
              <p className="text-2xl font-bold text-gray-900">48</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Effectiveness</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">86%</p>
                <HelpBadge topic="automation-effectiveness" content="" size="sm" />
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Manual Approvals</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Natural Language Setup */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create with Natural Language</h2>
          <HelpBadge topic="natural-language-setup" content="" />
        </div>
        <p className="text-gray-600 mb-4">
          Describe what you want to automate in plain English, and AI will create the rules for you.
        </p>
        <div className="flex gap-3">
          <Link 
            href="/p3/automations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Start Describing
          </Link>
          <button className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
            View Examples
          </button>
        </div>
      </div>

      {/* Active Automations */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Active Automations</h2>
            <HelpBadge topic="intervention-system" content="" />
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {automations.map((automation) => (
            <div key={automation.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      automation.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {automation.status}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {automation.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{automation.description}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Effectiveness: <strong className="text-gray-900">{automation.effectiveness}</strong></span>
                    <span>Triggered: <strong className="text-gray-900">{automation.triggered}</strong> times today</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                    <BarChart3 size={16} />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                    <Settings size={16} />
                  </button>
                  {automation.status === 'active' ? (
                    <button className="p-2 text-orange-600 hover:text-orange-900 hover:bg-orange-100 rounded">
                      <Pause size={16} />
                    </button>
                  ) : (
                    <button className="p-2 text-green-600 hover:text-green-900 hover:bg-green-100 rounded">
                      <Play size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 