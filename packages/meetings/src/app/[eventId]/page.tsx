"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MeetingEvent } from "@/models/meeting";
import CalendarView from "@/components/CalendarView";
import CalendarWeekView from "@/components/CalendarWeekView";

interface AvailabilityTimeRange {
  start: string;
  end: string;
}

interface AvailabilityDate {
  date: string;
  timeRanges: AvailabilityTimeRange[];
}

// Define interface for calendar events
interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: string;
  end: string;
  allDay: boolean;
}

export default function MeetingEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const searchParams = useSearchParams();
  const authSuccess = searchParams.get('auth') === 'success';
  const authProvider = searchParams.get('provider');
  const userId = searchParams.get('userId');
  
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState("");
  const [availableDates, setAvailableDates] = useState<AvailabilityDate[]>([]);
  const [provider, setProvider] = useState<string>("manual");
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [travelBuffer, setTravelBuffer] = useState<number>(0); // Travel buffer in minutes
  const [earliestStartTime, setEarliestStartTime] = useState<string>("08:00"); // Default earliest start time
  const [latestEndTime, setLatestEndTime] = useState<string>("21:00"); // Default latest end time
  
    // Function to populate availability from calendar events
  // This function is called when Google Calendar events are fetched or when the event data itself changes.
  // It merges existing calendar events with the user's preferred time ranges defined by the event settings.
    const populateAvailabilityFromCalendar = useCallback((events: GoogleCalendarEvent[]) => {
      if (!event) return;
      
      console.log(`Populating availability from ${events.length} calendar events`);
      
      // Ensure we have dates to work with - if availableDates is empty
      // but we have events, generate dates based on the events
      if (availableDates.length === 0 && events.length > 0) {
        console.log("No available dates found, generating from events");
        // Extract unique dates from events
        const uniqueDates = new Set<string>();
        
        events.forEach(calEvent => {
          try {
            const startDate = new Date(calEvent.start);
            uniqueDates.add(startDate.toISOString().split('T')[0]);
            
            // Add a few days before and after to give context
            for (let i = -3; i <= 3; i++) {
              const contextDate = new Date(startDate);
              contextDate.setDate(contextDate.getDate() + i);
              uniqueDates.add(contextDate.toISOString().split('T')[0]);
            }
          } catch (error) {
            console.error("Error parsing event date:", calEvent.start, error);
          }
        });
        
        // Convert the set to an array and sort
        const dateArray = Array.from(uniqueDates).sort();
        
        // Create availableDates array
        const newDates: AvailabilityDate[] = dateArray.map(date => ({
          date,
          timeRanges: []
        }));
        
        console.log(`Generated ${newDates.length} dates from events`);
        setAvailableDates(newDates);
        
        // Return early since we just updated availableDates
        // The effect will trigger another call to this function
        return;
      }
      
      // Create a new array of availability dates using calendar events
      const newAvailableDates = [...availableDates];
      
      // Create a map of busy times by date
      const busyTimesByDate: Record<string, Array<{start: string, end: string}>> = {};
      
      // Process each event and mark the time as unavailable
      events.forEach(calEvent => {
        let startDateTime: Date;
        let endDateTime: Date;
        
        if (calEvent.allDay) {
          // For all-day events, mark the entire day as busy
          startDateTime = new Date(`${calEvent.start}T00:00:00`);
          endDateTime = new Date(`${calEvent.end}T23:59:59`);
        } else {
          startDateTime = new Date(calEvent.start);
          endDateTime = new Date(calEvent.end);
        }
        
        // Get date strings for each day that the event spans
        const currentDate = new Date(startDateTime);
        while (currentDate <= endDateTime) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          if (!busyTimesByDate[dateString]) {
            busyTimesByDate[dateString] = [];
          }
          
          // Add the busy time for this day
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const eventStart = new Date(
            Math.max(startDateTime.getTime(), dayStart.getTime())
          );
          const eventEnd = new Date(
            Math.min(endDateTime.getTime(), dayEnd.getTime())
          );
          
          busyTimesByDate[dateString].push({
            start: eventStart.toTimeString().substring(0, 5),
            end: eventEnd.toTimeString().substring(0, 5)
          });
          
          // Move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      console.log('Busy times by date:', busyTimesByDate);
      
      // Define time preferences based on the event settings
      let preferredStartHour = 9; // Default to 9 AM
      let preferredEndHour = 17; // Default to 5 PM
      
    if (event.timePreferences && event.timePreferences.partOfDay.includes('morning')) {
        preferredStartHour = 8;
        preferredEndHour = 12;
    } else if (event.timePreferences && event.timePreferences.partOfDay.includes('afternoon')) {
        preferredStartHour = 12;
        preferredEndHour = 17;
    } else if (event.timePreferences && event.timePreferences.partOfDay.includes('evening')) {
        preferredStartHour = 17;
        preferredEndHour = 21;
      }
      
      // Adjust for early/late preference
    if (event.timePreferences && event.timePreferences.earlyLate === 'early') {
        preferredStartHour = Math.max(preferredStartHour - 1, 6);
        preferredEndHour = Math.max(preferredEndHour - 1, preferredStartHour + 2);
    } else if (event.timePreferences && event.timePreferences.earlyLate === 'late') {
        preferredStartHour = Math.min(preferredStartHour + 1, 22 - 2);
        preferredEndHour = Math.min(preferredEndHour + 1, 22);
      }
      
      // Format hours as strings with leading zeros
      const formatHour = (hour: number): string => {
        return hour.toString().padStart(2, '0') + ':00';
      };
      
      // For each date in our available dates
      newAvailableDates.forEach((dateItem, dateIndex) => {
        const dateString = dateItem.date;
        const busyTimes = busyTimesByDate[dateString] || [];
        
        if (busyTimes.length === 0) {
          // If no busy times, the entire preferred time range is available
          newAvailableDates[dateIndex].timeRanges = [{
            start: formatHour(preferredStartHour),
            end: formatHour(preferredEndHour)
          }];
        } else {
          // If there are busy times, we need to find available slots
          // This is a simplified version that adds available times between busy periods
          
          // Sort busy times by start time
          const busyTimesArray = busyTimes as Array<{start: string, end: string}>;
          busyTimesArray.sort((a: {start: string, end: string}, b: {start: string, end: string}) => a.start.localeCompare(b.start));
          
          // Start with the preferred start time
          let currentStart = formatHour(preferredStartHour);
          const availableSlots: AvailabilityTimeRange[] = [];
          
          // Check each busy period and add available slots between them
          for (const busyPeriod of busyTimesArray) {
            if (busyPeriod.start > currentStart && busyPeriod.start <= formatHour(preferredEndHour)) {
              availableSlots.push({
                start: currentStart,
                end: busyPeriod.start
              });
            }
            
            // Update current start to after this busy period
            if (busyPeriod.end > currentStart) {
              currentStart = busyPeriod.end;
            }
          }
          
          // Add a final slot if there's time after the last busy period
          if (currentStart < formatHour(preferredEndHour)) {
            availableSlots.push({
              start: currentStart,
              end: formatHour(preferredEndHour)
            });
          }
          
          // Filter out very short slots (less than event duration)
        const eventDurationMinutes = event.duration ?? 60; // Default to 60 minutes if not set
        const eventDurationHours = Math.max(1, Math.ceil(eventDurationMinutes / 60));
          const filteredSlots = availableSlots.filter(slot => {
            const startHours = parseInt(slot.start.split(':')[0]);
            const endHours = parseInt(slot.end.split(':')[0]);
            return (endHours - startHours) >= eventDurationHours;
          });
          
          newAvailableDates[dateIndex].timeRanges = filteredSlots;
        }
      });
      
      setAvailableDates(newAvailableDates);
    }, [event, availableDates]);
  
    // Function to fetch Google Calendar events
  const fetchGoogleCalendarEvents = useCallback(async (uid: string) => {
      if (!event) return;
      
      setCalendarLoading(true);
      try {
        console.log(`Fetching calendar events for userId: ${uid}`);
        const response = await fetch(
          `/api/meetings/calendar/google?` +
          `eventId=${eventId}&` +
          `userId=${uid}&` +
          `startDate=${event.dateRangeStart}&` +
          `endDate=${event.dateRangeEnd}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Received ${data.events ? data.events.length : 0} calendar events`);
        console.log('Calendar events:', data.events);
        
        // Set the calendar events state first
        setCalendarEvents(data.events);
        
        // Then pass the actual data to the function instead of using the state variable
        populateAvailabilityFromCalendar(data.events);
      } catch (err) {
        console.error("Error fetching calendar events:", err);
        alert(`Failed to fetch calendar events: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setCalendarLoading(false);
      }
    }, [event, eventId, populateAvailabilityFromCalendar]);
    
  // Load event data on initial component mount or when eventId changes.
  // This fetches the core details of the meeting event.
  useEffect(() => {
    // Reset submitSuccess to false on component mount to ensure form is visible
    setSubmitSuccess(false);
    
    const fetchEvent = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/meetings/events/${eventId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch event details');
        }
        const data = await response.json();
        setEvent(data);

        // Initialize availableDates based on event's dateRange if available
        if (data.dateRangeStart && data.dateRangeEnd) {
          const dates = [];
          const currentDate = new Date(data.dateRangeStart || new Date().toISOString());
          const endDate = new Date(data.dateRangeEnd || new Date().toISOString());
      
          // Ensure endDate is after currentDate
          if (endDate < currentDate) {
            endDate.setDate(currentDate.getDate() + 7); // Default to a 7 day range if end is before start
          }

        while (currentDate <= endDate) {
          dates.push({
            date: currentDate.toISOString().split('T')[0],
            timeRanges: []
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      setAvailableDates(dates);
        } else {
          // Fallback: generate a few days around today if no date range
          const dates = [];
      const today = new Date();
          for (let i = -3; i <= 3; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push({
              date: d.toISOString().split('T')[0],
          timeRanges: []
        });
          }
          setAvailableDates(dates);
      }
      
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
    }
    };
    
    fetchEvent();
  }, [eventId]);

  // Handle Google Calendar data if auth was successful and event data is loaded.
  // This effect triggers after a successful Google OAuth flow or if relevant query params are present.
  useEffect(() => {
    if (authSuccess && authProvider === 'google' && userId && event) {
      // Set the provider to Google Calendar
      setProvider('google');
      
      // Fetch the connection data to get the email
      const fetchConnectionData = async () => {
        try {
          const connectionResponse = await fetch(
            `/api/meetings/connection?eventId=${eventId}&userId=${userId}`
          );
          
          if (connectionResponse.ok) {
            const connectionData = await connectionResponse.json();
            if (connectionData.email) {
              setEmail(connectionData.email);
            }
          }
        } catch (err) {
          console.error("Error fetching connection data:", err);
        }
      };
      
      fetchConnectionData();
      
      // We've just returned from a successful Google auth
      fetchGoogleCalendarEvents(userId);
    }
  }, [authSuccess, authProvider, userId, event, eventId, fetchGoogleCalendarEvents]);

  // Function to initiate Google OAuth
  const connectGoogleCalendar = () => {
    if (!email) {
      alert("Please enter your email address first");
      return;
    }
    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    // Redirect to Google OAuth endpoint
    window.location.href = `/api/auth/google?eventId=${eventId}&email=${encodeURIComponent(email)}`;
  };
  
  const handleAddTimeRange = (dateIndex: number) => {
    setAvailableDates(prev => {
      const newDates = [...prev];
      newDates[dateIndex] = {
        ...newDates[dateIndex],
        timeRanges: [
          ...newDates[dateIndex].timeRanges,
          { start: "09:00", end: "17:00" }
        ]
      };
      return newDates;
    });
  };
  
  const handleRemoveTimeRange = (dateIndex: number, rangeIndex: number) => {
    setAvailableDates(prev => {
      const newDates = [...prev];
      const newTimeRanges = [...newDates[dateIndex].timeRanges];
      newTimeRanges.splice(rangeIndex, 1);
      
      newDates[dateIndex] = {
        ...newDates[dateIndex],
        timeRanges: newTimeRanges
      };
      
      return newDates;
    });
  };
  
  const handleTimeRangeChange = (
    dateIndex: number, 
    rangeIndex: number, 
    field: 'start' | 'end', 
    value: string
  ) => {
    setAvailableDates(prev => {
      const newDates = [...prev];
      const newTimeRanges = [...newDates[dateIndex].timeRanges];
      
      newTimeRanges[rangeIndex] = {
        ...newTimeRanges[rangeIndex],
        [field]: value
      };
      
      newDates[dateIndex] = {
        ...newDates[dateIndex],
        timeRanges: newTimeRanges
      };
      
      return newDates;
    });
  };
  
  // Handles the submission of the user's availability to the backend.
  // It constructs a payload with the selected time slots, email, and other preferences.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    // Basic email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    // Ensure at least one time slot is selected
    const hasSelectedTime = availableDates.some(date => 
      date.timeRanges.some(range => (range as any).selected) // Check for a 'selected' marker if it exists
    );
    // Or, if not using 'selected' marker, check if any time ranges are defined at all
    const hasAnyTimeRange = availableDates.some(date => date.timeRanges.length > 0);
    
    if (!hasSelectedTime && !hasAnyTimeRange) {
       setError("Please select at least one available time slot.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    setError(null);

    const availabilityData = {
      eventId: event.id,
      userId: userId || email, 
      email: email,
      name: "", // Add a name field if you collect it, otherwise remove or set default
      availableDates: availableDates.map(ad => ({
        date: ad.date,
        timeRanges: ad.timeRanges.map(tr => ({
          start: `${ad.date}T${tr.start}:00`, // Assuming tr.start is HH:MM
          end: `${ad.date}T${tr.end}:00`     // Assuming tr.end is HH:MM
        }))
      })).filter(ad => ad.timeRanges.length > 0), // Only submit dates with actual time ranges
      provider: provider,
      timePreferences: event.timePreferences ? {
        partOfDay: event.timePreferences.partOfDay || ['any'],
        earlyLate: event.timePreferences.earlyLate || 'any',
        daysOfWeek: event.timePreferences.daysOfWeek // This can be undefined if not set
      } : { partOfDay: ['any'], earlyLate: 'any' }, // Provide default if event.timePreferences is undefined
      travelBuffer: Number(travelBuffer) || 0, 
    };

    try {
      const response = await fetch(`/api/meetings/events/${event.id}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(availabilityData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit availability. Please try again.' }));
        throw new Error(errorData.message || 'Failed to submit availability.');
      }
      
      setSubmitSuccess(true);
      // Optionally, clear form or redirect
      // setEmail(""); 
      // setAvailableDates([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle updating availability from the calendar view
  const handleUpdateAvailability = (newDates: AvailabilityDate[]) => {
    setAvailableDates(newDates);
  };

  // Always render the calendar component to help with debugging
  // This ensures we can see if dates/events are populated
  const renderCalendarView = () => {
    return (
      <>
        <CalendarView 
          dates={availableDates}
          events={calendarEvents}
          onAddTimeRange={handleAddTimeRange}
          onRemoveTimeRange={handleRemoveTimeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">Debug info: availableDates: {availableDates.length}, events: {calendarEvents.length}</p>
        </div>
      </>
    );
  };

  // Log state changes that would affect visibility
  useEffect(() => {
    console.log("State changed: submitSuccess =", submitSuccess, "loading =", loading, "error =", error);
  }, [submitSuccess, loading, error]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-red-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading event details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-16">
          <Link href="/meetings" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Meetings
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
              <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Error</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Link
              href="/meetings"
              className="inline-flex items-center px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
            >
              Return to Meetings Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-16">
          <Link href="/meetings" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Meetings
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-4xl mx-auto mb-12">
            <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-green-600 dark:text-green-400">Availability Submitted!</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Thank you for submitting your availability for {event?.title}. The organizer will schedule the event based on everyone&apos;s availability and you&apos;ll receive a notification once the schedule is finalized.
              </p>
            </div>
            
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              Your Submitted Availability
            </h2>
            
            <form className="space-y-8">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Calendar Integration
                </label>
                
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="inline-flex items-center">
                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                      {provider === 'manual' ? 'Manual Entry' : 
                       provider === 'google' ? 'Google Calendar' : 
                       provider === 'outlook' ? 'Outlook Calendar' : 
                       provider === 'apple' ? 'Apple Calendar' : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Your Available Dates and Times
                </h3>
                {renderCalendarView()}
              </div>
              
              <div className="flex justify-end pt-6">
                <Link
                  href="/meetings"
                  className="px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Return to Meetings Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <Link href="/meetings" className="inline-flex items-center text-red-600 hover:text-red-800 mb-8">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Meetings
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            {event?.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mb-2">
            {event?.objective || 'Not specified'}
          </p>
          <p className="text-gray-600 dark:text-gray-300 mb-1">
            <span className="font-semibold">Location:</span> {event?.location || 'Not specified'}
          </p>
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">Created By:</span> {event?.createdBy || 'Unknown'}
          </p>
        </header>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Share Your Availability
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calendar Integration (Optional)
              </label>
              
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="provider"
                    value="manual"
                    checked={provider === "manual"}
                    onChange={() => setProvider("manual")}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Manual Entry</span>
                </label>
                
                <label className={`inline-flex items-center ${authSuccess && authProvider === 'google' ? '' : 'opacity-80'}`}>
                  <input
                    type="radio"
                    name="provider"
                    value="google"
                    checked={provider === "google"}
                    onChange={() => setProvider("google")}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    disabled={!(authSuccess && authProvider === 'google')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Google Calendar</span>
                </label>
                
                <label className="inline-flex items-center opacity-50 cursor-not-allowed">
                  <input
                    type="radio"
                    name="provider"
                    value="outlook"
                    disabled
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Outlook Calendar</span>
                </label>
                
                <label className="inline-flex items-center opacity-50 cursor-not-allowed">
                  <input
                    type="radio"
                    name="provider"
                    value="apple"
                    disabled
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Apple Calendar</span>
                </label>
              </div>
              
              {authSuccess && authProvider === 'google' ? (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-600 dark:text-green-400">Google Calendar Connected</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your Google Calendar has been connected successfully. We&apos;ve auto-populated available times based on your calendar events.
                  </p>
                </div>
              ) : (
                <div className="flex mb-6">
                  <button
                    type="button"
                    onClick={connectGoogleCalendar}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.177-3.088v-3.671h-2.5v-2.5h6.354v6.171h-3.854z" fill="#4285F4" />
                      <path d="M12 6.059c-3.283 0-5.941 2.658-5.941 5.941s2.658 5.941 5.941 5.941 5.941-2.658 5.941-5.941S15.283 6.059 12 6.059z" fill="#4285F4" />
                    </svg>
                    Connect Google Calendar
                  </button>
                </div>
              )}
            </div>
            
            {calendarLoading && (
              <div className="flex items-center justify-center py-4">
                <svg className="animate-spin h-5 w-5 text-red-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading calendar events...</span>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Select Available Dates and Times
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Click on suggested time slots (dotted outline) that work for you. Your existing calendar events are shown for reference.
              </p>
              
              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-green-600 dark:text-green-400">Availability Submitted!</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Thank you for submitting your availability. You can make further changes and submit again if needed.
                  </p>
                </div>
              )}
              
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Your Availability</h3>
                <CalendarWeekView 
                  dates={availableDates}
                  events={calendarEvents}
                  eventPreferences={{
                    duration: event?.duration ?? 60,
                    timePreferences: event?.timePreferences || { partOfDay: ['any'], earlyLate: 'any' }
                  }}
                  onUpdateAvailability={handleUpdateAvailability}
                  travelBuffer={travelBuffer}
                  onTravelBufferChange={setTravelBuffer}
                  earliestStartTime={earliestStartTime}
                  latestEndTime={latestEndTime}
                  onEarliestStartTimeChange={setEarliestStartTime}
                  onLatestEndTimeChange={setLatestEndTime}
                />
              </div>

              {/* Keep the debug view for now for debugging */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">Debug info: availableDates: {availableDates.length}, events: {calendarEvents.length}</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Availability'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 