export default function r2dtax() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            r2dtax
          </h1>
          <p className="text-xl text-gray-600">
            R&D Tax Documentation Management System
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">📝 Narrative Builder</h3>
            <p className="text-gray-600">
              Build comprehensive R&D tax narratives from your project activities and documentation.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">📅 Project Planning</h3>
            <p className="text-gray-600">
              Create month-by-month project plans and track activities against your R&D objectives.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">⏱️ Time Tracking</h3>
            <p className="text-gray-600">
              Track time spent on R&D activities with comprehensive audit trails for compliance.
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚧 Development Status - Phase 1
          </h3>
          <p className="text-blue-800 mb-4">
            Core project and activity management foundation is in development.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm">Database schema and models</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm">Project management API</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm">Activity documentation API</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-sm">Basic web interface (in progress)</span>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">API Endpoints Available</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-green-700 mb-2">✅ Projects API</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>GET /api/projects - List projects</li>
                <li>POST /api/projects - Create project</li>
                <li>GET /api/projects/[id] - Get project</li>
                <li>PUT /api/projects/[id] - Update project</li>
                <li>DELETE /api/projects/[id] - Delete project</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-green-700 mb-2">✅ Activities API</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>GET /api/projects/[id]/activities - List activities</li>
                <li>POST /api/projects/[id]/activities - Create activity</li>
                <li>Support for core & supporting activities</li>
                <li>Hypothesis, experiments, results tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Next Phase: Knowledge Base Integration</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Integrate with knowledgebase package for document processing</li>
            <li>Implement evidence management and linking</li>
            <li>Add document upload and storage capabilities</li>
            <li>Build search and retrieval functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
