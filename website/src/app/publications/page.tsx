import Link from "next/link";
import Image from "next/image";

interface Publication {
  id: string;
  title: string;
  description: string;
  year: string;
  type: "book" | "paper" | "patent";
  image?: string;
  link?: string;
  citations?: number;
}

export default function PublicationsPage() {
  const publications: Publication[] = [
    // Books
    {
      id: "network-security-illustrated",
      title: "Network Security Illustrated",
      description: "A comprehensive visual guide to securing networks, covering topics from basic network principles to advanced security concepts with clear illustrations and practical examples.",
      year: "2003",
      type: "book",
      image: "/networksecurity.jpg",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:UeHWp8X0CEIC",
      citations: 3,
    },
    {
      id: "building-linux-openbsd-firewalls",
      title: "Building Linux and OpenBSD Firewalls",
      description: "A practical guide to building secure firewalls using Linux and OpenBSD, offering step-by-step instructions for configuring, deploying, and maintaining robust network defenses.",
      year: "2000",
      type: "book",
      image: "/firewalls.jpg",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:IjCSPb-OGe4C",
      citations: 16,
    },
    {
      id: "web-developers-guide-search-engines",
      title: "Web Developer's Guide to Search Engines",
      description: "An in-depth guide to help web developers understand how search engines work and optimize websites for better visibility and ranking in search results.",
      year: "1998",
      type: "book",
      image: "/searchengines.jpg",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:u-x6o8ySG0sC",
      citations: 42,
    },
    
    // Papers
    {
      id: "return-on-security-investment",
      title: "Return on Security Investment (ROSI) - A Practical Quantitative Model",
      description: "This paper explores techniques for measuring security within an organization and proposes a benchmarking methodology that produces results of strategic importance to both decision makers and technology implementers.",
      year: "2006",
      type: "paper",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:9yKSN-GCB0IC",
      citations: 413,
    },
    {
      id: "return-on-security-investment-approach",
      title: "Return on Security Investment (ROSI) - A Practical Approach",
      description: "A companion paper to the ROSI quantitative model, focusing on practical implementation approaches for security investment analysis in organizational contexts.",
      year: "2006",
      type: "paper",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:Tyk-4Ss8FVUC",
      citations: 5,
    },
    {
      id: "history-of-search-engines",
      title: "A History of Search Engines",
      description: "A comprehensive historical overview of the evolution of search engines, their technologies, and their impact on the web and information retrieval.",
      year: "1997",
      type: "paper",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:LkGwnXOMwfcC",
      citations: 27,
    },
    
    // Patents
    {
      id: "distance-learning-system",
      title: "Internet based distance learning system",
      description: "A novel system for Internet-based distance learning that enables communication between server and clients where clients can communicate with each other or with teachers using different communication techniques via a common user interface.",
      year: "1999",
      type: "patent",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=mTG0bBIAAAAJ&citation_for_view=mTG0bBIAAAAJ:u5HHmVD_uO8C",
      citations: 586,
    },
    {
      id: "experiential-learning-cycle-monitoring",
      title: "System and a method for monitoring progress of a learner through an experiential learning cycle",
      description: "An innovative system for tracking and analyzing a learner's progress through experiential learning cycles, providing valuable insights for both learners and educators to enhance educational outcomes.",
      year: "2020",
      type: "patent",
      link: "https://scholar.google.com.au/citations?view_op=view_citation&hl=en&user=4XC2LVUAAAAJ&citation_for_view=4XC2LVUAAAAJ:WF5omc3nYNoC",
    },
  ];

  // Group publications by type
  const books = publications.filter(pub => pub.type === "book");
  const papers = publications.filter(pub => pub.type === "paper");
  const patents = publications.filter(pub => pub.type === "patent");

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
            Publications
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Books, academic papers, and patents by Wes Sonnenreich
          </p>
        </header>

        {/* Books Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Books</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book) => (
              <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative">
                  {book.image ? (
                    <div className="h-full w-full bg-white dark:bg-gray-800 flex items-center justify-center relative">
                      <Image
                        src={book.image}
                        alt={`Cover of ${book.title}`}
                        fill
                        style={{ objectFit: "contain" }}
                        className="p-2"
                      />
                    </div>
                  ) : (
                    <div className="text-4xl">📚</div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                    {book.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {book.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Published: {book.year} {book.citations && `· ${book.citations} citations`}
                    </span>
                    {book.link && (
                      <a 
                        href={book.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Papers Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Research Papers</h2>
          <div className="space-y-6">
            {papers.map((paper) => (
              <div key={paper.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                  {paper.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {paper.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Published: {paper.year} {paper.citations && `· ${paper.citations} citations`}
                  </span>
                  {paper.link && (
                    <a 
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Read Paper →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Patents Section */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Patents</h2>
          <div className="space-y-6">
            {patents.map((patent) => (
              <div key={patent.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                  {patent.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {patent.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Filed: {patent.year} {patent.citations && `· ${patent.citations} citations`}
                  </span>
                  {patent.link && (
                    <a 
                      href={patent.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      View Patent →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
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
                href="https://linkedin.com/in/wes-sonnenreich" 
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