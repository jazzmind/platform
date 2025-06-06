import Link from 'next/link'

export default function UnifiedInboxPage() {
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
              <Link href="/p3/mr" className="text-gray-700 hover:text-blue-600 pb-2">MR Ready</Link>
              <Link href="/p3/inbox" className="text-blue-600 border-b-2 border-blue-600 pb-2">Inbox</Link>
              <Link href="/p3/scheduler" className="text-gray-700 hover:text-blue-600 pb-2">Scheduler</Link>
              <Link href="/p3/automations" className="text-gray-700 hover:text-blue-600 pb-2">Automations</Link>
              <Link href="/p3/reporting" className="text-gray-700 hover:text-blue-600 pb-2">Reporting</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Unified Communication Inbox</h2>
            <p className="text-gray-600">All channels in one place: chat, email, SMS with threaded conversations and AI assistance</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Compose Message
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
              Bulk Actions
            </button>
          </div>
        </div>

        {/* Inbox Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Urgent Responses</p>
                <p className="text-2xl font-semibold text-gray-900">3</p>
                <p className="text-xs text-red-600">SLA overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">12</p>
                <p className="text-xs text-orange-600">Within 24h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">AI Drafts Ready</p>
                <p className="text-2xl font-semibold text-gray-900">8</p>
                <p className="text-xs text-blue-600">Review & send</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-semibold text-gray-900">24</p>
                <p className="text-xs text-green-600">Avg 2.3h response</p>
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Thread - Taylor Brooks Team Issue */}
        <div className="bg-white rounded-lg shadow mb-8 border-l-4 border-red-400">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-red-800 flex items-center">
                🚨 URGENT: Team Gamma - API Integration Crisis
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">SLA Overdue 4h</span>
              </h3>
              <div className="flex space-x-2">
                <button className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700">
                  Send AI Response
                </button>
                <button className="border border-red-300 text-red-700 px-3 py-1 text-sm rounded hover:bg-red-50">
                  Schedule Emergency Call
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Latest Message */}
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">TB</span>
                </div>
                <div className="flex-1">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">Taylor Brooks</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Via SMS • 2h ago</span>
                        <div className="flex space-x-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full" title="SMS"></span>
                          <span className="w-2 h-2 bg-blue-400 rounded-full" title="Email"></span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900">I tried calling the number on the syllabus but no answer. Our presentation is tomorrow and we literally can&apos;t demo anything without this working. PLEASE help us!</p>
                  </div>
                </div>
              </div>

              {/* AI Suggested Response */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">AI Drafted Response (Ready to Send)</h4>
                    <div className="bg-white rounded p-3 text-sm text-gray-900 border">
                      <p className="mb-2">Hi Taylor,</p>
                      <p className="mb-2">I can see you&apos;re facing urgent API integration issues with your presentation tomorrow. I&apos;ve noticed Alex from Team Delta offered help in chat - that&apos;s a great peer resource since they resolved a similar issue recently.</p>
                      <p className="mb-2">I&apos;m also scheduling a 30-minute emergency help session with our technical coach at 2 PM today. The calendar invite includes a pre-call checklist to help diagnose the exact issue.</p>
                      <p>Let&apos;s get this resolved quickly!</p>
                      <p className="mt-2 font-medium">Best regards,<br/>Professor Davis</p>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button className="bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700">Send Now</button>
                      <button className="border border-gray-300 text-gray-700 px-3 py-2 text-sm rounded hover:bg-gray-50">Edit First</button>
                      <button className="text-sm text-gray-600 hover:text-gray-800">Generate Different</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages with AI Assistance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Message List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Conversations</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Expert Feedback Request */}
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">MP</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Maria Perez (Industry Expert)</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-orange-600">Due in 6h</span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full" title="Email"></span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">I&apos;ve reviewed Team Alpha&apos;s prototype. The technical implementation is solid, but I have concerns about the user experience flow...</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">45 min ago</span>
                      <div className="flex space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">AI Draft Ready</span>
                        <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Forward to Team</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Progress Update */}
              <div className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">SC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Sarah Chen (Team Lead - Delta)</p>
                      <span className="text-xs text-gray-500">12h ago</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Weekly update: We&apos;ve completed the user research phase and are moving into wireframe development. On track for Thursday demo.</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">Team Delta thread • 4 messages</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Resolved</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peer Help Connection */}
              <div className="p-4 hover:bg-gray-50 cursor-pointer bg-green-50 border-l-4 border-green-400">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">AK</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Alex Kumar → Taylor Brooks</p>
                      <span className="text-xs text-green-600">Peer Helper</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Hey Taylor, Alex from Team Delta here. We had the same API issue last week. Are you getting a 401 error or something else? I might be able to help.</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">Via Chat • 30 min ago</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AI-Facilitated Connection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Communication Assistant */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">AI Communication Assistant</h3>
            </div>
            
            <div className="p-6">
              {/* Communication Insights */}
              <div className="space-y-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-800">🎯 Priority Action Needed</p>
                  <p className="text-sm text-yellow-700 mt-1">Taylor&apos;s team crisis requires immediate response. AI has drafted emergency response above.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">💡 Smart Connection Made</p>
                  <p className="text-sm text-blue-700 mt-1">Connected Alex Kumar with Taylor Brooks - both worked on similar API issues.</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800">📊 Communication Health</p>
                  <p className="text-sm text-green-700 mt-1">94% of messages resolved within SLA this week. Team engagement up 12%.</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Quick Actions</h4>
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded text-sm hover:bg-red-700">
                  Send All Urgent Responses (3)
                </button>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                  Review AI Drafts (8)
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50">
                  Schedule Bulk Office Hours
                </button>
                <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-50">
                  Export Communication Report
                </button>
              </div>

              {/* Channel Performance */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Channel Effectiveness</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '87%'}}></div>
                      </div>
                      <span className="text-sm text-gray-900">87%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Chat</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                      </div>
                      <span className="text-sm text-gray-900">94%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">SMS</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{width: '78%'}}></div>
                      </div>
                      <span className="text-sm text-gray-900">78%</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Response rates in last 7 days</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 