import React from 'react';
import { Plus, TrendingUp, GitBranch, Users, Brain, Target, CheckCircle, Clock, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Project Orchestration</h1>
          <p className="text-slate-600 mt-1">Conversational project creation with SMART goals and intelligent decomposition</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Templates
          </button>
          <Link href="/p3.1/projects/new" className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Project
          </Link>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Projects</p>
              <p className="text-2xl font-bold text-slate-900">8</p>
            </div>
            <GitBranch className="w-8 h-8 text-teal-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">With AI scaffolding</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Teams Engaged</p>
              <p className="text-2xl font-bold text-slate-900">23</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Across all projects</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">AI Interventions</p>
              <p className="text-2xl font-bold text-slate-900">47</p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">This week</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avg Velocity</p>
              <p className="text-2xl font-bold text-slate-900">+23%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Above baseline</p>
        </div>
      </div>

      {/* Current Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Projects */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Active Projects</h3>
              <span className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded-full">AI Enhanced</span>
            </div>
            <p className="text-sm text-slate-600">Projects with intelligent scaffolding and adaptive checkpoints</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Project 1 */}
            <div className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">AI Solutions for Local Business</h4>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">On Track</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">Software Engineering • 6 teams • Week 3 of 8</p>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center text-xs">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                  <span className="text-slate-600">Business Problem Analysis</span>
                  <span className="ml-auto text-green-600">Complete</span>
                </div>
                <div className="flex items-center text-xs">
                  <Clock className="w-3 h-3 text-blue-500 mr-2" />
                  <span className="text-slate-600">AI Solution Design</span>
                  <span className="ml-auto text-blue-600">In Progress</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 bg-slate-300 rounded-full mr-2"></div>
                  <span className="text-slate-600">Prototype Development</span>
                  <span className="ml-auto text-slate-400">Pending</span>
                </div>
              </div>
              
              <div className="bg-teal-50 p-3 rounded-lg mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">AI Insight</span>
                </div>
                <p className="text-xs text-teal-700">3 teams ahead of schedule - suggesting advanced challenges</p>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Next milestone in 4 days</span>
                <Link href="/p3.1/projects/ai-business" className="text-teal-600 hover:text-teal-700 font-medium">
                  View Details →
                </Link>
              </div>
            </div>

            {/* Project 2 */}
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">UX Design Challenge</h4>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Needs Attention</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">Design Thinking • 4 teams • Week 5 of 6</p>
              
              <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">AI Alert: User Testing Delayed</p>
                    <p className="text-xs text-slate-600">2 teams haven&apos;t scheduled user testing sessions. Suggest intervention.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Adaptive checkpoint recommended</span>
                <button className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700">
                  Intervene Now
                </button>
              </div>
            </div>

            {/* Project 3 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-slate-900">Leadership Development MR</h4>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">MR Active</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">Executive Leadership • 12 participants • Week 2 of 4</p>
              
              <div className="space-y-1 mb-3 text-xs text-slate-600">
                <div><span className="font-medium">MR Scenarios:</span> 8 completed, 4 in progress</div>
                <div><span className="font-medium">Avg Score:</span> 7.8/10 (+0.9 from baseline)</div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Skills velocity: +23% this week</span>
                <Link href="/p3.1/projects/leadership-mr" className="text-teal-600 hover:text-teal-700 font-medium">
                  View MR Data →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* AI Task Decomposition */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-slate-900">Intelligent Task Decomposition</h3>
            </div>
            <p className="text-sm text-slate-600">AI-generated Kanban with smart owners and adaptive due dates</p>
          </div>
          <div className="p-6">
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-slate-900 mb-3">AI Business Solutions Project - Smart Tasks</h4>
              
              <div className="space-y-3">
                {/* Week 1 Tasks */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Week 1: Discovery & Research</h5>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center justify-between bg-white rounded p-2 text-sm border border-slate-200">
                      <span>Identify 3 local businesses</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Team Lead</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Done</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded p-2 text-sm border border-slate-200">
                      <span>Conduct initial interviews</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">All Members</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Adaptive Checkpoint */}
                <div className="border-l-4 border-teal-400 bg-teal-50 p-3">
                  <div className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-teal-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-teal-800">AI Adaptive Checkpoint</p>
                      <p className="text-xs text-teal-700">Team Delta is progressing faster than expected. AI suggests adding advanced task: &quot;Competitive AI analysis&quot; to maintain optimal challenge level.</p>
                      <button className="mt-2 text-xs bg-teal-100 text-teal-800 px-3 py-1 rounded hover:bg-teal-200">
                        Add Suggested Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/p3.1/projects/ai-business/tasks" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                View Full Kanban Board →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Optimized Project Templates */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">AI-Optimized Project Templates</h3>
          <p className="text-sm text-slate-600">Pre-built scaffolding with intelligent adaptations for common project types</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <h4 className="font-semibold text-slate-900 mb-2">Software Development</h4>
              <p className="text-sm text-slate-600 mb-3">Full-stack development with AI code review and adaptive milestones</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">8-12 weeks</span>
                <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">Use Template</button>
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <h4 className="font-semibold text-slate-900 mb-2">Design Thinking</h4>
              <p className="text-sm text-slate-600 mb-3">Human-centered design with AI user research analysis</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">4-6 weeks</span>
                <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">Use Template</button>
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer">
              <h4 className="font-semibold text-slate-900 mb-2">Business Strategy</h4>
              <p className="text-sm text-slate-600 mb-3">Market analysis with AI competitive intelligence</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">6-8 weeks</span>
                <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">Use Template</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 