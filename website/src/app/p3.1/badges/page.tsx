export default function BadgesPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Triggers</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
            Add
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            Edit
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            Users
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
            Delete
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-teal-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-teal-800">Did you know?</h3>
            <p className="text-sm text-teal-700 mt-1">
              Triggers are sets of rules that are used to determine when a badge is earned and can also be used to unlock or reveal activities.
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button className="text-teal-400 hover:text-teal-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <input
            type="text"
            placeholder="Search triggers"
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-80"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Triggers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rules
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Users
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              <TriggerRow
                name="M1 + 5: Unhide Leadership Booster"
                rules={1}
                users={5}
              />
              <TriggerRow
                name="M1 + 5: Unhide Problem Solving Booster"
                rules={1}
                users={3}
              />
              <TriggerRow
                name="M1 + 5: Unhide Innovation Booster"
                rules={1}
                users={1}
              />
              <TriggerRow
                name="M1 + 5: Unhide Service Orientation Booster"
                rules={1}
                users={1}
              />
              <TriggerRow
                name="M1 + 5: Unhide Collaboration Booster"
                rules={1}
                users={3}
              />
              <TriggerRow
                name="M1 + 5: Unhide Culturally Intelligent Booster"
                rules={1}
                users={0}
              />
              <TriggerRow
                name="M1: Unlock Example"
                rules={1}
                users={10}
              />
              <TriggerRow
                name="M3: Unlock Week 1"
                rules={1}
                users={0}
                hasError
              />
              <TriggerRow
                name="M3: Unlock Feedback Management"
                rules={1}
                users={10}
              />
              <TriggerRow
                name="M4: Unlock Final Report"
                rules={1}
                users={10}
              />
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
              <span className="font-medium">13</span> entries
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-teal-600 text-white rounded text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">
                2
              </button>
              <button className="px-3 py-1 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TriggerRow({
  name,
  rules,
  users,
  hasError = false
}: {
  name: string;
  rules: number;
  users: number;
  hasError?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <input type="checkbox" className="rounded border-slate-300" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <span className="text-sm font-medium text-slate-900">{name}</span>
          {hasError && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              1 rule ⚠
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-sm text-slate-900">{rules} rule</span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-sm text-slate-900">
          {users > 0 ? `${users} users` : '-'}
        </span>
      </td>
    </tr>
  )
} 