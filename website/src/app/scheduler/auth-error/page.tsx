"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown_error';

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    missing_parameters: 'Missing required parameters for authentication.',
    invalid_state: 'Invalid or missing authentication state.',
    expired_state: 'Your authentication session has expired. Please try again.',
    token_exchange_failed: 'Failed to exchange authorization code for tokens.',
    user_info_failed: 'Failed to fetch user information.',
    email_mismatch: 'The email from your Google account doesn\'t match the email you provided.',
    server_error: 'A server error occurred during authentication.',
    unknown_error: 'An unknown error occurred during authentication.'
  };

  const errorMessage = errorMessages[error] || errorMessages.unknown_error;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <Link href="/scheduler" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Scheduler
        </Link>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-2xl mx-auto border-red-500 border-2">
          <div className="flex items-center mb-6">
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Authentication Failed
            </h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {errorMessage}
          </p>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You can go back to the scheduler and try again, or continue without connecting your calendar.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link
              href="/scheduler"
              className="px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
            >
              Return to Scheduler
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 