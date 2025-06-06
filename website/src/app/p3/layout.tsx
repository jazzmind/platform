import Link from 'next/link'

export default function P3Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Practera</h1>
          <p className="text-sm text-gray-600 mt-1">Educator Workspace 2.0</p>
          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">AI-First</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <NavLink href="/p3" icon="🏠" label="Dashboard" />
            <NavLink href="/p3/projects" icon="🚀" label="Projects" />
            <NavLink href="/p3/analytics" icon="📊" label="Analytics" />
            <NavLink href="/p3/capture" icon="🎯" label="Capture Hub" />
            <NavLink href="/p3/mr" icon="🥽" label="MR Ready" />
            <NavLink href="/p3/inbox" icon="📬" label="Unified Inbox" />
            <NavLink href="/p3/scheduler" icon="📅" label="Scheduler" />
            <NavLink href="/p3/automations" icon="⚡" label="Automations" />
          </div>

          {/* Quick Stats */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Projects</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Learning Velocity</span>
                <span className="font-medium text-green-600">+25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">AI Insights</span>
                <span className="font-medium text-orange-600">23</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">PD</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Prof. Davis</p>
              <p className="text-xs text-gray-600">Educator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
} 