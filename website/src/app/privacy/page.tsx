import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – Wes Sonnenreich",
  description: "Privacy policy for Wes Sonnenreich's website and What Would Wes Do plugin.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400">Last updated: July 2026</p>
        </header>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Overview</h2>
            <p>
              This website (<strong>sonnenreich.com</strong>) and the <strong>What Would Wes Do</strong> ChatGPT plugin
              are operated by Wes Sonnenreich. This policy explains what data is collected, how it is used, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">What We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contact form submissions</strong> — name, email, and message when you contact us through the site.
              </li>
              <li>
                <strong>Plugin usage</strong> — when you use the What Would Wes Do ChatGPT plugin, the situation or question
                you submit is sent to OpenAI's API to generate a response. We do not store these queries beyond the
                duration of the API call.
              </li>
              <li>
                <strong>Server logs</strong> — standard web server logs (IP address, request path, timestamp) retained
                for up to 30 days for security and debugging purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">What We Do Not Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not use tracking cookies or advertising pixels.</li>
              <li>We do not sell, share, or trade personal data with third parties.</li>
              <li>We do not collect payment information.</li>
              <li>We do not collect data from children under 13.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Third-Party Services</h2>
            <p>This site uses the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Vercel</strong> — hosting and deployment. Subject to{" "}
                <a href="https://vercel.com/legal/privacy-policy" className="text-red-600 hover:text-red-800 underline" target="_blank" rel="noopener noreferrer">
                  Vercel&apos;s privacy policy
                </a>.
              </li>
              <li>
                <strong>OpenAI</strong> — the What Would Wes Do plugin sends your query to OpenAI to generate advice.
                Subject to{" "}
                <a href="https://openai.com/policies/privacy-policy" className="text-red-600 hover:text-red-800 underline" target="_blank" rel="noopener noreferrer">
                  OpenAI&apos;s privacy policy
                </a>.
              </li>
              <li>
                <strong>Resend</strong> — transactional email for contact form submissions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Data Retention</h2>
            <p>
              Contact form submissions are retained for up to 12 months. Server logs are retained for up to 30 days.
              Plugin queries are not stored beyond the duration of the API call.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of any personal data we hold about you by contacting
              us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
            <p>
              For privacy-related questions, contact{" "}
              <a href="mailto:privacy@sonnenreich.com" className="text-red-600 hover:text-red-800 underline">
                privacy@sonnenreich.com
              </a>{" "}
              or use the{" "}
              <Link href="/contact" className="text-red-600 hover:text-red-800 underline">
                contact form
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
