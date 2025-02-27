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
  type: string;
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
    // First check the public directory (which is more reliable)
    const publicDir = path.join(process.cwd(), "public", categoryId);
    
    // Check if the directory exists
    const presentations: Presentation[] = [];
    
    if (fs.existsSync(publicDir)) {
      console.log(`Scanning presentations from public directory: ${publicDir}`);
      
      // Get all subdirectories (each one is a presentation)
      const dirs = fs.readdirSync(publicDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      // Process each directory
      for (const dirent of dirs) {
        const id = dirent.name;
        
        // Check for nested directories in specific cases (like ai-tinkerers)
        if (id === "ai-tinkerers") {
          // Special case: this is a folder containing multiple presentations
          const aiTinkerersDir = path.join(publicDir, id);
          if (fs.existsSync(aiTinkerersDir)) {
            const subDirs = fs.readdirSync(aiTinkerersDir, { withFileTypes: true })
              .filter(subDirent => subDirent.isDirectory());
              
            for (const subDir of subDirs) {
              // This is a nested presentation
              processPresentation(`${id}/${subDir.name}`, presentations, publicDir);
            }
          }
        } else if (id.startsWith("ai-tinkerers-")) {
          // This is a top-level ai-tinkerers presentation
          processPresentation(id, presentations, publicDir);
        } else {
          // Regular presentation
          processPresentation(id, presentations, publicDir);
        }
      }
    } else {
      // Fallback to the original directory structure
      const presentationsDir = path.join(process.cwd(), "..", categoryId);
      if (fs.existsSync(presentationsDir)) {
        console.log(`Scanning presentations from project root: ${presentationsDir}`);
        
        // Get all subdirectories (each one is a presentation)
        const dirs = fs.readdirSync(presentationsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory());
        
        // Process each directory
        for (const dirent of dirs) {
          processPresentation(dirent.name, presentations, presentationsDir);
        }
      } else {
        console.log(`No presentations directory found for category: ${categoryId}`);
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

// Helper function to process a presentation directory
function processPresentation(id: string, presentations: Presentation[], baseDir: string) {
  try {
    const dirPath = path.join(baseDir, id);
    
    // Check if there's a metadata.json file
    if (fs.existsSync(path.join(dirPath, "metadata.json"))) {
      const metadata = JSON.parse(fs.readFileSync(path.join(dirPath, "metadata.json"), "utf8"));
      presentations.push({
        id,
        title: metadata.title || formatTitle(id),
        description: metadata.description || `Presentation about ${id.replace(/-/g, " ")}`,
        date: metadata.date || extractDateFromId(id) || new Date().toISOString().split("T")[0],
        type: metadata.type || "revealjs",
      });
    } else {
      // For AI tinkerers presentations, parse the ID to get a better title and date
      const title = formatTitle(id);
      const date = extractDateFromId(id) || new Date().toISOString().split("T")[0];
      
      // Extract description from index.html if possible
      let description = `Presentation about ${id.replace(/-/g, " ")}`;
      
      if (fs.existsSync(path.join(dirPath, "data.md"))) {
        const data = fs.readFileSync(path.join(dirPath, "data.md"), "utf8");
        const descMatch = data.match(/## Presentation Metadata[\s\S]*?Description:(.*?)(?:\n|$)/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
      }
      
      presentations.push({
        id,
        title,
        description,
        date,
        type: "revealjs",
      });
    }
  } catch (error) {
    console.error(`Error processing presentation ${id}:`, error);
  }
}

// Helper function to format a title from an ID
function formatTitle(id: string): string {
  // Special cases for AI Tinkerers presentations
  if (id.includes("ai-tinkerers")) {
    if (id.includes("cursor")) {
      return "Hands on with Cursor";
    } else if (id.includes("openai-assistants")) {
      return "OpenAI Assistants API";
    } else if (id.includes("the-future-of-ai")) {
      return "The Future of AI";
    }
  }
  
  // Default formatting
  return id.split("/").pop()?.split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || id;
}

// Helper function to extract a date from an ID
function extractDateFromId(id: string): string | null {
  // Try to parse dates in formats like YYYY-MM or YY-MM
  const dateMatch = id.match(/(\d{4}|\d{2})-(0[1-9]|1[0-2])/);
  if (dateMatch) {
    const year = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1];
    const month = dateMatch[2];
    
    // Convert month number to month name
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return `${months[parseInt(month) - 1]} ${year}`;
  }
  
  return null;
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