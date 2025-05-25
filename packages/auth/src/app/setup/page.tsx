'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProviderStatus {
  google: boolean;
  microsoft: boolean;
  apple: boolean;
}

interface CredentialCheck {
  provider: string;
  status: 'checking' | 'valid' | 'invalid' | 'missing';
  error?: string;
  validationError?: string;
}

export default function SetupPage() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    google: false,
    microsoft: false,
    apple: false,
  });
  const [checks, setChecks] = useState<CredentialCheck[]>([
    { provider: 'google', status: 'checking' },
    { provider: 'microsoft', status: 'checking' },
    { provider: 'apple', status: 'checking' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupFor, setShowSetupFor] = useState<string | null>(null);

  useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    setIsLoading(true);
    setChecks([
      { provider: 'google', status: 'checking' },
      { provider: 'microsoft', status: 'checking' },
      { provider: 'apple', status: 'checking' },
    ]);
    
    try {
      // Make a server-side API call to check and validate credentials
      const response = await fetch('/api/auth/check-credentials');
      const data = await response.json();
      
      if (response.ok) {
        const newChecks: CredentialCheck[] = [];
        const newStatus: ProviderStatus = { google: false, microsoft: false, apple: false };
        
        // Process Google
        if (data.google.hasCredentials) {
          if (data.google.isValid) {
            newChecks.push({ provider: 'google', status: 'valid' });
            newStatus.google = true;
          } else {
            newChecks.push({ 
              provider: 'google', 
              status: 'invalid',
              error: 'Credentials invalid',
              validationError: data.google.error
            });
          }
        } else {
          newChecks.push({ 
            provider: 'google', 
            status: 'missing',
            error: 'Credentials not found'
          });
        }
        
        // Process Microsoft
        if (data.microsoft.hasCredentials) {
          if (data.microsoft.isValid) {
            newChecks.push({ provider: 'microsoft', status: 'valid' });
            newStatus.microsoft = true;
          } else {
            newChecks.push({ 
              provider: 'microsoft', 
              status: 'invalid',
              error: 'Credentials invalid',
              validationError: data.microsoft.error
            });
          }
        } else {
          newChecks.push({ 
            provider: 'microsoft', 
            status: 'missing',
            error: 'Credentials not found'
          });
        }
        
        // Process Apple
        if (data.apple.hasCredentials) {
          if (data.apple.isValid) {
            newChecks.push({ provider: 'apple', status: 'valid' });
            newStatus.apple = true;
          } else {
            newChecks.push({ 
              provider: 'apple', 
              status: 'invalid',
              error: 'Credentials invalid',
              validationError: data.apple.error
            });
          }
        } else {
          newChecks.push({ 
            provider: 'apple', 
            status: 'missing',
            error: 'Credentials not found'
          });
        }
        
        setChecks(newChecks);
        setProviderStatus(newStatus);
      } else {
        // Handle API error
        setChecks([
          { provider: 'google', status: 'invalid', error: 'Failed to check credentials' },
          { provider: 'microsoft', status: 'invalid', error: 'Failed to check credentials' },
          { provider: 'apple', status: 'invalid', error: 'Failed to check credentials' },
        ]);
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
      setChecks([
        { provider: 'google', status: 'invalid', error: 'Failed to check credentials' },
        { provider: 'microsoft', status: 'invalid', error: 'Failed to check credentials' },
        { provider: 'apple', status: 'invalid', error: 'Failed to check credentials' },
      ]);
    }
    
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-gray-600"></div>
        );
      case 'valid':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'invalid':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'missing':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checking': return 'Checking...';
      case 'valid': return 'Valid';
      case 'invalid': return 'Invalid';
      case 'missing': return 'Missing';
      default: return 'Unknown';
    }
  };

  const needsSetup = (check: CredentialCheck) => {
    return check.status === 'missing' || check.status === 'invalid';
  };

  const allValid = checks.every(check => check.status === 'valid');

  const renderGoogleSetup = () => (
    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
      <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center space-x-2">
        <span>🔍</span>
        <span>Google OAuth Setup</span>
      </h3>
      
      <div className="space-y-4 text-sm text-blue-700 dark:text-blue-300">
        <div>
          <h4 className="font-semibold mb-2">1. Create Google Cloud Project:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" className="underline">Google Cloud Console</a></li>
            <li>Create a new project or select existing project</li>
            <li>Enable the Google+ API</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">2. Configure OAuth Consent Screen:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to APIs & Services → OAuth consent screen</li>
            <li>Choose "External" user type</li>
            <li>Fill in required application information</li>
            <li>Add test users if in development</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">3. Create OAuth Credentials:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to APIs & Services → Credentials</li>
            <li>Click "Create Credentials" → "OAuth 2.0 Client ID"</li>
            <li>Choose "Web application"</li>
            <li>Add authorized redirect URI: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:3001/api/auth/callback/google</code></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">4. Environment Variables:</h4>
          <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded font-mono text-xs">
            GOOGLE_CLIENT_ID=your_client_id<br/>
            GOOGLE_CLIENT_SECRET=your_client_secret
          </div>
        </div>
      </div>
    </div>
  );

  const renderMicrosoftSetup = () => (
    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl">
      <h3 className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mb-4 flex items-center space-x-2">
        <span>🔷</span>
        <span>Microsoft Entra ID (Azure AD) Setup</span>
      </h3>
      
      <div className="space-y-4 text-sm text-indigo-700 dark:text-indigo-300">
        <div>
          <h4 className="font-semibold mb-2">1. Azure Portal Setup:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to <a href="https://portal.azure.com/" target="_blank" className="underline">Azure Portal</a></li>
            <li>Navigate to "Azure Active Directory" → "App registrations"</li>
            <li>Click "New registration"</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">2. App Registration:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name your application</li>
            <li>Select "Accounts in any organizational directory and personal Microsoft accounts"</li>
            <li>Add redirect URI: <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">http://localhost:3001/api/auth/callback/microsoft-entra-id</code></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">3. Client Secret:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to "Certificates & secrets"</li>
            <li>Click "New client secret"</li>
            <li>Set expiration and save the value immediately</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">4. Environment Variables:</h4>
          <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded font-mono text-xs">
            MICROSOFT_ENTRA_ID_CLIENT_ID=your_application_id<br/>
            MICROSOFT_ENTRA_ID_CLIENT_SECRET=your_client_secret<br/>
            MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/common/v2.0
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppleSetup = () => (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center space-x-2">
        <span>🍎</span>
        <span>Apple Sign In Setup</span>
      </h3>
      
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <h4 className="font-semibold mb-2">1. Apple Developer Account:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to <a href="https://developer.apple.com/" target="_blank" className="underline">Apple Developer Portal</a></li>
            <li>Sign in with your Apple Developer account</li>
            <li>Navigate to "Certificates, Identifiers & Profiles"</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">2. App ID Configuration:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create or select your App ID</li>
            <li>Enable "Sign In with Apple" capability</li>
            <li>Configure as primary App ID</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">3. Service ID Setup:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create a new Services ID</li>
            <li>Enable "Sign In with Apple"</li>
            <li>Configure domains and redirect URLs</li>
            <li>Add return URL: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">http://localhost:3001/api/auth/callback/apple</code></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">4. Private Key Generation:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Go to "Keys" section</li>
            <li>Create a new key with "Sign In with Apple" enabled</li>
            <li>Download the .p8 key file</li>
            <li>Note the Key ID</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">5. Environment Variables:</h4>
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-xs">
            APPLE_ID=your_services_id<br/>
            APPLE_SECRET=your_generated_jwt_secret
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Note: APPLE_SECRET requires generating a JWT using your private key, team ID, and key ID.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
      <div className="auth-card rounded-2xl p-8 max-w-4xl w-full shadow-2xl">
        {/* Top Navigation */}
        <div className="flex items-center justify-center relative mb-8">
          <Link href="/" className="btn-secondary absolute left-0">
            <span className="flex items-center space-x-2 flex-nowrap">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </span>
          </Link>
          
          <h1 className="text-2xl font-bold text-indigo-600">OAuth Setup</h1>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 auth-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Configure OAuth providers for authentication. Check credential status and follow setup instructions.
          </p>
        </div>

        {/* Status Overview */}
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Provider Status</h2>
            
            <button 
              onClick={checkCredentials}
              className="btn-primary flex flex-row items-center space-x-2 flex-nowrap whitespace-nowrap"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isLoading ? 'Checking...' : 'Recheck'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {checks.map((check) => (
              <div key={check.provider} className="p-4 bg-white dark:bg-gray-700 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-600">
                      {check.provider === 'google' && '🔍'}
                      {check.provider === 'microsoft' && '🔷'}
                      {check.provider === 'apple' && '🍎'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                        {check.provider}
                      </div>
                      <div className={`text-sm ${
                        check.status === 'valid' ? 'text-green-600' :
                        check.status === 'invalid' ? 'text-red-600' :
                        check.status === 'missing' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {getStatusText(check.status)}
                      </div>
                    </div>
                  </div>
                  {getStatusIcon(check.status)}
                </div>

           
                {/* Show setup button for missing or invalid providers */}
                {needsSetup(check) && (
                  <button
                    onClick={() => setShowSetupFor(showSetupFor === check.provider ? null : check.provider)}
                    className="w-full btn-secondary text-sm"
                  >
                    {showSetupFor === check.provider ? 'Hide Setup' : 'Setup Guide'}
                  </button>
                )}

                {/* Show validation error if invalid */}
                {check.status === 'invalid' && check.validationError && (
                  <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
                    <strong>Error:</strong> {check.validationError}
                  </div>
                )}

              </div>
            ))}
          </div>

          {allValid && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-800 dark:text-green-200 font-semibold">All providers configured successfully!</span>
              </div>
            </div>
          )}
        </div>

        {/* Setup Instructions - Show only for selected provider */}
        {showSetupFor && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Setup Instructions</h2>
            
            {showSetupFor === 'google' && renderGoogleSetup()}
            {showSetupFor === 'microsoft' && renderMicrosoftSetup()}
            {showSetupFor === 'apple' && renderAppleSetup()}
          </div>
        )}
      </div>
    </div>
  );
} 