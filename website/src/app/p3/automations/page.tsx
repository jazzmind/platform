import Link from 'next/link'

export default function AutomationsPage() {
  return (
    <div className="p-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Automation Engine</h2>
            <p className="text-gray-600">Natural language rule creation with effectiveness tracking and approval workflows</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/p3/automations/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create Automation
            </Link>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
              Import Template
            </button>
          </div>
        </div>

        {/* Automation Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-2xl font-semibold text-gray-900">23</p>
                <p className="text-xs text-green-600">3 added this week</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actions Fired</p>
                <p className="text-2xl font-semibold text-gray-900">156</p>
                <p className="text-xs text-blue-600">This week</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Effectiveness</p>
                <p className="text-2xl font-semibold text-gray-900">87%</p>
                <p className="text-xs text-purple-600">Issues resolved</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
                <p className="text-xs text-orange-600">Review required</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Automations */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Active Automations</h3>
              <div className="flex items-center space-x-2">
                <select className="text-sm border border-gray-300 rounded px-2 py-1">
                  <option>All Categories</option>
                  <option>Engagement</option>
                  <option>Quality</option>
                  <option>Timeliness</option>
                  <option>Team Dynamics</option>
                </select>
                <button className="text-sm text-blue-600 hover:text-blue-500">View Analytics</button>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {/* Weekly Progress Reminder */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Weekly Progress Reminder</h4>
                    <p className="text-sm text-gray-600 mt-1">Automatically reminds teams to submit progress reports every Friday at 3 PM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">TRIGGER</p>
                  <p className="text-sm text-gray-900">Every Friday 3 PM + No submission this week</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">ACTION</p>
                  <p className="text-sm text-gray-900">Email + Chat reminder → Escalate Monday if no response</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
                <div>
                  <p className="font-medium text-gray-900">12</p>
                  <p className="text-gray-600 text-xs">Times fired</p>
                </div>
                <div>
                  <p className="font-medium text-green-600">92%</p>
                  <p className="text-gray-600 text-xs">Response rate</p>
                </div>
                <div>
                  <p className="font-medium text-blue-600">2.3h</p>
                  <p className="text-gray-600 text-xs">Avg response time</p>
                </div>
                <div>
                  <p className="font-medium text-purple-600">85%</p>
                  <p className="text-gray-600 text-xs">Issue resolved</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Edit Rule</button>
                <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">View History</button>
                <button className="text-xs text-red-600 hover:text-red-500">Pause</button>
              </div>
            </div>

            {/* Expert Feedback Reminder */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Expert Feedback Reminder</h4>
                    <p className="text-sm text-gray-600 mt-1">Gentle nudges to industry experts when feedback is overdue</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">TRIGGER</p>
                  <p className="text-sm text-gray-900">48h past deadline + No feedback submitted</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">ACTION</p>
                  <p className="text-sm text-gray-900">Polite email reminder + Thank you note template</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
                <div>
                  <p className="font-medium text-gray-900">15</p>
                  <p className="text-gray-600 text-xs">Times fired</p>
                </div>
                <div>
                  <p className="font-medium text-green-600">87%</p>
                  <p className="text-gray-600 text-xs">Response rate</p>
                </div>
                <div>
                  <p className="font-medium text-blue-600">1.8h</p>
                  <p className="text-gray-600 text-xs">Avg response time</p>
                </div>
                <div>
                  <p className="font-medium text-purple-600">91%</p>
                  <p className="text-gray-600 text-xs">Feedback completed</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Edit Rule</button>
                <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">View Templates</button>
                <button className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200">Duplicate</button>
              </div>
            </div>

            {/* Quality Alert - Manual Approval */}
            <div className="p-6 bg-orange-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Low Quality Work Alert</h4>
                    <p className="text-sm text-gray-600 mt-1">Flags deliverables with expert ratings below 6/10 for immediate coaching</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Manual Approval</span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-orange-100 border border-orange-200 rounded p-3 mb-4">
                <p className="text-sm font-medium text-orange-800 mb-2">⏳ Pending Your Approval (2 actions)</p>
                <div className="space-y-2 text-sm text-orange-700">
                  <p>• Team Beta&apos;s prototype rated 5/10 by expert Maria - schedule coaching session?</p>
                  <p>• Jordan Lee&apos;s individual work shows quality decline - intervention needed?</p>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">Review Pending (2)</button>
                  <button className="text-xs bg-white text-orange-600 px-3 py-1 rounded border border-orange-300 hover:bg-orange-50">Approve All</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
                <div>
                  <p className="font-medium text-gray-900">8</p>
                  <p className="text-gray-600 text-xs">Times triggered</p>
                </div>
                <div>
                  <p className="font-medium text-orange-600">75%</p>
                  <p className="text-gray-600 text-xs">Actions approved</p>
                </div>
                <div>
                  <p className="font-medium text-blue-600">4.2h</p>
                  <p className="text-gray-600 text-xs">Avg approval time</p>
                </div>
                <div>
                  <p className="font-medium text-purple-600">67%</p>
                  <p className="text-gray-600 text-xs">Quality improved</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">Edit Rule</button>
                <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">Change to Auto</button>
                <button className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200">Set Approval Delegate</button>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Analytics */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Automation Effectiveness</h3>
            <p className="text-sm text-gray-600">Performance metrics showing how automations are improving outcomes</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Time Savings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Time Saved This Month</h4>
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-blue-600">23.5h</span>
                  </div>
                  <p className="text-sm text-gray-600">Equivalent to 58% FTE reduction in manual tasks</p>
                </div>
              </div>

              {/* Issue Prevention */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Issues Prevented</h4>
                <div className="text-center">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-green-600">47</span>
                  </div>
                  <p className="text-sm text-gray-600">Problems caught before escalation needed</p>
                </div>
              </div>

              {/* Response Improvement */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Response Time Improvement</h4>
                <div className="text-center">
                  <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-purple-600">43%</span>
                  </div>
                  <p className="text-sm text-gray-600">Faster than manual intervention</p>
                </div>
              </div>

              
            </div>

            
          </div>

          
        </div>

        {/* AI Builder Chat Interface */}
        <div className="bg-white rounded-lg shadow mt-8 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Automation Builder
            </h3>
            <p className="text-sm text-gray-600">Describe what you want to automate in natural language</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">AI</span>
                </div>
                <div className="flex-1">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">Hi! I can help you create automation rules. What would you like to automate today?</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm">You</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm text-gray-900">I want to automatically send a gentle reminder to experts who haven&apos;t provided feedback within 48 hours of the deadline</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">AI</span>
                </div>
                <div className="flex-1">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900 mb-3">Perfect! I&apos;ll create an expert feedback reminder automation. Here&apos;s what I understand:</p>
                    
                    <div className="bg-white rounded p-3 text-sm space-y-2 border">
                      <div><strong>Trigger:</strong> 48 hours past feedback deadline + No feedback submitted</div>
                      <div><strong>Action:</strong> Send polite email reminder with thank you message</div>
                      <div><strong>Tone:</strong> Appreciative and supportive (not demanding)</div>
                      <div><strong>Follow-up:</strong> Escalate to you if no response after 7 days</div>
                      <div><strong>Recipients:</strong> Industry experts only</div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <button className="bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700">Create Rule</button>
                      <button className="border border-gray-300 text-gray-700 px-3 py-2 text-sm rounded hover:bg-gray-50">Modify Details</button>
                      <button className="text-sm text-gray-600 hover:text-gray-800">Start Over</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Popular Automation Ideas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button className="text-left text-sm bg-gray-50 hover:bg-gray-100 p-3 rounded transition-colors">
                  &quot;Schedule team check-ins when conflict scores are high&quot;
                </button>
                <button className="text-left text-sm bg-gray-50 hover:bg-gray-100 p-3 rounded transition-colors">
                  &quot;Send congratulations when students reach skill milestones&quot;
                </button>
                <button className="text-left text-sm bg-gray-50 hover:bg-gray-100 p-3 rounded transition-colors">
                  &quot;Alert me when project quality drops below acceptable levels&quot;
                </button>
                <button className="text-left text-sm bg-gray-50 hover:bg-gray-100 p-3 rounded transition-colors">
                  &quot;Remind students about IP agreements when uploading files&quot;
                </button>
              </div>
            </div>
          </div>
        </div>

    </div>
  )
} 