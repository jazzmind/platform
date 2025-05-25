'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';
import Link from 'next/link';

interface PasskeyDevice {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
}

export default function Profile() {
  const { data: session, status } = useSession();
  const [supportsPasskeys, setSupportsPasskeys] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [passkeyDevices, setPasskeyDevices] = useState<PasskeyDevice[]>([]);
  const [isCheckingPasskey, setIsCheckingPasskey] = useState(true);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isRemovingPasskey, setIsRemovingPasskey] = useState<string | null>(null);
  const [passkeyStatus, setPasskeyStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddPasskey, setShowAddPasskey] = useState(false);

  // Check if browser supports passkeys
  useEffect(() => {
    const checkPasskeySupport = async () => {
      try {
        if (typeof window !== 'undefined' && 
            window.PublicKeyCredential && 
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupportsPasskeys(available);
        } else {
          setSupportsPasskeys(false);
        }
      } catch (error) {
        console.error('Error checking passkey support:', error);
        setSupportsPasskeys(false);
      }
    };

    checkPasskeySupport();
  }, []);

  // Check if user has a passkey registered and get device list
  useEffect(() => {
    const checkForPasskey = async () => {
      if (session?.user) {
        try {
          setIsCheckingPasskey(true);
          const response = await fetch('/api/auth/passkey/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: session.user.id,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setHasPasskey(data.hasPasskey);
            setPasskeyDevices(data.devices || []);
          } else {
            console.error('Failed to check passkey status');
          }
        } catch (error) {
          console.error('Error checking passkey status:', error);
        } finally {
          setIsCheckingPasskey(false);
        }
      }
    };

    if (status === 'authenticated') {
      checkForPasskey();
    }
  }, [session, status]);

  const registerPasskey = async () => {
    if (!session?.user?.id || !session?.user?.email) {
      setErrorMessage('User information is missing. Please sign in again.');
      return;
    }

    try {
      setIsRegisteringPasskey(true);
      setPasskeyStatus('registering');

      // 1. Request registration options from the server
      const optionsRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          username: session.user.name || session.user.email,
        }),
      });

      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsRes.json();

      // 2. Use SimpleWebAuthn browser library to handle the registration
      const attResp = await startRegistration(options.publicKey);

      // 3. Send the credential to the server for verification
      const verificationRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          credential: attResp,
        }),
      });

      if (!verificationRes.ok) {
        throw new Error('Failed to verify credential');
      }

      setPasskeyStatus('success');
      setHasPasskey(true);
      setShowAddPasskey(false);
      
      // Refresh the passkey list
      const checkResponse = await fetch('/api/auth/passkey/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        setPasskeyDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error registering passkey:', error);
      setPasskeyStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to register passkey');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const removePasskey = async (deviceId: string) => {
    if (!session?.user?.id) return;

    try {
      setIsRemovingPasskey(deviceId);
      const response = await fetch('/api/auth/passkey/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          deviceId: deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove passkey');
      }

      // Refresh the passkey list
      const checkResponse = await fetch('/api/auth/passkey/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        setHasPasskey(data.hasPasskey);
        setPasskeyDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error removing passkey:', error);
      setErrorMessage('Failed to remove passkey');
    } finally {
      setIsRemovingPasskey(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
        <div className="auth-card rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-indigo-600 mb-6 text-center">
            Loading Profile
          </h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-indigo-600 border-r-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
        <div className="auth-card rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Please sign in to view your profile.</p>
          </div>
          <button
            onClick={() => window.location.href = '/signin'}
            className="btn-primary w-full"
          >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Sign In</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

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
          
          <h1 className="text-3xl font-bold text-indigo-600">Profile</h1>
        </div>
        
        {/* User Info */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            {session?.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || 'User'} 
                className="h-24 w-24 rounded-full"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-2xl text-gray-600">
                  {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold">
            {session?.user?.name || 'User'}
          </h2>
          <p className="text-gray-600">{session?.user?.email}</p>
        </div>

        {/* Passkey Management Section */}
        {supportsPasskeys && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Passkey Management</h3>
              {hasPasskey && (
                <button
                  onClick={() => setShowAddPasskey(!showAddPasskey)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Device</span>
                </button>
              )}
            </div>

            {isCheckingPasskey ? (
              <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-gray-600"></div>
                  <span className="text-gray-600 dark:text-gray-300">Checking passkey status...</span>
                </div>
              </div>
            ) : hasPasskey ? (
              <div className="space-y-4">
                {/* Device List */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Registered Devices</h4>
                  <div className="space-y-3">
                    {passkeyDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {device.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Created: {formatDate(device.createdAt)}
                              {device.lastUsed && (
                                <span className="ml-2">• Last used: {formatDate(device.lastUsed)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removePasskey(device.id)}
                          disabled={isRemovingPasskey === device.id}
                          className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isRemovingPasskey === device.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-red-600"></div>
                          ) : (
                            <>Remove</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Passkey Section */}
                {showAddPasskey && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add New Device</span>
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm mb-4 leading-relaxed">
                      Register this device to sign in with a passkey. You can have multiple devices registered.
                    </p>
                    
                    {passkeyStatus === 'error' && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {errorMessage}
                      </div>
                    )}
                    
                    {passkeyStatus === 'success' && (
                      <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                        Device registered successfully!
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={registerPasskey}
                        disabled={isRegisteringPasskey}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex justify-center items-center"
                      >
                        {isRegisteringPasskey ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <>Register This Device</>
                        )}
                      </button>
                      <button
                        onClick={() => setShowAddPasskey(false)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 00-2-2m0 0a2 2 0 012-2m0 0a2 2 0 00-2 2m2 2a2 2 0 11-4 0m0 0a2 2 0 012-2m0 0a2 2 0 00-2 2" />
                  </svg>
                  <span>Set Up Your First Passkey</span>
                </h4>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-4 leading-relaxed">
                  Enhance your account security by adding a passkey. Sign in faster and more securely without passwords.
                </p>
                
                {passkeyStatus === 'error' && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {errorMessage}
                  </div>
                )}
                
                <button
                  onClick={registerPasskey}
                  disabled={isRegisteringPasskey}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex justify-center items-center"
                >
                  {isRegisteringPasskey ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>Set Up Passkey</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
} 