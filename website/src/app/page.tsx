import Link from "next/link";
import Image from "next/image";
import { 
  HeroBackground, 
  BiographyBackground, 
  PresentationsBackground, 
  SpeakingTopicsBackground,
  TestimonialsBackground 
} from "./components/Backgrounds";

export default function Home() {
  const categories = [
    {
      id: "technical",
      title: "Technical",
      description: "Deep dives into technical topics, code walkthroughs, and architecture discussions.",
      icon: "💻",
    },
    {
      id: "business",
      title: "Business",
      description: "Innovation, strategy, and leadership.",
      icon: "📊",
    },
    {
      id: "education",
      title: "Education",
      description: "Work integrated learning and the future of education.",
      icon: "🎓",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <HeroBackground />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-100 dark:text-white mb-6">
                Wes Sonnenreich
              </h1>
              <h2 className="text-xl md:text-2xl text-red-500 dark:text-red-400 mb-8 font-semibold">
                Technology Leader • Author • Speaker
              </h2>
              <p className="text-lg text-gray-300 dark:text-gray-300 mb-8 max-w-2xl">
                An accomplished technology executive with over 20 years of experience innovating in education, AI and cybersecurity. 
                Wes helps organizations navigate the rapidly changing landscape of technology and business in the age of hyper-intelligent machines.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://linkedin.com/in/sonnenreich" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  LinkedIn
                </a>
                <Link 
                  href="/presentations" 
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  View Presentations
                </Link>
                {/* <Link 
                  href="/publications" 
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  View Publications
                </Link> */}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative h-64 w-64 md:h-80 md:w-80 rounded-full overflow-hidden shadow-xl">
                <Image 
                  src="/wes headshot.png"
                  alt="Wes Sonnenreich headshot"
                  fill
                  style={{ objectFit: "cover" }}
                  priority
                  className="rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Biography Section */}
      <div className="relative" id="about">
        <BiographyBackground />
        <div className="container mx-auto px-4 pt-32 relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            About Wes
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 max-w-2xl mx-auto">
              Wes Sonnenreich is a distinguished technology executive, entrepreneur, author, and speaker. As a business and thought leader, 
              Wes has helped numerous organizations develop sustainable capabilities in innovation, education, and cybersecurity.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 max-w-2xl mx-auto">
              With multiple patents and publications to his name, Wes combines deep technical knowledge with strategic 
              business acumen. He has founded successful technology companies and led teams at major enterprises, 
              bringing innovative solutions to complex problems.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto">
              A sought-after speaker and educator, Wes regularly shares his insights at industry conferences, 
              executive roundtables, and educational workshops. His presentations blend technical expertise with 
              practical business applications, making complex topics accessible to diverse audiences.
            </p>
          </div>
        </div>
      </div>

      {/* Presentations Section */}
      <div className="relative pt-32">
        <PresentationsBackground />
        <div className="container mx-auto mt-8 px-4 relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Presentations
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 text-center max-w-3xl mx-auto">
            Explore Wes&apos;s collection of presentations across various categories
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Link
                href={`/presentations/${category.id}`}
                key={category.id}
                className="block group"
              >
                <div className="bg-white dark:bg-gray-700 flex flex-col h-full rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="flex-grow p-6">
                    <div className="text-4xl mb-4">{category.icon}</div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {category.title} Presentations
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

      {/* Speaking Topics */}
      <div className="relative">
        <SpeakingTopicsBackground />
        <div className="container mx-auto px-4 pt-32 pb-8 relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-2 text-center">
            Speaking Topics
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-200 mb-12 text-center max-w-3xl mx-auto">
            Wes speaks on a range of topics at the intersection of technology, business, and AI
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖 + 🧠</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Learning alongside Machines</h3>
              <p className="text-gray-700 dark:text-gray-200">
                What education from preK-100+ looks like in the age of hyper-intelligent machines and what that means for the future of human work.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖 + 💰</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Building or Becoming an AI-Native Business</h3>
              <p className="text-gray-700 dark:text-gray-200">
                 What the most innovative companies are doing to become AI-native, what is coming next, and what you need to do to stay competitive.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖 + 🔐</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">AI and Cybersecurity - The New Playbook</h3>
              <p className="text-gray-700 dark:text-gray-200">
                  BYO killed the network perimeter. AI is killing endpoint and data security. Quantum will kill cryptography. How is cybersecurity evolving?
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🤖 + 🚀</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Organizational Innovation + AI</h3>
              <p className="text-gray-700 dark:text-gray-200">
                  How to level up your organization&apos;s ability to innovate with AI. What tools, processes, and mindsets are working today.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/contact" 
              className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Book Wes for Your Event
            </Link>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative pb-32 pt-32">
        <TestimonialsBackground />
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center">
            What People Are Saying
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-200 italic mb-4">
                &quot;Wes&apos;s presentation on AI tools was incredibly insightful. He has a unique ability to make complex technical concepts accessible without oversimplifying.&quot;
              </p>
              <div className="font-semibold text-gray-800 dark:text-white">
                Tech Conference Attendee
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
              <p className="text-gray-600 dark:text-gray-200 italic mb-4">
                &quot;As a keynote speaker, Wes combined technical expertise with engaging storytelling. His session was the highlight of our annual conference.&quot;
              </p>
              <div className="font-semibold text-gray-800 dark:text-white">
                Event Organizer
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 py-8">
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
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
