import Link from "next/link";
import fs from "fs";
import path from "path";

// Function to get all event data
async function getEvents() {
  const eventsDirectory = path.join(process.cwd(), "src/data/events");
  const eventFiles = fs.readdirSync(eventsDirectory);
  
  // Filter for JSON files
  const jsonEventFiles = eventFiles.filter(file => file.endsWith(".json"));
  
  // Load and parse each event file
  const events = jsonEventFiles.map(file => {
    const filePath = path.join(eventsDirectory, file);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const eventData = JSON.parse(fileContents);
    
    // Get event ID from filename (remove .json extension)
    const eventId = file.replace(/\.json$/, "");
    
    return {
      id: eventId,
      ...eventData.public
    };
  });
  
  // Sort events by date (most recent first)
  return events.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export default async function EventsPage() {
  const events = await getEvents();
  
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
            Events
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Upcoming and past events hosted by Wes Sonnenreich.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => (
            <Link 
              href={`/events/${event.id}`} 
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  {event.title}
                </h2>
                <div className="flex items-center mb-3 text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(event.date).toLocaleDateString("en-US", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center mb-4 text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{event.location}</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 line-clamp-3">
                  {event.description.replace(/<[^>]*>/g, '')}
                </div>
                <div className="mt-4 text-red-600 font-medium flex items-center">
                  Learn more
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
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
            <div className="flex space-x-4">
              <a 
                href="https://linkedin.com/in/sonnenreich" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 