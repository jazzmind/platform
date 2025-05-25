interface Package {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  registrationType: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  packageId?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RolesManagerProps {
  roles: Role[];
  packages: Package[];
  onRolesChange: () => void;
}

export default function RolesManager({ roles, packages, onRolesChange }: RolesManagerProps) {
  const systemRoles = roles.filter(role => role.isSystemRole);
  const packageRoles = roles.filter(role => !role.isSystemRole);
  
  const getPackageName = (packageId?: string) => {
    if (!packageId) return 'System';
    const pkg = packages.find(p => p.id === packageId);
    return pkg?.displayName || 'Unknown Package';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Role Management</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {roles.length} total roles
        </div>
      </div>

      {/* System Roles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">System Roles</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Global roles that apply across all packages
          </p>
        </div>
        <div className="p-6">
          {systemRoles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No system roles found
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemRoles.map((role) => (
                <div key={role.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {role.displayName}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {role.description || 'No description available'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Role: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{role.name}</code></span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          role.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Package Roles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Package Roles</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Package-specific roles with defined permissions
          </p>
        </div>
        <div className="p-6">
          {packageRoles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No package roles found
            </p>
          ) : (
            <div className="space-y-6">
              {packages.map((pkg) => {
                const pkgRoles = packageRoles.filter(role => role.packageId === pkg.id);
                if (pkgRoles.length === 0) return null;
                
                return (
                  <div key={pkg.id}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-600 rounded"></div>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {pkg.displayName} ({pkgRoles.length} roles)
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-6">
                      {pkgRoles.map((role) => (
                        <div key={role.id} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {role.displayName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {role.description || 'No description available'}
                          </p>
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Role: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{role.name}</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                role.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {role.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(role.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Role Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Role Statistics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {systemRoles.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">System Roles</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {packageRoles.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Package Roles</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {roles.filter(r => r.isActive).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active Roles</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {packages.filter(p => packageRoles.some(r => r.packageId === p.id)).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Packages with Roles</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 