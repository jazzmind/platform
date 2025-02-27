import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

// Define types for our data structures
type Presentation = {
  id: string;
  title: string;
  description: string;
  date: string;
  thumbnail?: string;
};

type CategoryInfo = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

// This map contains metadata about our categories
const categories: Record<string, CategoryInfo> = {
  technical: {
    id: "technical",
    title: "Technical Presentations",
    description: "Deep dives into technical topics, code walkthroughs, and architecture discussions.",
    icon: "💻",
  },
  business: {
    id: "business",
    title: "Business Presentations",
    description: "Business strategies, market analyses, and investment opportunities.",
    icon: "📊",
  },
  education: {
    id: "education",
    title: "Educational Presentations",
    description: "Learning materials, tutorials, and educational resources.",
    icon: "🎓",
  },
};

// Function to fetch presentations from the actual directories
async function getPresentationsFromDirectory(categoryId: string): Promise<Presentation[]> {
  try {
    // Get the presentations directory path - this is at the project root, outside the NextJS app
    const presentationsDir = path.join(process.cwd(), "..", categoryId);
    
    // Check if the directory exists
    if (!fs.existsSync(presentationsDir)) {
      return [];
    }
    
    const presentations: Presentation[] = [];
    
    // Get all subdirectories (each one is a presentation)
    const dirs = fs.readdirSync(presentationsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    // Process each directory
    for (const dirent of dirs) {
      const id = dirent.name;
      
      // Special handling for AI Tinkerers
      if (id === "ai-tinkerers") {
        const aiTinkerersPath = path.join(presentationsDir, id);
        
        // Check sept-24 folder
        if (fs.existsSync(path.join(aiTinkerersPath, "sept-24"))) {
          presentations.push({
            id: "ai-tinkerers-sept-24",
            title: "Hands on with the OpenAI Assistant API",
            description: "Learn how to use the OpenAI Assistant API to build your own AI assistant.",
            date: "September 24, 2024",
          });
        }
        
        // Check feb-25 cursor folder
        if (fs.existsSync(path.join(aiTinkerersPath, "feb-25", "cursor"))) {
          presentations.push({
            id: "ai-tinkerers-feb-25-cursor",
            title: "Hands on with Cursor",
            description: "Explore the Cursor IDE and how to use it effectively with AI.",
            date: "February 25, 2025",
          });
        }
        
      } else {
        // Regular presentation
        presentations.push({
          id,
          title: id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
          description: `Presentation about ${id.replace(/-/g, " ")}`,
          date: new Date().toISOString().split("T")[0], // Placeholder date
        });
      }
    }
    
    // Sort presentations by date (most recent first)
    return presentations.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error("Error fetching presentations:", error);
    return [];
  }
}

export default async function CategoryPage({ params: paramsPromise }: { params: Promise<{ categoryId: string }> }) {
  const params = await paramsPromise;
  const { categoryId } = params;
  
  // Get category info from our map
  const category = categories[categoryId];
  
  // If category doesn't exist, show 404
  if (!category) {
    notFound();
  }
  
  // Fetch presentations for this category
  const presentations = await getPresentationsFromDirectory(categoryId);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Categories
        </Link>
        
        <header className="mb-12">
          <div className="flex items-center mb-4">
            <span className="text-5xl mr-4">{category.icon}</span>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">{category.title}</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300">{category.description}</p>
        </header>
        
        {presentations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {presentations.map((presentation) => (
              <Link 
                href={`/presentations/${categoryId}/${presentation.id}`} 
                key={presentation.id}
                className="block group"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {presentation.thumbnail ? (
                      <img
                        src={presentation.thumbnail}
                        alt={presentation.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">{category.icon}</div>
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {presentation.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {presentation.description}
                    </p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {presentation.date}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">No Presentations Found</h2>
            <p className="text-gray-600 dark:text-gray-300">
              There are no presentations available in this category yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 