import { sendContactEmail } from "../components/actions";
import ContactForm from "../components/ContactForm";

export default function StandaloneContactRootPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-xl shadow-2xl">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Contact Us (Standalone App)
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>
        <ContactForm sendContactEmail={sendContactEmail} />
      </div>
      <footer className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Sonnenreich Contact App. 
        </p>
      </footer>
    </div>
  );
} 