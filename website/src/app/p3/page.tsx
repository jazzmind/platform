export default function P3Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Command Center Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Command Center</h1>
            <p className="text-gray-600">Real-time learning orchestration and educator empowerment</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">AI Systems Active</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">847</div>
              <div className="text-xs text-gray-500">Learning Moments Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* AI Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              Live AI Orchestration
            </h3>
            <p className="text-sm text-gray-600">Platform actions driving learning outcomes</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {[
                {
                  time: "2 min ago",
                  type: "intervention",
                  icon: "🎯",
                  title: "Intervention Triggered",
                  description: "Jordan Lee showing early disengagement signals in Team Gamma",
                  action: "Suggest 1:1 check-in",
                  priority: "high"
                },
                {
                  time: "5 min ago",
                  type: "capture",
                  icon: "🎙️",
                  title: "Meeting Intelligence",
                  description: "Extracted 3 decisions + 2 blockers from Team Alpha standup",
                  action: "Review insights",
                  priority: "medium"
                },
                {
                  time: "8 min ago",
                  type: "skill",
                  icon: "📊",
                  title: "Skill Milestone",
                  description: "Sarah Chen achieved Advanced level in Data Analysis",
                  action: "Celebrate achievement",
                  priority: "medium"
                },
                {
                  time: "12 min ago",
                  type: "automation",
                  icon: "⚡",
                  title: "Auto-Schedule Triggered",
                  description: "Expert feedback session booked for Team Beta (conflict detected → resolved)",
                  action: "Confirmed",
                  priority: "low"
                },
                {
                  time: "15 min ago",
                  type: "quality",
                  icon: "🔍",
                  title: "Quality Alert",
                  description: "Team Gamma project quality dropped below threshold",
                  action: "Recommend intervention",
                  priority: "high"
                },
                {
                  time: "18 min ago",
                  type: "document",
                  icon: "📄",
                  title: "Document Watcher",
                  description: "New research paper uploaded to Team Alpha shared drive",
                  action: "Suggest relevance review",
                  priority: "low"
                }
              ].map((activity, idx) => (
                <div key={idx} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                  activity.priority === 'high' ? 'border-red-500 bg-red-50' :
                  activity.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{activity.icon}</span>
                        <span className="font-medium text-gray-900">{activity.title}</span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                      <button className={`text-xs px-3 py-1 rounded-full font-medium ${
                        activity.priority === 'high' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                        activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                        'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}>
                        {activity.action}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Moment Opportunities */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-lg border border-purple-200">
          <div className="px-6 py-4 border-b border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Moments That Matter
            </h3>
            <p className="text-sm text-purple-600">High-impact opportunities right now</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                student: "Jordan Lee",
                urgency: "Critical",
                moment: "Feeling overwhelmed by API integration complexity",
                impact: "Risk of disengagement",
                action: "Schedule 15-min confidence boost",
                color: "red"
              },
              {
                student: "Sarah Chen",
                urgency: "Opportunity",
                moment: "Breakthrough in machine learning concepts",
                impact: "Ready for advanced challenge",
                action: "Offer stretch goal",
                color: "green"
              },
              {
                student: "Alex Kumar",
                urgency: "Social",
                moment: "Natural mentor emerging in team dynamics",
                impact: "Leadership development opportunity",
                action: "Recognize publicly",
                color: "blue"
              }
            ].map((moment, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-gray-900">{moment.student}</div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    moment.color === 'red' ? 'bg-red-100 text-red-800' :
                    moment.color === 'green' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {moment.urgency}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{moment.moment}</p>
                <p className="text-xs text-gray-600 mb-3 italic">{moment.impact}</p>
                <button className={`w-full text-sm py-2 rounded font-medium transition-colors ${
                  moment.color === 'red' ? 'bg-red-600 text-white hover:bg-red-700' :
                  moment.color === 'green' ? 'bg-green-600 text-white hover:bg-green-700' :
                  'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                  {moment.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Learning Velocity</p>
              <p className="text-2xl font-bold text-green-600">+23%</p>
              <p className="text-xs text-gray-500">vs last week</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Interventions</p>
              <p className="text-2xl font-bold text-blue-600">24</p>
              <p className="text-xs text-gray-500">today</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Capture Sources</p>
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-xs text-gray-500">active streams</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Student Engagement</p>
              <p className="text-2xl font-bold text-orange-600">94%</p>
              <p className="text-xs text-gray-500">this week</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Automations Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">High-impact educator interventions</p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Instant Check-in</span>
              <span className="text-xs text-gray-500">with struggling student</span>
            </button>

            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Celebrate Win</span>
              <span className="text-xs text-gray-500">student achievement</span>
            </button>

            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Team Intervention</span>
              <span className="text-xs text-gray-500">resolve conflict</span>
            </button>

            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Expert Connect</span>
              <span className="text-xs text-gray-500">industry mentor</span>
            </button>
          </div>
        </div>

        {/* Automation Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Automation Status</h3>
            <p className="text-sm text-gray-600">Platform intelligence working for you</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              { name: "Meeting Capture Bots", status: "active", count: "3 meetings", health: "green" },
              { name: "Document Watchers", status: "active", count: "5 sources", health: "green" },
              { name: "Skill Progression Tracking", status: "active", count: "12 students", health: "green" },
              { name: "Conflict Detection", status: "monitoring", count: "4 teams", health: "yellow" },
              { name: "Expert Scheduling", status: "active", count: "2 pending", health: "green" },
              { name: "Quality Alerts", status: "triggered", count: "1 alert", health: "red" }
            ].map((automation, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    automation.health === 'green' ? 'bg-green-500' :
                    automation.health === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{automation.name}</div>
                    <div className="text-sm text-gray-600">{automation.count}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  automation.status === 'active' ? 'bg-green-100 text-green-800' :
                  automation.status === 'monitoring' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {automation.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Platform Integration Status */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-lg shadow-lg text-white">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Cross-Platform Intelligence</h3>
          <p className="text-sm text-gray-300">Unified learning ecosystem status</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="font-medium">Zoom Integration</div>
              <div className="text-sm text-gray-300">3 active captures</div>
              <div className="text-xs text-green-400 mt-1">● Connected</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="font-medium">GitHub Watcher</div>
              <div className="text-sm text-gray-300">5 repositories</div>
              <div className="text-xs text-green-400 mt-1">● Monitoring</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="font-medium">MR Analytics</div>
              <div className="text-sm text-gray-300">Unity + Unreal</div>
              <div className="text-xs text-green-400 mt-1">● Streaming</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="font-medium">xAPI Stream</div>
              <div className="text-sm text-gray-300">Cross-modal data</div>
              <div className="text-xs text-green-400 mt-1">● Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your Action Items</h3>
          <p className="text-sm text-gray-600">Platform recommendations for maximum learning impact</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              {
                priority: "high",
                action: "Connect with Jordan Lee about API integration challenges",
                reason: "AI detected frustration patterns + decreased participation",
                timeframe: "Next 2 hours"
              },
              {
                priority: "medium",
                action: "Review Team Gamma's project quality metrics",
                reason: "Quality score dropped 15% in past week",
                timeframe: "Today"
              },
              {
                priority: "low",
                action: "Celebrate Sarah Chen's machine learning breakthrough",
                reason: "Achieved advanced skill level + peer helping behavior",
                timeframe: "This week"
              }
            ].map((item, idx) => (
              <div key={idx} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                item.priority === 'high' ? 'border-red-500 bg-red-50' :
                item.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-green-500 bg-green-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{item.action}</div>
                    <div className="text-sm text-gray-600 mb-2">{item.reason}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.timeframe}</span>
                      <button className={`text-xs px-3 py-1 rounded-full font-medium ${
                        item.priority === 'high' ? 'bg-red-600 text-white hover:bg-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                        'bg-green-600 text-white hover:bg-green-700'
                      }`}>
                        Take Action
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 