import Link from 'next/link'

export default function ProjectsPage() {
  return (
    <div className="p-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Project Scaffolding</h2>
            <p className="text-gray-600">Conversational project creation with SMART goals and auto-decomposition</p>
          </div>
          <Link href="/p3/projects/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Create New Project
          </Link>
        </div>


        {/* Current Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Projects */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
              <p className="text-sm text-gray-600">Projects with AI-generated scaffolding</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Project 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">AI Solutions for Local Business</h4>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">On Track</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Software Engineering • 6 teams • Week 3 of 8</p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-gray-600">Business Problem Analysis</span>
                      <span className="ml-auto text-green-600">Complete</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-gray-600">AI Solution Design</span>
                      <span className="ml-auto text-blue-600">In Progress</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                      <span className="text-gray-600">Prototype Development</span>
                      <span className="ml-auto text-gray-400">Pending</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">AI Insights: 3 teams ahead of schedule</span>
                    <Link href="/p3/projects/ai-business" className="text-blue-600 hover:text-blue-500">View Details</Link>
                  </div>
                </div>

                {/* Project 2 */}
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">UX Design Challenge</h4>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Needs Attention</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Design Thinking • 4 teams • Week 5 of 6</p>
                  
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">AI Alert: User Testing Delayed</p>
                        <p className="text-xs text-gray-600">2 teams haven&apos;t scheduled user testing sessions. Suggest intervention.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Adaptive checkpoint recommended</span>
                    <Link href="/p3/projects/ux-challenge" className="text-blue-600 hover:text-blue-500">Intervene</Link>
                  </div>
                </div>

                {/* Project 3 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">Leadership Development MR</h4>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">MR Active</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Executive Leadership • 12 participants • Week 2 of 4</p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">MR Scenarios:</span> 8 completed, 4 in progress
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Avg Score:</span> 7.8/10 (+0.9 from baseline)
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Skills velocity: +23% this week</span>
                    <Link href="/p3/projects/leadership-mr" className="text-blue-600 hover:text-blue-500">View MR Data</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Task Decomposition AI */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-6 9l2 2 4-4" />
                </svg>
                Task Decomposition AI
              </h3>
              <p className="text-sm text-gray-600">Auto-created Kanban with owners and due dates</p>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">AI Business Solutions Project - Auto-Generated Tasks</h4>
                
                <div className="space-y-3">
                  {/* Week 1 Tasks */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Week 1: Discovery & Research</h5>
                    <div className="space-y-2 ml-4">
                      <div className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <span>Identify 3 local businesses</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Team Lead</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Done</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <span>Conduct initial interviews</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">All Members</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">In Progress</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Week 2 Tasks */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Week 2: Problem Analysis</h5>
                    <div className="space-y-2 ml-4">
                      <div className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <span>Map business pain points</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Data Analyst</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">In Progress</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <span>Research AI solutions</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Tech Lead</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adaptive Checkpoint */}
                  <div className="border-l-4 border-blue-400 bg-blue-50 p-3">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">AI Adaptive Checkpoint</p>
                        <p className="text-xs text-blue-700">Team Delta is progressing faster than expected. AI suggests adding advanced task: &quot;Competitive AI analysis&quot; to maintain optimal challenge level.</p>
                        <button className="mt-2 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200">Add Suggested Task</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Link href="/p3/projects/ai-business/tasks" className="text-sm text-blue-600 hover:text-blue-500">
                  View Full Kanban Board →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Project Templates */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">AI-Optimized Project Templates</h3>
            <p className="text-sm text-gray-600">Pre-built scaffolding for common project types</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <h4 className="font-medium text-gray-900">Software Development</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">Full-stack application with agile methodology and code review checkpoints</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">8-12 weeks • 4-6 members</span>
                  <button className="text-xs text-blue-600 hover:text-blue-500">Use Template</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  <h4 className="font-medium text-gray-900">Design Thinking</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">User-centered design process with rapid prototyping and testing cycles</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">6-8 weeks • 3-5 members</span>
                  <button className="text-xs text-blue-600 hover:text-blue-500">Use Template</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h4 className="font-medium text-gray-900">Business Strategy</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">Market analysis, business model design, and validation with real stakeholders</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">10-14 weeks • 4-7 members</span>
                  <button className="text-xs text-blue-600 hover:text-blue-500">Use Template</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Builder Preview */}
        <div className="bg-white rounded-lg shadow mt-8 mb-8">
         <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Project Brief Builder
            </h3>
            <p className="text-sm text-gray-600">Turn vague ideas into SMART goals aligned with rubrics and timelines</p>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">I can help you create a comprehensive project brief. Let&apos;s start with your initial idea:</p>
                  <div className="bg-white border rounded-lg p-3">
                    <p className="text-sm text-gray-600 italic">&quot;I want my students to build something with AI that could help local businesses&quot;</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-3">Great! I&apos;ve analyzed your idea and can suggest this structured project:</p>
                  
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Project Title</h4>
                      <p className="text-sm text-gray-700">&quot;AI Solutions for Local Business Challenges&quot;</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">SMART Objectives</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• <strong>Specific:</strong> Develop AI-powered solution addressing real local business challenge</li>
                        <li>• <strong>Measurable:</strong> Demonstrate 20% efficiency improvement or cost reduction</li>
                        <li>• <strong>Achievable:</strong> Use accessible AI tools and frameworks</li>
                        <li>• <strong>Relevant:</strong> Aligned with course outcomes on practical AI application</li>
                        <li>• <strong>Time-bound:</strong> 8-week project with 2-week milestones</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Suggested Skills Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Problem Analysis</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">AI Implementation</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Business Validation</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">User Research</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-3">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Accept & Generate Tasks</button>
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50">Refine Further</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

    </div>
  )
} 