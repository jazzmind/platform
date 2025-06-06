import React from 'react';
import { TrendingUp, Users, Target, Brain, Download, Filter, Calendar, Zap } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-1">Deep insights into learning patterns and skill development</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </button>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Learning Velocity</p>
              <p className="text-2xl font-bold text-slate-900">+23%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Learners</p>
              <p className="text-2xl font-bold text-slate-900">156</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Skill Mastery Rate</p>
              <p className="text-2xl font-bold text-slate-900">78%</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">AI Interventions</p>
              <p className="text-2xl font-bold text-slate-900">142</p>
            </div>
            <Zap className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* AI Insights Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-900">AI-Generated Insights</h2>
          </div>
          <p className="text-sm text-slate-600">Machine learning analysis of learning patterns and outcomes</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Positive Trend Detected</h3>
              <p className="text-sm text-green-700 mb-3">Teams using daily standups show 34% faster skill acquisition in collaborative projects.</p>
              <div className="text-xs text-green-600">
                <strong>Recommendation:</strong> Implement daily check-ins for all teams
              </div>
            </div>
            
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-2">Learning Pattern Identified</h3>
              <p className="text-sm text-blue-700 mb-3">Learners who engage with AI coaching show 28% higher retention rates.</p>
              <div className="text-xs text-blue-600">
                <strong>Opportunity:</strong> Expand AI coaching to underperforming segments
              </div>
            </div>
            
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <h3 className="font-semibold text-orange-800 mb-2">Risk Factor Alert</h3>
              <p className="text-sm text-orange-700 mb-3">Friday engagement drops correlate with 23% higher dropout risk in week 3-4.</p>
              <div className="text-xs text-orange-600">
                <strong>Action Required:</strong> Implement Friday motivation automation
              </div>
            </div>
            
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <h3 className="font-semibold text-purple-800 mb-2">Skill Gap Analysis</h3>
              <p className="text-sm text-purple-700 mb-3">Data analysis skills lagging 15% behind target across technical tracks.</p>
              <div className="text-xs text-purple-600">
                <strong>Solution:</strong> Add dedicated data visualization workshops
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Engagement Trends */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Engagement Trends</h3>
            <p className="text-sm text-slate-600">Daily activity patterns across all experiences</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Monday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full">
                    <div className="w-28 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">87%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tuesday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full">
                    <div className="w-30 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">92%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Wednesday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full">
                    <div className="w-29 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">89%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Thursday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full">
                    <div className="w-26 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">81%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Friday</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full">
                    <div className="w-20 h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">67%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Matrix */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Team Performance Matrix</h3>
            <p className="text-sm text-slate-600">Collaboration effectiveness vs skill development</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <span className="font-medium text-slate-900">Team Alpha</span>
                  <p className="text-xs text-slate-600">Software Engineering</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-700">94%</span>
                  <p className="text-xs text-green-600">High Performer</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <span className="font-medium text-slate-900">Team Beta</span>
                  <p className="text-xs text-slate-600">UX Design</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-700">87%</span>
                  <p className="text-xs text-blue-600">Strong Progress</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <span className="font-medium text-slate-900">Team Gamma</span>
                  <p className="text-xs text-slate-600">Data Analytics</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-700">73%</span>
                  <p className="text-xs text-orange-600">Needs Support</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <span className="font-medium text-slate-900">Team Delta</span>
                  <p className="text-xs text-slate-600">Product Management</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-purple-700">91%</span>
                  <p className="text-xs text-purple-600">Exceeding Goals</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Development Tracking */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Skill Development Progression</h3>
          <p className="text-sm text-slate-600">AI-tracked competency growth across all skill domains</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h4 className="font-semibold text-slate-900 mb-4">Technical Skills</h4>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#0d9488" strokeWidth="8" 
                    strokeDasharray="283" strokeDashoffset="56.6" strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">80%</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">+12% this month</p>
            </div>
            
            <div className="text-center">
              <h4 className="font-semibold text-slate-900 mb-4">Collaboration</h4>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" 
                    strokeDasharray="283" strokeDashoffset="42.45" strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">85%</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">+8% this month</p>
            </div>
            
            <div className="text-center">
              <h4 className="font-semibold text-slate-900 mb-4">Problem Solving</h4>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="8" 
                    strokeDasharray="283" strokeDashoffset="70.75" strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900">75%</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">+15% this month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 