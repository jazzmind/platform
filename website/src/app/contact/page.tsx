import Link from "next/link";
import { sendContactEmail } from "@sonnenreich/contact/action";
import ContactForm from "@sonnenreich/contact/form";

export default function ContactPage() {
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
            Book Wes for Your Event
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Interested in having Wes speak at your conference, corporate event, or educational workshop?
            Fill out the form below to get in touch.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Speaking Topics</h2>
            <div className="space-y-6">

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🤖 + 🧠</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Learning alongside Machines</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  What education from preK-100+ looks like in the age of hyper-intelligent machines and what that means for the future of human work.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🤖 + 💰</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Building or Becoming an AI-Native Business</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  What the most innovative companies are doing to become AI-native, what is coming next, and what you need to do to stay competitive.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🤖 + 🔐</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">AI and Cybersecurity - The New Playbook</h3>
                <p className="text-gray-700 dark:text-gray-300">
                    BYO killed the network perimeter. AI is killing endpoint and data security. Quantum will kill cryptography. How is cybersecurity evolving?
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-4">🤖 + 🚀</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Organizational Innovation + AI</h3>
                <p className="text-gray-700 dark:text-gray-300">
                    How to level up your organization&apos;s ability to innovate with AI. What tools, processes, and mindsets are working today.
                </p>
              </div>
            </div>


            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Connect Directly</h2>
              <div className="space-y-4">
                <a 
                  href="https://linkedin.com/in/sonnenreich"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  LinkedIn: sonnenreich
                </a>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Contact Form</h2>
            <ContactForm sendContactEmail={sendContactEmail} />
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