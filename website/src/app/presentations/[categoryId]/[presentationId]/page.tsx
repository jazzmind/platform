import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresentation } from "../../../getPresentation";
import PresentationIframe from "./PresentationIframe";
import NotesPanel from "./NotesPanel";
import ChatPanel from "./ChatPanel";

// Define types for our category data
type CategoryInfo = {
  id: string;
  title: string;
  icon: string;
};

// This map contains metadata about our categories
const categories: Record<string, CategoryInfo> = {
  technical: {
    id: "technical",
    title: "Technical Presentations",
    icon: "💻",
  },
  business: {
    id: "business",
    title: "Business Presentations",
    icon: "📊",
  },
  education: {
    id: "education",
    title: "Educational Presentations",
    icon: "🎓",
  },
};

export default async function PresentationPage({ 
  params: paramsPromise 
}: { 
  params: Promise<{ categoryId: string; presentationId: string }> 
}) {
  const params = await paramsPromise;
  const { categoryId, presentationId } = params;
  
  console.log("Loading presentation:", categoryId, presentationId);
  
  // Get category info
  const category = categories[categoryId];
  
  // If category doesn't exist, show 404
  if (!category) {
    console.error(`Category not found: ${categoryId}`);
    notFound();
  }
  
  // Get presentation
  const presentation = await getPresentation(categoryId, presentationId);
  
  // If presentation doesn't exist, show 404
  if (!presentation) {
    console.error(`Presentation not found: ${presentationId}`);
    notFound();
  }

  // Use the URL from the presentation object
  const presentationUrl = presentation.url;
  console.log("Loading presentation from URL:", presentationUrl);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/categories/${categoryId}`} className="inline-flex items-center text-red-600 hover:text-red-800">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to {category.title}
          </Link>
        </div>
        
        <header className="mb-6">
          <div className="flex items-center mb-3">
            <span className="text-4xl mr-3">{category.icon}</span>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{presentation.title}</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">{presentation.description}</p>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {presentation.date}
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content - presentation iframe */}
          <div className="lg:w-2/3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden p-6">
              <div className="mb-4">
                <a 
                  href={presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View in New Window
                </a>
              </div>
              <PresentationIframe url={presentationUrl} title={presentation.title} />
              
              {/* Notes Panel */}
              <NotesPanel categoryId={categoryId} presentationId={presentationId} />
            </div>
          </div>
          
          {/* Sidebar - chat with presentation */}
          <div className="lg:w-1/3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-full">
              <ChatPanel categoryId={categoryId} presentationId={presentationId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 