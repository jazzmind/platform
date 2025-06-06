export default function UsersPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Message...
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button className="border-b-2 border-teal-500 py-2 px-1 text-sm font-medium text-teal-600">
            Users
          </button>
          <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300">
            Teams
          </button>
        </nav>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Add
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Edit
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Access
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Delete
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users"
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex items-center space-x-2">
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option>Role (all)</option>
              </select>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option>Status (all)</option>
              </select>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option>Engaged (all)</option>
              </select>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option>Confident (all)</option>
              </select>
              <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option>Happy (all)</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Engaged
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  On-Track
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Confident
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              <UserRow
                name="Julian Manansala"
                email="jm@test.com"
                teams={["Hackivores"]}
                progress={31}
                progressDetails="2/2"
                engaged="Yes"
                onTrack="No Data"
                confident="No Data"
                status="active"
              />
              <UserRow
                name="Shanin Tajbakhsh"
                email="st@test.com"
                teams={["Hackivores"]}
                progress={0}
                progressDetails="invite sent"
                engaged=""
                onTrack=""
                confident=""
                status="invited"
              />
              <UserRow
                name="Leesha Davis"
                email="ld@test.com"
                teams={["Right Hats"]}
                progress={90}
                progressDetails="5/2"
                engaged="Yes"
                onTrack="No Data"
                confident="No Data"
                status="active"
              />
              <UserRow
                name="Wes Sonnenreich"
                email="ws@test.com"
                teams={["Cyber Sleuths", "Hackivores", "Right Hats"]}
                progress={0}
                progressDetails=""
                engaged="Yes"
                onTrack="No Data"
                confident="No Data"
                status="active"
              />
              <UserRow
                name="Andrew Boivin"
                email="ab@test.com"
                teams={["Hackivores"]}
                progress={90}
                progressDetails="5/2"
                engaged="Yes"
                onTrack="No Data"
                confident="No Data"
                status="active"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UserRow({
  name,
  email,
  teams,
  progress,
  progressDetails,
  engaged,
  onTrack,
  confident,
  status
}: {
  name: string;
  email: string;
  teams: string[];
  progress: number;
  progressDetails: string;
  engaged: string;
  onTrack: string;
  confident: string;
  status: 'active' | 'invited';
}) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <input type="checkbox" className="rounded border-slate-300" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-sm font-medium text-green-800">
                {name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-slate-900 flex items-center">
              {name} {email}
              <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {teams.map((team, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800"
            >
              {team}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {status === 'invited' ? (
          <div className="text-sm text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">invite sent</span>
              <button className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">remind</button>
              <button className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">activate</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center">
              <div className="w-16 bg-slate-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-slate-900">{progress}%</span>
            </div>
            {progressDetails && (
              <div className="text-xs text-slate-500 mt-1">{progressDetails}</div>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {engaged && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {engaged}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
        {onTrack}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
        {confident}
      </td>
    </tr>
  )
} 