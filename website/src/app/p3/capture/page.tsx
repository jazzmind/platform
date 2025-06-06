import Link from 'next/link'

export default function CaptureHubPage() {
  return (
    <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Off-System Learning Capture</h2>
          <p className="text-gray-600">AI-powered monitoring across meetings, documents, code, and daily reflections</p>
        </div>

        {/* Capture Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Meeting Bots Active</p>
                <p className="text-2xl font-semibold text-gray-900">3</p>
                <p className="text-xs text-green-600">Zoom, Teams, Meet</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Document Watchers</p>
                <p className="text-2xl font-semibold text-gray-900">5</p>
                <p className="text-xs text-blue-600">Google, GitHub, SharePoint</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Daily Reflections</p>
                <p className="text-2xl font-semibold text-gray-900">89%</p>
                <p className="text-xs text-purple-600">Response rate</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Events Captured</p>
                <p className="text-2xl font-semibold text-gray-900">1,247</p>
                <p className="text-xs text-orange-600">This week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Capture Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Meeting Capture */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                AI Meeting Capture
              </h3>
              <p className="text-sm text-gray-600">Auto-join bots extract decisions, blockers, and learning moments</p>
            </div>
            <div className="p-6">
              {/* Recent Meeting Captures */}
              <div className="space-y-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">Software Engineering Team Delta - Daily Standup</h4>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Processed</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Duration: 23 min • Participants: 6 • 2 hours ago</p>
                  
                  <div className="space-y-2">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-800">🎯 Key Decision</p>
                      <p className="text-sm text-blue-700">&quot;Decided to pivot to microservices architecture for better scalability&quot;</p>
                    </div>
                    
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-sm font-medium text-orange-800">🚧 Blocker Identified</p>
                      <p className="text-sm text-orange-700">&quot;API documentation incomplete, blocking integration testing&quot;</p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm font-medium text-green-800">💡 Learning Moment</p>
                      <p className="text-sm text-green-700">Sarah demonstrated advanced Git workflow to team (+Technical Skills)</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">View Transcript</button>
                    <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Add to Issue Queue</button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">UX Design Team - Client Feedback Session</h4>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Processing</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Duration: 45 min • Participants: 8 • 30 min ago</p>
                  
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-yellow-800">AI is analyzing sentiment and extracting key insights...</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup New Bot */}
              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-900 mb-3">Setup Meeting Bot</h5>
                <div className="flex space-x-3">
                  <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Auto-Join Next Meeting
                  </button>
                  <button className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                    Schedule Specific Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Doc & Code Watchers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document & Code Watchers
              </h3>
              <p className="text-sm text-gray-600">Monitor GitHub, Google Drive, SharePoint for learning signals</p>
            </div>
            <div className="p-6">
              {/* Connected Integrations */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 mb-3">Active Integrations</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">GitHub</p>
                        <p className="text-xs text-gray-600">3 repositories monitored</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      <span className="text-xs text-gray-500">247 events</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.01 2C6.5 2 2.02 6.48 2.02 12s4.48 10 9.99 10c5.51 0 10.01-4.48 10.01-10S17.52 2 12.01 2zM18 13.02h-5.5v5.5c0 .55-.45 1-1 1s-1-.45-1-1v-5.5H5c-.55 0-1-.45-1-1s.45-1 1-1h5.5V5.5c0-.55.45-1 1-1s1 .45 1 1v5.52H18c.55 0 1 .45 1 1s-.45 1-1 1z"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Google Drive</p>
                        <p className="text-xs text-gray-600">12 shared folders</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      <span className="text-xs text-gray-500">156 events</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7c4.78-.75 8.44-4.9 8.44-9.9 0-5.53-4.5-10.02-10-10.02z"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">SharePoint</p>
                        <p className="text-xs text-gray-600">5 project sites</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      <span className="text-xs text-gray-500">89 events</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Document Activity */}
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-3">Recent Activity Insights</h5>
                <div className="space-y-3">
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-3">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-orange-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-orange-800">Scope Creep Detected</p>
                        <p className="text-sm text-orange-700">Sarah Chen added 3 new features to UX project scope. Consider checkpoint review.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Collaboration Insight</p>
                        <p className="text-sm text-blue-700">Team Delta&apos;s shared doc shows 6 contributors with balanced participation.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-400 p-3">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-green-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">Quality Improvement</p>
                        <p className="text-sm text-green-700">Alex Kumar&apos;s code reviews show +40% constructive feedback quality this week.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Integration */}
              <div className="border-t pt-4">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  + Connect New Integration
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Reflection Nudges */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Daily Reflection Nudges
            </h3>
            <p className="text-sm text-gray-600">Micro-prompts delivered via Slack, email, or SMS for quick learning capture</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Nudge Templates */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Active Nudge Templates</h4>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">Daily Learning Moment</h5>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">📚 What&apos;s one thing you learned today that surprised you?</p>
                    <div className="text-xs text-gray-500">
                      <span>Delivery: 6:00 PM • Response Rate: 92%</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">Blocker Check</h5>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">🚧 Any blockers preventing you from moving forward? (One sentence is fine!)</p>
                    <div className="text-xs text-gray-500">
                      <span>Delivery: 2:00 PM • Response Rate: 78%</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">Peer Appreciation</h5>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Active</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">🤝 Who helped you today and how?</p>
                    <div className="text-xs text-gray-500">
                      <span>Delivery: Friday 4:00 PM • Response Rate: 85%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                    + Create Custom Nudge
                  </button>
                </div>
              </div>

              {/* Recent Responses */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Recent Student Responses</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">SC</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-900">Sarah Chen</p>
                          <span className="text-xs text-gray-500">2 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-600 italic">&quot;Learned that Git rebase can actually be safer than merge when done right. Totally changed my workflow!&quot;</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">+Technical Skills</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Growth Mindset</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">AK</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-900">Alex Kumar</p>
                          <span className="text-xs text-gray-500">4 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-600 italic">&quot;Jordan helped me debug the API issue by asking the right questions. Made me realize I was thinking about it wrong.&quot;</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">+Collaboration</span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Problem Solving</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">JL</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-gray-900">Jordan Lee</p>
                          <span className="text-xs text-gray-500">6 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-600 italic">&quot;Still stuck on the database optimization. Maybe need to try a different approach?&quot;</p>
                        <div className="mt-2 flex space-x-2">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Needs Support</span>
                          <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Suggest Help</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <Link href="/p3/capture/responses" className="text-sm text-blue-600 hover:text-blue-500">
                    View All Responses →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capture Analytics */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Capture Analytics</h3>
            <p className="text-sm text-gray-600">Learning signal quality and coverage metrics</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-green-600">89%</span>
                </div>
                <h4 className="font-medium text-gray-900">Coverage Rate</h4>
                <p className="text-sm text-gray-600">Students with daily capture activity</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-blue-600">7.2</span>
                </div>
                <h4 className="font-medium text-gray-900">Signal Quality</h4>
                <p className="text-sm text-gray-600">Avg learning insights per capture</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-purple-600">45s</span>
                </div>
                <h4 className="font-medium text-gray-900">Response Time</h4>
                <p className="text-sm text-gray-600">Avg time from nudge to response</p>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
} 