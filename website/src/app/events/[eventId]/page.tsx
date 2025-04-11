import Link from "next/link";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import EventRegistrationForm from "../EventRegistrationForm";
import { sendEventRegistration } from "../actions";
import EventCodeAccess from "../EventCodeAccess";
import { PollQuestion } from "../../lib/types";

// Define Topic interface
interface Topic {
  title: string;
  description: string;
  questions: string[];
}

interface EventData {
  id: string;
  public: {
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
    topics: Topic[];
  };
  private: {
    code: string;
    datahash: string;
    location: string;
    polls: PollQuestion[];
  };
}

// Function to get event data
async function getEventData(eventId: string): Promise<EventData | null> {
  const eventsDirectory = path.join(process.cwd(), "src/data/events");
  const filePath = path.join(eventsDirectory, `${eventId}.json`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(filePath, "utf8");
    const eventData = JSON.parse(fileContents);
    
    return {
      id: eventId,
      ...eventData
    };
  } catch (error) {
    console.error(`Error reading event file: ${error}`);
    return null;
  }
}

export async function generateStaticParams() {
  const eventsDirectory = path.join(process.cwd(), "src/data/events");
  const eventFiles = fs.readdirSync(eventsDirectory);
  
  // Filter for JSON files and create params
  return eventFiles
    .filter(file => file.endsWith(".json"))
    .map(file => ({
      eventId: file.replace(/\.json$/, "")
    }));
}

export default async function EventPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params;
  const eventData = await getEventData(eventId);
  
  // If event not found, return 404
  if (!eventData) {
    notFound();
  }
  
  // Format the date
  const formattedDate = new Date(eventData.public.date).toLocaleDateString("en-US", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <Link href="/events" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Events
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            {eventData.public.title}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center text-lg text-gray-600 dark:text-gray-300 mb-6 space-y-2 sm:space-y-0 sm:space-x-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{eventData.public.time}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{eventData.public.location}</span>
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">About This Event</h2>
              <div 
                className="prose prose-lg dark:prose-invert max-w-none" 
                dangerouslySetInnerHTML={{ __html: eventData.public.description }}
              />
            </div>
            
            {/* Topics section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Discussion Topics</h2>
              <div className="space-y-8">
                {eventData.public.topics.map((topic, index) => (
                  <div key={index} className="mb-8">
                    <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">
                      {topic.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4"
                      dangerouslySetInnerHTML={{ __html: topic.description }}
                    />
                    <div className="space-y-2 ml-4">
                      {topic.questions.map((question, qIndex) => (
                        <div key={qIndex} className="flex items-start">
                          <div className="text-red-600 mr-2">•</div>
                          <div 
                            className="text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: question }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Private Event Content (Unlocked with Code) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Event Details & Poll</h2>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  Additional event details will be sent to your email after registration. 
                  If you&apos;ve already registered, you&apos;ll receive a code to access these details.
                </p>
              </div>
              
              {/* Code Input Form (Client Component) */}
              <div className="space-y-4">
                <div className="border border-gray-300 dark:border-gray-600 p-6 rounded-lg">
                  {/* Client component for code access */}
                  <EventCodeAccess 
                    eventId={eventId} 
                    accessCode={eventData.private.code}
                  />
                  
                  {/* Hidden content to be displayed once unlocked */}
                  <div id="event-private-content" className="hidden space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg my-4">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                        Detailed Location
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        {eventData.private.location}
                      </p>
                    </div>
                    
                    {/* Hidden poll data to be accessed by the client component */}
                    <div 
                      id="event-polls-container"
                      data-polls={JSON.stringify(eventData.private.polls)}
                      className="hidden"
                    ></div>
                    
                    {/* Hidden datahash to be used for fetching stored responses */}
                    <div 
                      id="event-datahash-container"
                      data-hash={eventData.private.datahash}
                      className="hidden"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Register for This Event</h2>
              <EventRegistrationForm 
                eventId={eventId}
                eventTitle={eventData.public.title}
                sendEventRegistration={sendEventRegistration}
              />
            </div>
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