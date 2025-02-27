import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresentation } from "../../../getPresentation";
import TabsContainer from "./TabsContainer";
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
      <div className="container mx-auto px-4 py-2">
        {/* Tightened subnavigation */}
        <nav className="mb-1 flex items-center text-sm">
          <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
            Home
          </Link>
          <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>
          <Link href={`/categories/${categoryId}`} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
            {category.title}
          </Link>
          <span className="mx-2 text-gray-400 dark:text-gray-500">/</span>
          <span className="text-gray-700 dark:text-gray-300 truncate">{presentation.title}</span>
        </nav>
        
        {/* Tightened header */}
        <header className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{category.icon}</span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{presentation.title}</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{presentation.description}</p>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {presentation.date}
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main content - presentation iframe */}
          <div className="lg:w-2/3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <TabsContainer 
                presentationUrl={presentationUrl}
                presentationTitle={presentation.title}
                categoryId={categoryId}
                presentationId={presentationId}
                hasNotes={presentation.hasNotes}
              />
            </div>
          </div>
          
          {/* Sidebar - chat with presentation - pinned to top right and matching height */}
          <div className="lg:w-1/3 lg:sticky lg:top-2 lg:self-start">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <ChatPanel categoryId={categoryId} presentationId={presentationId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 