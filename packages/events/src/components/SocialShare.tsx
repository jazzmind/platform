"use client";

import { useState } from "react";

interface SocialShareProps {
  eventId: string;
  fileId: string;
}

export default function SocialShare({ eventId, fileId }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [platform, setPlatform] = useState<"twitter" | "linkedin" | "generic">("generic");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);
  
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/events/${eventId}/files/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          platform,
          customText: customText || undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || "Failed to generate share text");
        return;
      }
      
      setGeneratedText(data.text);
      setShareUrl(data.url);
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Error generating share text:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = (platform: string) => {
    let shareURL = "";
    
    switch (platform) {
      case "twitter":
        shareURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`;
        break;
      case "linkedin":
        shareURL = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(generatedText)}`;
        break;
      case "facebook":
        shareURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(generatedText)}`;
        break;
    }
    
    if (shareURL) {
      window.open(shareURL, "_blank");
    }
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
      >
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
          />
        </svg>
        Share
      </button>

      {/* Modal backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal content */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Share Document
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Platform
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="twitter"
                    checked={platform === 'twitter'}
                    onChange={() => setPlatform('twitter')}
                    className="text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Twitter</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="linkedin"
                    checked={platform === 'linkedin'}
                    onChange={() => setPlatform('linkedin')}
                    className="text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">LinkedIn</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="generic"
                    checked={platform === 'generic'}
                    onChange={() => setPlatform('generic')}
                    className="text-indigo-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Generic</span>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Key Points (Optional)
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-white dark:bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Add any specific points you'd like included in the generated text..."
              />
            </div>
            
            <div className="mb-6">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : 'Generate Share Text'}
              </button>
            </div>
            
            {generatedText && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold">
                    Generated Text
                  </label>
                  <button
                    onClick={() => handleCopy(generatedText)}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-3 text-gray-700 dark:text-gray-300 mb-4">
                  {generatedText}
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="bg-[#1DA1F2] hover:bg-[#0c85d0] text-white font-bold py-2 px-4 rounded"
                  >
                    Share on Twitter
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="bg-[#0077B5] hover:bg-[#005885] text-white font-bold py-2 px-4 rounded"
                  >
                    Share on LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="bg-[#1877F2] hover:bg-[#0c5dc9] text-white font-bold py-2 px-4 rounded"
                  >
                    Share on Facebook
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-end mt-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 