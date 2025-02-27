"use client";

import { useState, useRef } from "react";
import { useFormState } from "react-dom";
import { useFormStatus } from "react-dom";

type FormState = {
  success?: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    organization?: string[];
    event?: string[];
    message?: string[];
    _form?: string[];
  };
};

// Submit Button Component with loading state
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full ${
        pending 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-red-600 hover:bg-red-700"
      } text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center`}
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Sending...
        </>
      ) : (
        "Send Inquiry"
      )}
    </button>
  );
}

export default function ContactForm({ 
  sendContactEmail 
}: { 
  sendContactEmail: (formData: FormData) => Promise<FormState> 
}) {
  // Initialize form state with a wrapper function that handles the form data
  const formActionWrapper = async (prevState: FormState, formData: FormData) => {
    const result = await sendContactEmail(formData);
    if (result.success) {
      setSubmitted(true);
      formRef.current?.reset();
    }
    return result;
  };
  
  const [state, formAction] = useFormState(formActionWrapper, {});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Thank You!</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your message has been sent successfully. Wes will get back to you soon.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.errors?._form && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {state.errors._form.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          className={`w-full px-4 py-2 border ${
            state.errors?.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="John Smith"
          required
        />
        {state.errors?.name && (
          <p className="mt-1 text-sm text-red-500">{state.errors.name[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className={`w-full px-4 py-2 border ${
            state.errors?.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="john@example.com"
          required
        />
        {state.errors?.email && (
          <p className="mt-1 text-sm text-red-500">{state.errors.email[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Organization
        </label>
        <input
          type="text"
          id="organization"
          name="organization"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Your Company"
        />
      </div>
      
      <div>
        <label htmlFor="event" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Event Type <span className="text-red-500">*</span>
        </label>
        <select
          id="event"
          name="event"
          className={`w-full px-4 py-2 border ${
            state.errors?.event ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          required
        >
          <option value="">Select Event Type</option>
          <option value="conference">Conference</option>
          <option value="corporate">Corporate Event</option>
          <option value="workshop">Workshop/Training</option>
          <option value="panel">Panel Discussion</option>
          <option value="other">Other</option>
        </select>
        {state.errors?.event && (
          <p className="mt-1 text-sm text-red-500">{state.errors.event[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={`w-full px-4 py-2 border ${
            state.errors?.message ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          } rounded-lg focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
          placeholder="Please provide details about your event, dates, location, and any specific topics you're interested in."
          required
        ></textarea>
        {state.errors?.message && (
          <p className="mt-1 text-sm text-red-500">{state.errors.message[0]}</p>
        )}
      </div>
      
      <SubmitButton />
    </form>
  );
} 