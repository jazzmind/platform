'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportsPasskeys, setSupportsPasskeys] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'email-sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/profile';
  const error = searchParams?.get('error');

  // Check if browser supports passkeys
  useEffect(() => {
    // Check if browser supports WebAuthn
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

  // Try to authenticate with passkey first
  useEffect(() => {
    if (supportsPasskeys && !error) {
      const tryPasskeyAuth = async () => {
        try {
          setStatus('checking');
          await signIn('passkey', { callbackUrl });
          // If the above doesn't redirect, fall back to showing the sign-in options
          setStatus('idle');
        } catch (error) {
          console.error('Passkey auth failed, showing manual options', error);
          setStatus('idle');
        }
      };

      tryPasskeyAuth();
    }
  }, [supportsPasskeys, callbackUrl, error]);

  // Handle email submission
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setIsSubmitting(true);
      setStatus('checking');
      await signIn('nodemailer', { email, callbackUrl, redirect: false });
      setStatus('email-sent');
    } catch (error) {
      console.error('Sign-in error:', error);
      setStatus('error');
      setErrorMessage('Failed to send login email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle passkey sign-in button click
  const handlePasskeySignIn = async () => {
    try {
      setIsSubmitting(true);
      await signIn('passkey', { callbackUrl });
    } catch (error) {
      console.error('Passkey sign-in error:', error);
      setStatus('error');
      setErrorMessage('Passkey authentication failed. Please try another method.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Signing In</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
          <p className="text-center mt-4">Checking authentication options...</p>
        </div>
      </div>
    );
  }

  if (status === 'email-sent') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Check Your Email</h1>
          <p className="text-center mb-4">
            We've sent a sign-in link to <strong>{email}</strong>. Please check your inbox and click the link to sign in.
          </p>
          <p className="text-sm text-gray-500 text-center mt-6">
            Didn't receive an email? Check your spam folder or try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign In</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error === 'OAuthSignin' && 'Error starting OAuth sign in.'}
            {error === 'OAuthCallback' && 'Error during OAuth callback.'}
            {error === 'Callback' && 'Error during callback handling.'}
            {error === 'OAuthCreateAccount' && 'Error creating OAuth account.'}
            {error === 'EmailCreateAccount' && 'Error creating email account.'}
            {error === 'Verification' && 'The token has expired or has already been used.'}
            {!['OAuthSignin', 'OAuthCallback', 'Callback', 'OAuthCreateAccount', 'EmailCreateAccount', 'Verification'].includes(error) && 'An unknown error occurred.'}
          </div>
        )}
        
        {status === 'error' && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        {supportsPasskeys && (
          <div className="mb-6">
            <button
              onClick={handlePasskeySignIn}
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex justify-center items-center"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>Sign in with Passkey</>
              )}
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex justify-center items-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>Continue with Email</>
            )}
          </button>
        </form>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
} 