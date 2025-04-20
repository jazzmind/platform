"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateSchedulerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    objective: "",
    timePreferences: {
      partOfDay: [] as string[],
      earlyLate: "either"
    },
    duration: 60,
    frequency: {
      type: "once",
      occurrences: 1
    },
    dateRangeStart: "",
    dateRangeEnd: "",
    accessCode: "",
    createdBy: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    eventId?: string;
    shareUrl?: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      // Handle nested properties
      const [parent, child] = name.split(".");
      setFormData(prev => {
        const newFormData = { ...prev };
        if (parent === "timePreferences") {
          newFormData.timePreferences = {
            ...prev.timePreferences,
            [child]: value
          };
        } else if (parent === "frequency") {
          newFormData.frequency = {
            ...prev.frequency,
            [child]: value
          };
        }
        return newFormData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    
    if (name.includes(".")) {
      // Handle nested properties
      const [parent, child] = name.split(".");
      setFormData(prev => {
        const newFormData = { ...prev };
        if (parent === "frequency") {
          newFormData.frequency = {
            ...prev.frequency,
            [child]: numValue
          };
        }
        return newFormData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
  };

  const handleTimePreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentPreferences = [...prev.timePreferences.partOfDay];
      
      if (checked) {
        currentPreferences.push(value);
      } else {
        const index = currentPreferences.indexOf(value);
        if (index > -1) {
          currentPreferences.splice(index, 1);
        }
      }
      
      return {
        ...prev,
        timePreferences: {
          ...prev.timePreferences,
          partOfDay: currentPreferences
        }
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.objective.trim()) {
      newErrors.objective = "Objective is required";
    }
    
    if (formData.timePreferences.partOfDay.length === 0) {
      newErrors.partOfDay = "Please select at least one time of day preference";
    }
    
    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = "Duration must be at least 15 minutes";
    }
    
    if (!formData.dateRangeStart) {
      newErrors.dateRangeStart = "Start date is required";
    }
    
    if (!formData.dateRangeEnd) {
      newErrors.dateRangeEnd = "End date is required";
    }
    
    if (formData.dateRangeStart && formData.dateRangeEnd) {
      const start = new Date(formData.dateRangeStart);
      const end = new Date(formData.dateRangeEnd);
      if (start >= end) {
        newErrors.dateRangeEnd = "End date must be after start date";
      }
    }
    
    if (!formData.accessCode.trim()) {
      newErrors.accessCode = "Access code is required";
    }
    
    if (!formData.createdBy.trim()) {
      newErrors.createdBy = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.createdBy)) {
      newErrors.createdBy = "Valid email is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/scheduler/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitResult({
          success: true,
          message: data.message,
          eventId: data.eventId,
          shareUrl: data.shareUrl
        });
      } else {
        setSubmitResult({
          success: false,
          message: data.message || "Failed to create scheduler event"
        });
      }
    } catch (_error) {
      setSubmitResult({
        success: false,
        message: "An error occurred while creating the event"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <Link href="/scheduler" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Scheduler
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Create a Group Schedule
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Create a new scheduling event to coordinate the best meeting times for your group.
          </p>
        </header>

        {submitResult ? (
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-2xl mx-auto ${submitResult.success ? 'border-green-500' : 'border-red-500'} border-2`}>
            <div className="flex items-center mb-6">
              {submitResult.success ? (
                <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {submitResult.success ? "Success!" : "Error"}
              </h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {submitResult.message}
            </p>
            
            {submitResult.success && submitResult.shareUrl && (
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Share this link with your participants:
                </p>
                <div className="flex items-center">
                  <code className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg font-mono text-sm flex-1 break-all">
                    {`${window.location.origin}${submitResult.shareUrl}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${submitResult.shareUrl}`);
                      alert("Link copied to clipboard!");
                    }}
                    className="ml-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    aria-label="Copy link"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              {submitResult.success && submitResult.shareUrl && (
                <Link
                  href={submitResult.shareUrl}
                  className="px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
                >
                  View Schedule
                </Link>
              )}
              <button
                onClick={() => setSubmitResult(null)}
                className="px-6 py-3 bg-gray-300 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-white font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                {submitResult.success ? "Create Another" : "Try Again"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                placeholder="e.g., Team Offsite Planning"
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
            </div>
            
            <div className="mb-6">
              <label htmlFor="objective" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Objective *
              </label>
              <textarea
                id="objective"
                name="objective"
                value={formData.objective}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${errors.objective ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                placeholder="e.g., We want our band to practice once a month"
              />
              {errors.objective && <p className="mt-1 text-sm text-red-500">{errors.objective}</p>}
            </div>
            
            <div className="mb-6">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time of Day Preferences *
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value="morning"
                    checked={formData.timePreferences.partOfDay.includes("morning")}
                    onChange={handleTimePreferenceChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Morning</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value="afternoon"
                    checked={formData.timePreferences.partOfDay.includes("afternoon")}
                    onChange={handleTimePreferenceChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Afternoon</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    value="evening"
                    checked={formData.timePreferences.partOfDay.includes("evening")}
                    onChange={handleTimePreferenceChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Evening</span>
                </label>
              </div>
              {errors.partOfDay && <p className="mt-1 text-sm text-red-500">{errors.partOfDay}</p>}
            </div>
            
            <div className="mb-6">
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Early/Late Preference
              </p>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timePreferences.earlyLate"
                    value="early"
                    checked={formData.timePreferences.earlyLate === "early"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Early</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timePreferences.earlyLate"
                    value="late"
                    checked={formData.timePreferences.earlyLate === "late"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Late</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timePreferences.earlyLate"
                    value="either"
                    checked={formData.timePreferences.earlyLate === "either"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Either</span>
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleNumberChange}
                min={15}
                step={15}
                className={`w-full px-4 py-2 rounded-lg border ${errors.duration ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
              />
              {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration}</p>}
            </div>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="frequency.type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequency
                </label>
                <select
                  id="frequency.type"
                  name="frequency.type"
                  value={formData.frequency.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="once">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="frequency.occurrences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Occurrences
                </label>
                <input
                  type="number"
                  id="frequency.occurrences"
                  name="frequency.occurrences"
                  value={formData.frequency.occurrences}
                  onChange={handleNumberChange}
                  min={1}
                  max={12}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateRangeStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="dateRangeStart"
                  name="dateRangeStart"
                  value={formData.dateRangeStart}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${errors.dateRangeStart ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
                {errors.dateRangeStart && <p className="mt-1 text-sm text-red-500">{errors.dateRangeStart}</p>}
              </div>
              
              <div>
                <label htmlFor="dateRangeEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="dateRangeEnd"
                  name="dateRangeEnd"
                  value={formData.dateRangeEnd}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border ${errors.dateRangeEnd ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
                {errors.dateRangeEnd && <p className="mt-1 text-sm text-red-500">{errors.dateRangeEnd}</p>}
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Code *
              </label>
              <input
                type="password"
                id="accessCode"
                name="accessCode"
                value={formData.accessCode}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.accessCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                placeholder="Enter your access code"
              />
              {errors.accessCode && <p className="mt-1 text-sm text-red-500">{errors.accessCode}</p>}
            </div>
            
            <div className="mb-8">
              <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                id="createdBy"
                name="createdBy"
                value={formData.createdBy}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border ${errors.createdBy ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500`}
                placeholder="your@email.com"
              />
              {errors.createdBy && <p className="mt-1 text-sm text-red-500">{errors.createdBy}</p>}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 