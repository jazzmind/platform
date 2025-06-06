import Link from 'next/link'

export default function MRReadyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Practera Educator Workspace 2.0</h1>
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">AI-First</span>
            </div>
            <nav className="flex space-x-8">
              <Link href="/p3" className="text-gray-700 hover:text-blue-600 pb-2">Dashboard</Link>
              <Link href="/p3/projects" className="text-gray-700 hover:text-blue-600 pb-2">Projects</Link>
              <Link href="/p3/analytics" className="text-gray-700 hover:text-blue-600 pb-2">Analytics</Link>
              <Link href="/p3/capture" className="text-gray-700 hover:text-blue-600 pb-2">Capture Hub</Link>
              <Link href="/p3/mr" className="text-blue-600 border-b-2 border-blue-600 pb-2">MR Ready</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mixed Reality Learning Integration</h2>
          <p className="text-gray-600">Seamless xAPI streaming from Unity & Unreal scenarios with cross-modal skill mapping</p>
        </div>

        {/* MR Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active MR Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">12</p>
                <p className="text-xs text-purple-600">Across 3 scenarios</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">xAPI Events Today</p>
                <p className="text-2xl font-semibold text-gray-900">1,856</p>
                <p className="text-xs text-green-600">From 156 scenarios</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Skill Mappings</p>
                <p className="text-2xl font-semibold text-gray-900">85</p>
                <p className="text-xs text-blue-600">Scenarios → Rubrics</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg MR Score</p>
                <p className="text-2xl font-semibold text-gray-900">7.8</p>
                <p className="text-xs text-orange-600">+1.2 this week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main MR Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Scenarios */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Available MR Scenarios</h3>
              <p className="text-sm text-gray-600">Unity & Unreal experiences with direct skill mapping</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Leadership Scenarios */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Leadership Development
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Conflict Resolution</h5>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Navigate workplace disagreements with emotional intelligence</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Leadership</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Communication</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Empathy</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        12 completions this week • Avg score: 8.2/10
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                        Launch Scenario
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Team Building Workshop</h5>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Available</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Facilitate team dynamics in virtual environments</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Leadership</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Facilitation</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Collaboration</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        8 completions this week • Avg score: 7.5/10
                      </div>
                      <button className="w-full border border-gray-300 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-50">
                        Launch Scenario
                      </button>
                    </div>
                  </div>
                </div>

                {/* Technical Scenarios */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Technical Skills
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Architecture Review</h5>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Popular</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Present and defend system design decisions</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Technical Skills</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Communication</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Problem Solving</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        15 completions this week • Avg score: 8.0/10
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                        Launch Scenario
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Code Review Session</h5>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Available</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Practice giving and receiving constructive feedback</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Technical Skills</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Collaboration</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Communication</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        6 completions this week • Avg score: 7.3/10
                      </div>
                      <button className="w-full border border-gray-300 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-50">
                        Launch Scenario
                      </button>
                    </div>
                  </div>
                </div>

                {/* Business Scenarios */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Business Strategy
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Investor Pitch</h5>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Beta</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Present business ideas to virtual investors</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Communication</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Business Acumen</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Persuasion</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        4 completions this week • Avg score: 6.8/10
                      </div>
                      <button className="w-full border border-gray-300 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-50">
                        Launch Scenario
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">Customer Discovery</h5>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Conduct user interviews and gather insights</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">User Research</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Communication</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Analysis</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        9 completions this week • Avg score: 7.9/10
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                        Launch Scenario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* xAPI Integration Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">xAPI Integration</h3>
                <p className="text-sm text-gray-600">Real-time event streaming status</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-purple-500 rounded mr-3 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">U</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Unity Adapter</span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Online</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-blue-600 rounded mr-3 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">U</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Unreal Adapter</span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Online</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gray-500 rounded mr-3 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Practera LRS</span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900 mb-1">Recent Events</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Alex Kumar <em>completed</em> Conflict Resolution (8.2/10)</p>
                    <p>• Sarah Chen <em>practiced</em> Architecture Review (in progress)</p>
                    <p>• Jordan Lee <em>attempted</em> Team Building Workshop (6.5/10)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Mapping Configuration */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Skill Mapping</h3>
                <p className="text-sm text-gray-600">Scenario → Rubric connections</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm font-medium text-blue-800">Conflict Resolution</p>
                    <div className="text-xs text-blue-700 mt-1 space-y-1">
                      <p>→ Leadership (Primary)</p>
                      <p>→ Communication (Secondary)</p>
                      <p>→ Emotional Intelligence (Tertiary)</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm font-medium text-green-800">Architecture Review</p>
                    <div className="text-xs text-green-700 mt-1 space-y-1">
                      <p>→ Technical Skills (Primary)</p>
                      <p>→ Problem Solving (Secondary)</p>
                      <p>→ Communication (Tertiary)</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded">
                    <p className="text-sm font-medium text-orange-800">Customer Discovery</p>
                    <div className="text-xs text-orange-700 mt-1 space-y-1">
                      <p>→ User Research (Primary)</p>
                      <p>→ Communication (Secondary)</p>
                      <p>→ Critical Thinking (Tertiary)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50">
                    Configure Mappings
                  </button>
                </div>
              </div>
            </div>

            {/* Performance Analytics */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">MR Performance</h3>
                <p className="text-sm text-gray-600">Cross-modal skill development</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">Leadership</span>
                      <span className="text-green-600">+28%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">MR: 8.2 | Traditional: 7.1 | Expert: 7.8</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">Technical Skills</span>
                      <span className="text-blue-600">+22%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '72%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">MR: 8.0 | Traditional: 7.3 | Expert: 8.1</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">Communication</span>
                      <span className="text-purple-600">+15%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '58%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">MR: 7.1 | Traditional: 6.8 | Expert: 7.4</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">
                    <strong>Cross-Modal Insight:</strong> Students performing MR scenarios show 23% faster skill velocity compared to traditional methods alone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live MR Sessions */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Live MR Sessions</h3>
            <p className="text-sm text-gray-600">Currently active scenarios with real-time performance</p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-900">Student</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-900">Scenario</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">Duration</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">Progress</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">Live Score</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-medium">SC</span>
                        </div>
                        <span className="font-medium">Sarah Chen</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">Architecture Review</td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">12:34</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '68%'}}></div>
                      </div>
                      <span className="text-xs text-gray-600">68%</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="font-medium text-green-600">8.1</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <button className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Monitor</button>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-medium">AK</span>
                        </div>
                        <span className="font-medium">Alex Kumar</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">Conflict Resolution</td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Complete</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
                      </div>
                      <span className="text-xs text-gray-600">100%</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="font-medium text-green-600">8.2</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Review</button>
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-medium">JL</span>
                        </div>
                        <span className="font-medium">Jordan Lee</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">Team Building Workshop</td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">08:45</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{width: '34%'}}></div>
                      </div>
                      <span className="text-xs text-gray-600">34%</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="font-medium text-orange-600">6.1</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <button className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200">Assist</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Developer Integration Guide */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Developer Integration</h3>
            <p className="text-sm text-gray-600">Setup guides for Unity and Unreal Engine xAPI streaming</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unity Integration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">U</span>
                  </div>
                  <h4 className="font-medium text-gray-900">Unity Integration</h4>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">1. Install Package</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                      npm install @practera/unity-xapi
                    </code>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">2. Initialize Adapter</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                      PracteraXAPI.Init(studentId, scenarioId)
                    </code>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">3. Send Events</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                      PracteraXAPI.Send(&quot;practiced&quot;, skill, score)
                    </code>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button className="w-full bg-purple-600 text-white py-2 px-4 rounded text-sm hover:bg-purple-700">
                    Download Unity Package
                  </button>
                </div>
              </div>

              {/* Unreal Integration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">U</span>
                  </div>
                  <h4 className="font-medium text-gray-900">Unreal Engine Integration</h4>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">1. Add Plugin</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                      PracteraXAPI Plugin v2.1
                    </code>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">2. Blueprint Setup</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                      Initialize Practera xAPI Component
                    </code>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-gray-900 mb-1">3. Event Triggers</p>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                      Send Skill Event (Verb, Object, Score)
                    </code>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                    Download UE Plugin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 