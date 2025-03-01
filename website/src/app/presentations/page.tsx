import Link from "next/link";

// Define types for our category data
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
    description: "Innovation, strategy, and leadership.",
    icon: "📊",
  },
  education: {
    id: "education",
    title: "Educational Presentations",
    description: "Work integrated learning and the future of education.",
    icon: "🎓",
  },
};

export default function PresentationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">Presentations</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Explore Wes&apos;s collection of presentations across various categories
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.values(categories).map((category) => (
            <Link
              href={`/categories/${category.id}`}
              key={category.id}
              className="block group"
            >
              <div className="bg-white dark:bg-gray-700 flex flex-col h-full rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
                <div className="flex-grow p-6">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {category.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-200">
                    {category.description}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 px-6 py-4">
                  <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                    Browse Presentations
                    <svg
                      className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 