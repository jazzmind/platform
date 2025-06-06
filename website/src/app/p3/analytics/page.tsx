export default function AnalyticsPage() {
  return (
    <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning Velocity Analytics</h2>
          <p className="text-gray-600">Skills-as-trajectory feedback with real-time velocity tracking and intervention recommendations</p>
        </div>

        {/* Velocity Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Velocity Score</p>
                <p className="text-2xl font-semibold text-gray-900">7.2</p>
                <p className="text-xs text-green-600">↑ 1.3 this week</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accelerating Learners</p>
                <p className="text-2xl font-semibold text-gray-900">23</p>
                <p className="text-xs text-blue-600">38% of cohort</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">At-Risk Learners</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
                <p className="text-xs text-orange-600">Need intervention</p>
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
                <p className="text-sm font-medium text-gray-600">MR Integration</p>
                <p className="text-2xl font-semibold text-gray-900">89%</p>
                <p className="text-xs text-purple-600">Activity captured</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cohort Heat Map */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cohort Skills Heat Map</h3>
              <p className="text-sm text-gray-600">Real-time view of who&apos;s accelerating or plateauing</p>
            </div>
            <div className="p-6">
              {/* Skills Legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Problem Solving</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Collaboration</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Technical Skills</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Communication</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Leadership</span>
              </div>

              {/* Heat Map Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Student</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Problem<br/>Solving</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Collaboration</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Technical<br/>Skills</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Communication</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-900 text-xs">Leadership</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-900">Velocity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">Sarah Chen</td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.5/10 (+1.2)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-500 rounded mx-auto" title="9.1/10 (+0.8)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.2/10 (+1.5)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded mx-auto" title="6.8/10 (+0.4)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.5/10 (+0.9)"></div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">+32%</span>
                      </td>
                    </tr>
                    
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">Alex Kumar</td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.8/10 (+0.6)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.2/10 (+1.0)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-500 rounded mx-auto" title="9.0/10 (+1.3)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.4/10 (+0.7)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.0/10 (+1.1)"></div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">+28%</span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">Jordan Lee</td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded mx-auto" title="6.5/10 (+0.3)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.1/10 (+0.5)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded mx-auto" title="6.8/10 (+0.2)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.1/10 (+0.8)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded mx-auto" title="6.9/10 (+0.4)"></div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">+18%</span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-gray-50 bg-red-50">
                      <td className="py-2 px-3 font-medium">Taylor Brooks</td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-red-400 rounded mx-auto" title="4.2/10 (-0.1)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-orange-400 rounded mx-auto" title="5.8/10 (+0.1)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-red-400 rounded mx-auto" title="4.5/10 (-0.2)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-orange-400 rounded mx-auto" title="5.2/10 (+0.0)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-red-400 rounded mx-auto" title="4.8/10 (-0.1)"></div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">-5%</span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">Morgan Davis</td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.0/10 (+0.9)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.5/10 (+0.6)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.3/10 (+1.1)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-green-400 rounded mx-auto" title="8.1/10 (+0.8)"></div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="w-6 h-6 bg-blue-400 rounded mx-auto" title="7.2/10 (+0.7)"></div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">+25%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                    <span>Excellent (8-10)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded mr-1"></div>
                    <span>Good (6-8)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded mr-1"></div>
                    <span>Developing (4-6)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-400 rounded mr-1"></div>
                    <span>Needs Support (&lt;4)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Velocity Trends & Interventions */}
          <div className="space-y-6">
            {/* Velocity Sparklines */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Velocity Trends</h3>
                <p className="text-sm text-gray-600">Weekly skill improvement rates</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">Problem Solving</span>
                      <span className="text-sm text-green-600">+24%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">23 students improving</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">Collaboration</span>
                      <span className="text-sm text-blue-600">+19%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '68%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">18 students improving</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">Technical Skills</span>
                      <span className="text-sm text-purple-600">+16%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '62%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">15 students improving</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">Communication</span>
                      <span className="text-sm text-orange-600">+12%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{width: '48%'}}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">12 students improving</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Intervention Recommendations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">AI Interventions</h3>
                <p className="text-sm text-gray-600">Recommended actions for optimal learning</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-red-400 bg-red-50 p-3">
                    <h4 className="text-sm font-medium text-red-800">Critical: Taylor Brooks</h4>
                    <p className="text-sm text-red-700 mt-1">Negative velocity in 3 skills. Recommend 1:1 mentoring session and skill diagnostic.</p>
                    <button className="mt-2 text-xs bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200">Schedule Intervention</button>
                  </div>

                  <div className="border-l-4 border-yellow-400 bg-yellow-50 p-3">
                    <h4 className="text-sm font-medium text-yellow-800">Opportunity: Sarah Chen</h4>
                    <p className="text-sm text-yellow-700 mt-1">Exceptional velocity. Consider peer mentoring role or advanced challenges.</p>
                    <button className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200">Create Advanced Path</button>
                  </div>

                  <div className="border-l-4 border-blue-400 bg-blue-50 p-3">
                    <h4 className="text-sm font-medium text-blue-800">Pattern: Communication Skills</h4>
                    <p className="text-sm text-blue-700 mt-1">Cohort-wide slow progress. Consider MR communication scenarios or group workshops.</p>
                    <button className="mt-2 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">Deploy MR Scenario</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Data Sources</h3>
                <p className="text-sm text-gray-600">Multi-modal learning evidence</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16M17 4v16m0 0H7m10 0v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2" />
                      </svg>
                      <span className="text-sm text-gray-900">Meeting Transcripts</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">1,247 analyzed</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-900">Document Activity</span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">892 events</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-900">MR Scenarios</span>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">156 completed</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-gray-900">Expert Feedback</span>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">43 reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Student View */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Individual Student Dashboard Preview</h3>
            <p className="text-sm text-gray-600">What students see in their self-regulated learning interface</p>
          </div>
          <div className="p-6 bg-gray-50">
            <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-900">Sarah Chen&apos;s Learning Dashboard</h4>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Velocity: +32%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weakest Skill Spotlight */}
                <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
                  <h5 className="font-medium text-orange-800 mb-2">🎯 Focus Area: Communication</h5>
                  <p className="text-sm text-orange-700 mb-3">Your communication skills are improving but could use more attention.</p>
                  <div className="space-y-2">
                    <button className="block w-full bg-orange-100 text-orange-800 text-sm py-2 px-3 rounded hover:bg-orange-200">
                      Practice MR Presentation Scenario
                    </button>
                    <button className="block w-full bg-orange-100 text-orange-800 text-sm py-2 px-3 rounded hover:bg-orange-200">
                      Join Peer Feedback Circle
                    </button>
                  </div>
                </div>

                {/* Velocity Sparklines */}
                <div className="bg-blue-50 p-4 rounded">
                  <h5 className="font-medium text-blue-800 mb-3">📈 Your Skill Velocity</h5>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Problem Solving</span>
                        <span className="text-green-600">+35%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: '88%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technical Skills</span>
                        <span className="text-green-600">+28%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '72%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Communication</span>
                        <span className="text-orange-600">+12%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{width: '45%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">🎬 Recent Evidence</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• <strong>Meeting Bot captured:</strong> Led technical discussion in team standup (+Problem Solving)</p>
                  <p>• <strong>GitHub activity:</strong> Reviewed 3 PRs with constructive feedback (+Collaboration)</p>
                  <p>• <strong>MR scenario:</strong> Completed conflict resolution with 8.2/10 score (+Leadership)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
} 