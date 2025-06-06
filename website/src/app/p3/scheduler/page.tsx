
export default function SchedulerPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered Scheduling Hub</h2>
            <p className="text-gray-600">Automated meeting coordination with pooled availability and smart agenda generation</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create Meeting Link
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
              Bulk Schedule
            </button>
          </div>
        </div>

        {/* Scheduling Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-semibold text-gray-900">23</p>
                <p className="text-xs text-blue-600">Meetings scheduled</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Auto-Scheduled</p>
                <p className="text-2xl font-semibold text-gray-900">15</p>
                <p className="text-xs text-green-600">By AI automations</p>
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
                <p className="text-sm font-medium text-gray-600">Avg Booking Time</p>
                <p className="text-2xl font-semibold text-gray-900">43s</p>
                <p className="text-xs text-orange-600">From trigger to confirmed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pool Utilization</p>
                <p className="text-2xl font-semibold text-gray-900">78%</p>
                <p className="text-xs text-purple-600">Available coaches</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Scheduling Suggestions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 mb-8">
          <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Smart Scheduling Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-red-800">🚨 Emergency Session</h4>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">URGENT</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">Team Gamma needs immediate API help - demo tomorrow!</p>
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Suggested:</strong> Today 2:00 PM (15 min)</p>
                <p><strong>Available:</strong> You + Tech Coach Sarah</p>
              </div>
              <button className="w-full bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700">
                Schedule Now
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-orange-800">⚡ Proactive Check-in</h4>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">RECOMMENDED</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">Expert James Wilson shows engagement drop - touch base?</p>
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Suggested:</strong> Tomorrow 11:00 AM (20 min)</p>
                <p><strong>Template:</strong> Expert appreciation call</p>
              </div>
              <button className="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700">
                Schedule & Send
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-800">📈 Skill Development</h4>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">OPTIMIZATION</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">Sarah Chen&apos;s communication skills plateaued - coaching session?</p>
              <div className="text-sm text-gray-600 mb-3">
                <p><strong>Suggested:</strong> Thursday 3:00 PM (25 min)</p>
                <p><strong>Coach:</strong> Career Coach Maria available</p>
              </div>
              <button className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700">
                Book Session
              </button>
            </div>
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Smart Calendar - March 2025</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-red-400 rounded"></div>
                  <span>Emergency</span>
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <span>Coaching</span>
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>Expert Meeting</span>
                  <div className="w-3 h-3 bg-purple-400 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex space-x-2">
                  <button className="text-sm text-gray-600 hover:text-gray-800">← Prev</button>
                  <button className="text-sm text-gray-600 hover:text-gray-800">Next →</button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Weekly Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Monday */}
              <div className="border border-gray-200 min-h-[160px] p-2">
                <div className="text-sm font-medium text-gray-900 mb-2">18</div>
                <div className="space-y-1">
                  <div className="bg-red-100 text-red-800 text-xs p-1 rounded">
                    2 PM: Emergency - Team Gamma
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded">
                    4 PM: Team Delta Review
                  </div>
                </div>
              </div>

              {/* Tuesday */}
              <div className="border border-gray-200 min-h-[160px] p-2">
                <div className="text-sm font-medium text-gray-900 mb-2">19</div>
                <div className="space-y-1">
                  <div className="bg-green-100 text-green-800 text-xs p-1 rounded">
                    11 AM: Expert Check - James W.
                  </div>
                  <div className="bg-purple-100 text-purple-800 text-xs p-1 rounded">
                    2 PM: Available
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded">
                    4 PM: Team Coaching - Alpha
                  </div>
                </div>
              </div>

              {/* Wednesday */}
              <div className="border border-blue-200 bg-blue-50 min-h-[160px] p-2">
                <div className="text-sm font-medium text-blue-900 mb-2">20 (Today)</div>
                <div className="space-y-1">
                  <div className="bg-purple-200 text-purple-900 text-xs p-1 rounded font-medium">
                    10 AM: Available
                  </div>
                  <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded">
                    1 PM: Weekly Planning
                  </div>
                  <div className="bg-purple-200 text-purple-900 text-xs p-1 rounded font-medium">
                    3 PM: Available
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 text-xs p-1 rounded">
                    5 PM: AI Suggested - Jordan
                  </div>
                </div>
              </div>

              {/* Thursday */}
              <div className="border border-gray-200 min-h-[160px] p-2">
                <div className="text-sm font-medium text-gray-900 mb-2">21</div>
                <div className="space-y-1">
                  <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded">
                    10 AM: Team Beta Review
                  </div>
                  <div className="bg-green-100 text-green-800 text-xs p-1 rounded">
                    3 PM: Skill Dev - Sarah C.
                  </div>
                  <div className="bg-gray-100 text-gray-600 text-xs p-1 rounded">
                    Auto-suggested slot
                  </div>
                </div>
              </div>

              {/* Friday */}
              <div className="border border-gray-200 min-h-[160px] p-2">
                <div className="text-sm font-medium text-gray-900 mb-2">22</div>
                <div className="space-y-1">
                  <div className="bg-purple-100 text-purple-800 text-xs p-1 rounded">
                    9 AM: MR Session Review
                  </div>
                  <div className="bg-green-100 text-green-800 text-xs p-1 rounded">
                    3 PM: Expert Panel Prep
                  </div>
                </div>
              </div>

              {/* Weekend */}
              <div className="border border-gray-200 min-h-[160px] p-2 bg-gray-50">
                <div className="text-sm font-medium text-gray-500 mb-2">23</div>
                <div className="text-xs text-gray-400">Weekend</div>
              </div>
              <div className="border border-gray-200 min-h-[160px] p-2 bg-gray-50">
                <div className="text-sm font-medium text-gray-500 mb-2">24</div>
                <div className="text-xs text-gray-400">Weekend</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Automated Bookings */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent AI-Scheduled Meetings</h3>
            <p className="text-sm text-gray-600">Meetings automatically created based on triggers and interventions</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Emergency API Support - Team Gamma</h4>
                      <p className="text-sm text-gray-600">Triggered by: Urgent help request + demo deadline</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Confirmed</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">When</p>
                    <p className="font-medium">Today 2:00 PM (15 min)</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Attendees</p>
                    <p className="font-medium">Taylor B., Prof. Davis, Tech Coach</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Auto-Generated</p>
                    <div className="flex space-x-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Agenda</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Pre-call</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Expert Appreciation Call - James Wilson</h4>
                      <p className="text-sm text-gray-600">Triggered by: Engagement drop + feedback pattern analysis</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">When</p>
                    <p className="font-medium">Tomorrow 11:00 AM (20 min)</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Attendees</p>
                    <p className="font-medium">James W., Prof. Davis</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Auto-Generated</p>
                    <div className="flex space-x-1">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Thank you</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 