import Link from "next/link";
import { notFound } from "next/navigation";
import { getPresentation } from "../../../getPresentation";
import ChatPanel from "./ChatPanel";
import TabInterface from "./TabInterface";

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

  // URL for the presentation API
  const viewInNewWindowUrl = `/api/presentations/${categoryId}/${presentationId}`;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb navigation */}
        <nav className="mb-4 flex items-center text-sm">
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
        
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{category.icon}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{presentation.title}</h1>
          </div>
          <p className="text-base text-gray-600 dark:text-gray-300">{presentation.description}</p>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {presentation.date}
          </div>
        </header>

        {/* Main content area with presentation and chat */}
        <div className="flex flex-col md:flex-row relative">
          {/* Main content - reduced right padding to decrease gap */}
          <div className="w-full pr-[350px]">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <TabInterface
                categoryId={categoryId}
                presentationId={presentationId}
                viewInNewWindowUrl={viewInNewWindowUrl}
              />
            </div>
          </div>
          
          {/* Chat panel - fixed position with less gap */}
          <div className="fixed top-[124px] right-4 w-[330px] h-[calc(100vh-140px)] z-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
              <ChatPanel 
                categoryId={categoryId} 
                presentationId={presentationId} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 