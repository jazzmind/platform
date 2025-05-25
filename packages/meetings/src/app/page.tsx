import Link from "next/link";

export default function  MeetingsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Group  Meetings
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Find the best times for your group to meet by connecting calendars and sharing availability.
          </p>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">1. Create a Meeting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Define your event&apos;s purpose, time preferences, and date range.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">2. Share with Participants</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Invite participants to connect their calendars or input availability manually.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 dark:bg-red-900 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">3. Get Optimized Meeting Times</h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI analyzes everyone&apos;s availability to find the optimal meeting times with minimal conflicts.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create a New Meeting</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              To create a new meeting, you&apos;ll need an access code. This helps prevent spam and unauthorized use.
            </p>
            
            <Link 
              href="/ Meetings/create" 
              className="inline-flex items-center justify-center px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
            >
              Create Meeting
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Access a Shared Meeting</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              If someone shared a meeting scheduler link with you, you can access it directly to provide your availability.
            </p>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              The link format is: <span className="font-mono">{baseUrl}/meetings/EVENT_ID</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Wes Sonnenreich. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 