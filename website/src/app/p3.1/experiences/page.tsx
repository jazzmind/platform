export default function ExperiencesPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Experiences</h1>
          <div className="flex items-center space-x-6 mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">9</div>
              <div className="text-sm text-slate-600 flex items-center">
                Live experiences
                <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">8%</div>
              <div className="text-sm text-slate-600 flex items-center">
                Recently active registered learners and experts
                <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">22/125</div>
              <div className="text-sm text-slate-600 flex items-center">
                Feedback loops completed
                <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">47%</div>
              <div className="text-sm text-slate-600 flex items-center">
                Feedback quality score
                <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            Download Data
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            Add Experience
          </button>
        </div>
      </div>

      {/* My Experiences Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">My experiences</h2>
          <button className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            + Add Experience
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Filter by tags</h3>
          <div className="flex flex-wrap gap-2">
            <FilterTag label="team project" count={7} />
            <FilterTag label="master" count={2} />
            <FilterTag label="internship" count={2} />
            <FilterTag label="mentoring" count={1} />
            <FilterTag label="other" count={1} />
            <FilterTag label="skills passport" count={1} />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Status</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                <option>All</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Type</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                <option>All</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Sort by</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                <option>Created Time</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Sort order</span>
            <button className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Experience Cards */}
        <div className="space-y-4">
          <ExperienceCard
            title="3 Week Industry Project: Micro"
            type="Team Project"
            status="Draft"
            description="This Digital Industry Project is a 3 week experience where teams of student consultants complete an industry report for a real world client with the..."
            participants={3}
            tags={["team project", "master"]}
          />
          <ExperienceCard
            title="Data Analytics Capstone Challenge"
            type="Team Project"
            status="Draft"
            description="This Digital Industry Project is a comprehensive experience where teams of student consultants complete an analytical report for a real world..."
            participants={0}
            tags={["team project", "master"]}
          />
        </div>
      </div>
    </div>
  )
}

function FilterTag({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
      {label} {count}
    </span>
  )
}

function ExperienceCard({ 
  title, 
  type, 
  status, 
  description, 
  participants, 
  tags 
}: { 
  title: string; 
  type: string; 
  status: string; 
  description: string; 
  participants: number; 
  tags: string[]; 
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-teal-600 hover:text-teal-700 cursor-pointer">
              {title}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {status}
            </span>
          </div>
          
          <p className="text-slate-600 mb-4 line-clamp-2">
            {description}
            <button className="text-teal-600 hover:text-teal-700 ml-1">MORE</button>
          </p>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="text-sm text-slate-600">{participants}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="ml-4">
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
} 