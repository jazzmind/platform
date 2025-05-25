import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface CalendarEvent {
  id: string;
  summary?: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface AvailabilityTimeRange {
  start: string;
  end: string;
  selected?: boolean;
}

interface AvailabilityDate {
  date: string;
  timeRanges: AvailabilityTimeRange[];
}

interface MeetingEventPreferences {
  duration: number;  // in minutes
  timePreferences: {
    partOfDay: string[];
    earlyLate: string;
  };
}

interface CalendarWeekViewProps {
  dates: AvailabilityDate[];
  events: CalendarEvent[];
  eventPreferences: MeetingEventPreferences;
  onUpdateAvailability: (newDates: AvailabilityDate[]) => void;
  travelBuffer: number; // in minutes
  onTravelBufferChange: (minutes: number) => void;
  earliestStartTime: string; // format: "HH:MM" 
  latestEndTime: string; // format: "HH:MM"
  onEarliestStartTimeChange: (time: string) => void;
  onLatestEndTimeChange: (time: string) => void;
}

// Hours to display in the calendar (8am to 9pm)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

// Time slot interval in minutes
const TIME_SLOT_INTERVAL = 15;

// Calculate slots per hour
const SLOTS_PER_HOUR = 60 / TIME_SLOT_INTERVAL;

// Pixel height per hour - increased for better spacing
const HOUR_HEIGHT = 100; // Increased from 60px (default value) for more vertical space

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  dates,
  events,
  eventPreferences,
  onUpdateAvailability,
  travelBuffer,
  onTravelBufferChange,
  earliestStartTime,
  latestEndTime,
  onEarliestStartTimeChange,
  onLatestEndTimeChange
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Default to current week, but use dates from props if available
    if (dates.length > 0) {
      return new Date(dates[0].date);
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [potentialTimeSlots, setPotentialTimeSlots] = useState<Array<{
    day: string;
    startTime: string;
    endTime: string;
    startSlot: number;
    durationSlots: number;
    isSelected: boolean;
  }>>([]);
  
  // Format time (8 => "8:00 AM")
  const formatTime = (hour: number, minutes: number = 0): string => {
    const date = new Date();
    date.setHours(hour, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: minutes === 0 ? undefined : '2-digit',
      hour12: true 
    });
  };
  
  // Convert slot index to hours and minutes
  const slotToTime = (slot: number): { hour: number; minute: number } => {
    const hour = Math.floor(slot / SLOTS_PER_HOUR) + 8; // 8 is our start hour
    const minute = (slot % SLOTS_PER_HOUR) * TIME_SLOT_INTERVAL;
    return { hour, minute };
  };
  
  // Check if a slot is within the preferred time ranges
  const isPreferredTime = useCallback((hour: number): boolean => {
    const { partOfDay, earlyLate } = eventPreferences.timePreferences;
    
    // Base time preferences
    let isPreferred = false;
    
    if (partOfDay.includes('morning') && hour >= 8 && hour < 12) {
      isPreferred = true;
    } else if (partOfDay.includes('afternoon') && hour >= 12 && hour < 17) {
      isPreferred = true;
    } else if (partOfDay.includes('evening') && hour >= 17 && hour < 21) {
      isPreferred = true;
    }
    
    // Adjust for early/late preference
    if (earlyLate === 'early' && hour >= 7 && hour < 10) {
      isPreferred = true;
    } else if (earlyLate === 'late' && hour >= 18 && hour < 22) {
      isPreferred = true;
    }
    
    return isPreferred;
  }, [eventPreferences.timePreferences]);
  
  // Initialize calendar days based on current week and the dates prop.
  // This ensures the calendar displays the correct week, defaulting to the week of the first available date or current week.
  useEffect(() => {
    const days = eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
    });
    setCalendarDays(days);
  }, [currentWeekStart]);
  
  // Generate potential time slots based on calendar events, user-defined constraints (earliest/latest times),
  // event preferences (duration, preferred times), and travel buffer.
  // This is the core logic for suggesting clickable time slots to the user.
  useEffect(() => {
    if (calendarDays.length === 0 || events.length === 0) return;
    
    const eventDurationInMinutes = eventPreferences.duration;
    const eventDurationInSlots = Math.ceil(eventDurationInMinutes / TIME_SLOT_INTERVAL);
    
    // Parse earliest and latest time constraints
    const [earliestHour, earliestMinute] = earliestStartTime.split(':').map(Number);
    const [latestHour, latestMinute] = latestEndTime.split(':').map(Number);
    
    // Convert to slot indexes
    const earliestSlot = (earliestHour - 8) * SLOTS_PER_HOUR + Math.floor(earliestMinute / TIME_SLOT_INTERVAL);
    const latestSlot = (latestHour - 8) * SLOTS_PER_HOUR + Math.floor(latestMinute / TIME_SLOT_INTERVAL);
    
    // Calculate buffer in slots
    const bufferSlots = Math.ceil(travelBuffer / TIME_SLOT_INTERVAL);
    
    const newPotentialSlots: Array<{
      day: string;
      startTime: string;
      endTime: string;
      startSlot: number;
      durationSlots: number;
      isSelected: boolean;
    }> = [];
    
    // Process each calendar day
    calendarDays.forEach(day => {
      const dateString = format(day, 'yyyy-MM-dd');
      
      // Get existing events for this day
      const dayEvents = events.filter(event => {
        const eventStartDate = new Date(event.start);
        return format(eventStartDate, 'yyyy-MM-dd') === dateString;
      });
      
      // Create an array representing all time slots for the day
      // true = busy, false = available
      const busySlots = Array(HOURS.length * SLOTS_PER_HOUR).fill(false);
      
      // Mark slots outside of earliest/latest window as busy
      for (let i = 0; i < busySlots.length; i++) {
        if (i < earliestSlot || i >= latestSlot) {
          busySlots[i] = true;
        }
      }
      
      // Mark busy slots based on existing events
      dayEvents.forEach(event => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        if (event.allDay) {
          // Mark entire day as busy
          busySlots.fill(true);
        } else {
          const startHour = startDate.getHours();
          const startMinute = startDate.getMinutes();
          const endHour = endDate.getHours();
          const endMinute = endDate.getMinutes();
          
          const startSlot = (startHour - 8) * SLOTS_PER_HOUR + Math.floor(startMinute / TIME_SLOT_INTERVAL);
          const endSlot = (endHour - 8) * SLOTS_PER_HOUR + Math.ceil(endMinute / TIME_SLOT_INTERVAL);
          
          // Apply buffer before and after event
          const bufferStartSlot = Math.max(0, startSlot - bufferSlots);
          const bufferEndSlot = Math.min(busySlots.length - 1, endSlot + bufferSlots);
          
          for (let i = bufferStartSlot; i < bufferEndSlot; i++) {
            if (i >= 0 && i < busySlots.length) {
              busySlots[i] = true;
            }
          }
        }
      });
      
      // Track already suggested time ranges to avoid overlaps
      const suggestedRanges: Array<{start: number, end: number}> = [];
      
      // Find continuous available blocks that can fit the event
      for (let slot = earliestSlot; slot <= latestSlot - eventDurationInSlots; slot++) {
        // Check if this slot starts a continuous available block
        let blockLength = 0;
        for (let i = 0; i < eventDurationInSlots; i++) {
          if (!busySlots[slot + i]) {
            blockLength++;
          } else {
            break;
          }
        }
        
        // If we found a continuous block long enough
        if (blockLength >= eventDurationInSlots) {
          // Find the end of this available block to determine max possible duration
          let maxBlockLength = blockLength;
          while (slot + maxBlockLength < latestSlot && !busySlots[slot + maxBlockLength]) {
            maxBlockLength++;
          }
          
          // Convert start slot to time
          const { hour: startHour, minute: startMinute } = slotToTime(slot);
          
          // Check if this block is in preferred time
          if (isPreferredTime(startHour)) {
            // Calculate end time (using actual event duration, not the entire available block)
            // Limit the block to the event duration to avoid very long blocks
            const actualDurationSlots = Math.min(maxBlockLength, eventDurationInSlots * 2);
            const { hour: endHour, minute: endMinute } = slotToTime(slot + actualDurationSlots);
            
            // Convert to 24-hour format for comparison
            const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            
            // Check if this slot is already selected in availableDates
            const dateEntry = dates.find(d => d.date === dateString);
            let isSelected = false;
            
            if (dateEntry) {
              isSelected = dateEntry.timeRanges.some(
                range => range.start === startTimeStr && range.end === endTimeStr
              );
            }
            
            // Check if this range overlaps with already suggested ranges
            const overlapsWithExisting = suggestedRanges.some(range => {
              return (slot >= range.start && slot < range.end) || 
                    (slot + actualDurationSlots > range.start && slot + actualDurationSlots <= range.end) ||
                    (range.start >= slot && range.start < slot + actualDurationSlots);
            });
            
            if (!overlapsWithExisting) {
              newPotentialSlots.push({
                day: dateString,
                startTime: formatTime(startHour, startMinute),
                endTime: formatTime(endHour, endMinute),
                startSlot: slot,
                durationSlots: actualDurationSlots,
                isSelected
              });
              
              // Add to the list of suggested ranges
              suggestedRanges.push({
                start: slot,
                end: slot + actualDurationSlots
              });
              
              // Skip ahead to avoid overlapping suggestions
              slot += actualDurationSlots - 1;
            }
          }
        }
      }
    });
    
    setPotentialTimeSlots(newPotentialSlots);
  }, [calendarDays, events, eventPreferences.duration, eventPreferences.timePreferences, dates, earliestStartTime, latestEndTime, travelBuffer, isPreferredTime]);
  
  // Handle clicking on a potential time slot
  const handleTimeSlotClick = (day: string, startTime: string, endTime: string) => {
    // Convert display time to 24-hour format for storage
    const parseDisplayTime = (displayTime: string): string => {
      const [time, period] = displayTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours, 10);
      
      if (period === 'PM' && hour < 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minutes || '00'}`;
    };
    
    const formattedStartTime = parseDisplayTime(startTime);
    const formattedEndTime = parseDisplayTime(endTime);
    
    // Apply travel buffer if set
    let adjustedStartTime = formattedStartTime;
    let adjustedEndTime = formattedEndTime;
    
    if (travelBuffer > 0) {
      // Adjust start time earlier by travel buffer
      const [startHours, startMinutes] = formattedStartTime.split(':');
      const startDate = new Date();
      startDate.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10) - travelBuffer);
      adjustedStartTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      
      // Adjust end time later by travel buffer
      const [endHours, endMinutes] = formattedEndTime.split(':');
      const endDate = new Date();
      endDate.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10) + travelBuffer);
      adjustedEndTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Update the dates array with the new selection
    const newDates = [...dates];
    const dateIndex = newDates.findIndex(d => d.date === day);
    
    if (dateIndex >= 0) {
      // Check if this time range already exists
      const existingRangeIndex = newDates[dateIndex].timeRanges.findIndex(
        range => range.start === adjustedStartTime && range.end === adjustedEndTime
      );
      
      if (existingRangeIndex >= 0) {
        // Remove if already selected
        newDates[dateIndex].timeRanges.splice(existingRangeIndex, 1);
      } else {
        // Add new time range
        newDates[dateIndex].timeRanges.push({
          start: adjustedStartTime,
          end: adjustedEndTime,
          selected: true
        });
      }
    } else {
      // Add new date with time range
      newDates.push({
        date: day,
        timeRanges: [{
          start: adjustedStartTime,
          end: adjustedEndTime,
          selected: true
        }]
      });
    }
    
    // Update parent component
    onUpdateAvailability(newDates);
  };
  
  // Navigate to previous/next week
  const navigateToPreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };
  
  const navigateToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };
  
  // Render time grid for a single day
  const renderDayGrid = (day: Date) => {
    const dateString = format(day, 'yyyy-MM-dd');
    
    // Get events for this day
    const dayEvents = events.filter(event => {
      const eventStartDate = new Date(event.start);
      return format(eventStartDate, 'yyyy-MM-dd') === dateString;
    });
    
    // Get potential slots for this day
    const daySuggestions = potentialTimeSlots.filter(slot => slot.day === dateString);
    
    return (
      <div className="relative bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Events */}
        {dayEvents.map(event => {
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          
          if (event.allDay) {
            return (
              <div 
                key={event.id} 
                className="absolute left-0 right-0 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-1 z-10 text-xs"
                style={{ top: '0px', height: '24px' }}
              >
                <div className="truncate font-medium">{event.summary || "All-day event"}</div>
              </div>
            );
          }
          
          const startHour = startDate.getHours();
          const startMinute = startDate.getMinutes();
          const startPosition = ((startHour - 8) * 60 + startMinute) * (HOUR_HEIGHT / 60);
          
          const endHour = endDate.getHours();
          const endMinute = endDate.getMinutes();
          const endPosition = ((endHour - 8) * 60 + endMinute) * (HOUR_HEIGHT / 60);
          
          const duration = endPosition - startPosition;
          
          return (
            <div 
              key={event.id} 
              className="absolute left-1 right-1 bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded p-1 z-10 overflow-hidden"
              style={{ 
                top: `${startPosition}px`, 
                height: `${Math.max(duration, 24)}px`,
                minHeight: '24px'
              }}
            >
              <div className="truncate text-xs font-medium">{event.summary || "Busy"}</div>
              <div className="truncate text-xs">
                {formatTime(startHour, startMinute)} - {formatTime(endHour, endMinute)}
              </div>
            </div>
          );
        })}
        
        {/* Suggested time slots */}
        {daySuggestions.map((slot, idx) => {
          const startSlotTime = slotToTime(slot.startSlot);
          
          const startPosition = ((startSlotTime.hour - 8) * 60 + startSlotTime.minute) * (HOUR_HEIGHT / 60);
          const duration = slot.durationSlots * (HOUR_HEIGHT / (60 / TIME_SLOT_INTERVAL));
          
          const isSelected = slot.isSelected;
          
          return (
            <div 
              key={`${slot.day}-${idx}`}
              className={`absolute left-1 right-1 border-2 border-dashed rounded p-1 z-20 cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500' 
                  : 'bg-gray-50 dark:bg-gray-700/30 border-gray-400 hover:bg-green-50 dark:hover:bg-green-900/10'
              }`}
              style={{ 
                top: `${startPosition}px`, 
                height: `${Math.max(duration, 24)}px`,
                minHeight: '24px'
              }}
              onClick={() => handleTimeSlotClick(slot.day, slot.startTime, slot.endTime)}
            >
              <div className="truncate text-xs font-medium">
                {isSelected ? 'Available' : 'Suggested'}
              </div>
              <div className="truncate text-xs">
                {slot.startTime} - {slot.endTime}
              </div>
            </div>
          );
        })}
        
        {/* Hour grid lines */}
        {HOURS.map((hour) => (
          <div 
            key={hour} 
            className="border-t border-gray-200 dark:border-gray-700 relative"
            style={{ height: `${HOUR_HEIGHT}px` }}
          >
            <div className="absolute -top-2 -left-8 text-xs text-gray-500">
              {formatTime(hour)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <div className="grid grid-cols-1 gap-4">
        {/* Event Details Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">Event Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {eventPreferences.duration >= 60 
                    ? `${Math.floor(eventPreferences.duration / 60)} hour${Math.floor(eventPreferences.duration / 60) !== 1 ? 's' : ''}${eventPreferences.duration % 60 > 0 ? ` ${eventPreferences.duration % 60} minutes` : ''}`
                    : `${eventPreferences.duration} minutes`
                  }
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Preferred Time</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {eventPreferences.timePreferences.partOfDay.length > 0 
                    ? eventPreferences.timePreferences.partOfDay.map(time => 
                      time.charAt(0).toUpperCase() + time.slice(1)
                    ).join(', ')
                    : 'Any time'
                  }
                  {eventPreferences.timePreferences.earlyLate && 
                    ` (${eventPreferences.timePreferences.earlyLate === 'early' ? 'Earlier' : 'Later'} preferred)`
                  }
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Range</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  From {new Date(`2023-01-01T${earliestStartTime}`).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})} 
                  to {new Date(`2023-01-01T${latestEndTime}`).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Travel buffer and time controls in one header row */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <label htmlFor="travel-buffer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-3 whitespace-nowrap">
                  Travel Buffer:
                </label>
                <select
                  id="travel-buffer"
                  value={travelBuffer}
                  onChange={(e) => onTravelBufferChange(parseInt(e.target.value, 10))}
                  className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white px-3 py-1 text-sm"
                >
                  <option value="0">No buffer</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
                <div className="ml-2 text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  {travelBuffer > 0 ? `Adding ${travelBuffer} minutes before/after` : 'No travel time'}
                </div>
              </div>

              <div className="flex items-center">
                <label htmlFor="earliest-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-3 whitespace-nowrap">
                  Earliest Start:
                </label>
                <select
                  id="earliest-start"
                  value={earliestStartTime}
                  onChange={(e) => onEarliestStartTimeChange(e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white px-3 py-1 text-sm"
                >
                  <option value="06:00">6:00 AM</option>
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                </select>
              </div>

              <div className="flex items-center">
                <label htmlFor="latest-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-3 whitespace-nowrap">
                  Latest End:
                </label>
                <select
                  id="latest-end"
                  value={latestEndTime}
                  onChange={(e) => onLatestEndTimeChange(e.target.value)}
                  className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white px-3 py-1 text-sm"
                >
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                  <option value="21:00">9:00 PM</option>
                  <option value="22:00">10:00 PM</option>
                  <option value="23:00">11:00 PM</option>
                </select>
              </div>
            </div>
          </div>
            
          {/* Calendar header */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-lg font-semibold">
              {format(currentWeekStart, 'MMMM yyyy')}
            </div>
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={navigateToPreviousWeek}
                className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                type="button"
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Today
              </button>
              <button 
                type="button"
                onClick={navigateToNextWeek}
                className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
            
          {/* Day header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <div className="w-16 flex-shrink-0"></div>
            {calendarDays.map(day => (
              <div 
                key={format(day, 'yyyy-MM-dd')} 
                className={`flex-1 text-center py-2 ${
                  format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    ? 'bg-blue-50 dark:bg-blue-900/10 font-semibold'
                    : ''
                }`}
              >
                <div className="text-sm">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
            
          {/* Time grid */}
          <div className="flex overflow-auto" style={{ height: '650px' }}>
            {/* Time axis */}
            <div className="w-16 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
              {/* This div is intentionally left empty to align with the time labels in renderDayGrid */}
            </div>
            
            {/* Days */}
            {calendarDays.map(day => (
              <div key={format(day, 'yyyy-MM-dd')} className="flex-1 min-w-[120px]">
                {renderDayGrid(day)}
              </div>
            ))}
          </div>
            
          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">Existing Events</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-gray-50 dark:bg-gray-700/30 border-2 border-dashed border-gray-400 mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">Suggested Times</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border-2 border-dashed border-green-500 mr-2"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">Selected Availability</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWeekView; 