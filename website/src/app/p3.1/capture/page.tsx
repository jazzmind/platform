import React from 'react';
import { Video, FileText, GitBranch, MessageSquare, Brain, CheckCircle, AlertTriangle, Clock, Plus, Settings, TrendingUp } from 'lucide-react';

export default function CapturePage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Off-System Learning Capture</h1>
          <p className="text-slate-600 mt-1">AI-powered monitoring across meetings, documents, code, and daily reflections</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure Sources
          </button>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Capture Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Meeting Bots Active</p>
              <p className="text-2xl font-bold text-slate-900">3</p>
            </div>
            <Video className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Zoom, Teams, Meet</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Document Watchers</p>
              <p className="text-2xl font-bold text-slate-900">5</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Google, GitHub, SharePoint</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Daily Reflections</p>
              <p className="text-2xl font-bold text-slate-900">89%</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Response rate</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Events Captured</p>
              <p className="text-2xl font-bold text-slate-900">1,247</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">This week</p>
        </div>
      </div>

      {/* Main Capture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Meeting Capture */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900">AI Meeting Capture</h3>
            </div>
            <p className="text-sm text-slate-600">Auto-join bots extract decisions, blockers, and learning moments</p>
          </div>
          <div className="p-6">
            {/* Recent Meeting Captures */}
            <div className="space-y-4 mb-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-900">Software Engineering Team Delta - Daily Standup</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Processed</span>
                </div>
                <p className="text-sm text-slate-600 mb-3">Duration: 23 min • Participants: 6 • 2 hours ago</p>
                
                <div className="space-y-2">
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">Key Decision</p>
                    </div>
                    <p className="text-sm text-blue-700">Decided to pivot to microservices architecture for better scalability</p>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <p className="text-sm font-medium text-orange-800">Blocker Identified</p>
                    </div>
                    <p className="text-sm text-orange-700">API documentation incomplete, blocking integration testing</p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Learning Moment</p>
                    </div>
                    <p className="text-sm text-green-700">Sarah demonstrated advanced Git workflow to team (+Technical Skills)</p>
                  </div>
                </div>
                
                <div className="mt-3 flex space-x-2">
                  <button className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded hover:bg-slate-200">View Transcript</button>
                  <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Add to Issue Queue</button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-900">UX Design Team - Client Feedback Session</h4>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Processing</span>
                </div>
                <p className="text-sm text-slate-600 mb-3">Duration: 45 min • Participants: 8 • 30 min ago</p>
                
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">AI is analyzing sentiment and extracting key insights...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup New Bot */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-slate-900 mb-3">Setup Meeting Bot</h5>
              <div className="flex space-x-3">
                <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                  Auto-Join Next Meeting
                </button>
                <button className="flex-1 border border-slate-300 text-slate-700 py-2 px-4 rounded-md hover:bg-slate-50 transition-colors">
                  Schedule Specific Meeting
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Doc & Code Watchers */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Document & Code Watchers</h3>
            </div>
            <p className="text-sm text-slate-600">Monitor GitHub, Google Drive, SharePoint for learning signals</p>
          </div>
          <div className="p-6">
            {/* Connected Integrations */}
            <div className="mb-6">
              <h5 className="font-medium text-slate-900 mb-3">Active Integrations</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">GitHub</p>
                      <p className="text-xs text-slate-600">3 repositories monitored</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    <span className="text-xs text-slate-500">247 events</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">Google Drive</p>
                      <p className="text-xs text-slate-600">12 shared folders</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    <span className="text-xs text-slate-500">89 changes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-900">SharePoint</p>
                      <p className="text-xs text-slate-600">5 document libraries</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                    <span className="text-xs text-slate-500">23 updates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Captures */}
            <div>
              <h5 className="font-medium text-slate-900 mb-3">Recent Learning Signals</h5>
              <div className="space-y-2">
                <div className="p-2 bg-slate-50 rounded text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Team Alpha - Commit Activity</span>
                    <span className="text-xs text-slate-500">3 min ago</span>
                  </div>
                  <p className="text-xs text-slate-600">Jordan implemented authentication feature (+Backend Skills)</p>
                </div>
                
                <div className="p-2 bg-slate-50 rounded text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Design Guidelines Updated</span>
                    <span className="text-xs text-slate-500">15 min ago</span>
                  </div>
                  <p className="text-xs text-slate-600">Sarah added accessibility standards to design system</p>
                </div>
                
                <div className="p-2 bg-slate-50 rounded text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Research Notes Shared</span>
                    <span className="text-xs text-slate-500">1 hour ago</span>
                  </div>
                  <p className="text-xs text-slate-600">Team Beta compiled user interview insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Reflection Monitoring */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Daily Reflection Monitoring</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Response Rate (Last 7 Days)</span>
                <span className="text-sm font-bold text-slate-900">89%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style={{ width: '89%' }}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-slate-900">67</p>
                <p className="text-xs text-slate-600">Reflections Today</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-lg font-bold text-slate-900">+12%</p>
                <p className="text-xs text-slate-600">Engagement Increase</p>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-slate-900 mb-3">Recent Insights</h5>
            <div className="space-y-2">
              <div className="p-2 bg-blue-50 rounded text-sm border border-blue-200">
                <p className="text-xs text-blue-800">Alex: Git branching finally clicked during code review</p>
                <span className="text-xs text-blue-600">+Version Control Skills</span>
              </div>
              <div className="p-2 bg-green-50 rounded text-sm border border-green-200">
                <p className="text-xs text-green-800">Taylor: User interview revealed unexpected pain point</p>
                <span className="text-xs text-green-600">+Research Skills</span>
              </div>
              <div className="p-2 bg-purple-50 rounded text-sm border border-purple-200">
                <p className="text-xs text-purple-800">Morgan: Team communication much smoother after retrospective</p>
                <span className="text-xs text-purple-600">+Collaboration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 