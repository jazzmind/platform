interface Package {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  registrationType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PackagesManagerProps {
  packages: Package[];
  onPackagesChange: () => void;
}

export default function PackagesManager({ packages, onPackagesChange }: PackagesManagerProps) {
  const getRegistrationTypeColor = (type: string) => {
    switch (type) {
      case 'SELF_REGISTER':
        return 'bg-green-100 text-green-800';
      case 'APPROVAL_REQUIRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ADMIN_ONLY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRegistrationType = (type: string) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Package Management</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {packages.length} total packages
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No packages found</h3>
            <p className="text-gray-500 dark:text-gray-400">Initialize the authorization system to create default packages.</p>
          </div>
        ) : (
          packages.map((pkg) => (
            <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${pkg.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {pkg.displayName}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {pkg.description || 'No description available'}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Package Name:</span>
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {pkg.name}
                      </code>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Registration:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRegistrationTypeColor(pkg.registrationType)}`}>
                        {formatRegistrationType(pkg.registrationType)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(pkg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <button
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    onClick={() => {/* TODO: View package details */}}
                  >
                    View Details
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    onClick={() => {/* TODO: Edit package */}}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Package Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Package Statistics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {packages.filter(p => p.registrationType === 'SELF_REGISTER').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Self-Register Packages</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {packages.filter(p => p.registrationType === 'APPROVAL_REQUIRED').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Approval Required</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {packages.filter(p => p.registrationType === 'ADMIN_ONLY').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Admin Only</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 