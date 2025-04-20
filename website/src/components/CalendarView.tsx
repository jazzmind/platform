import React, { useEffect } from 'react';

interface AvailabilityTimeRange {
  start: string;
  end: string;
}

interface AvailabilityDate {
  date: string;
  timeRanges: AvailabilityTimeRange[];
}

interface CalendarEvent {
  id: string;
  summary?: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface CalendarViewProps {
  dates: AvailabilityDate[];
  events: CalendarEvent[];
  onAddTimeRange: (dateIndex: number) => void;
  onRemoveTimeRange: (dateIndex: number, rangeIndex: number) => void;
  onTimeRangeChange: (dateIndex: number, rangeIndex: number, field: 'start' | 'end', value: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  dates,
  events,
  onAddTimeRange,
  onRemoveTimeRange,
  onTimeRangeChange
}) => {
  // Log the props when they change to help debug
  useEffect(() => {
    console.log('CalendarView received dates:', dates);
    console.log('CalendarView received events:', events);
  }, [dates, events]);

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  
  events.forEach(event => {
    // Make sure we have a valid date from the ISO string
    let startDate;
    try {
      startDate = new Date(event.start);
      // Handle case where event.start might be a date-only string without time
      const dateKey = startDate.toISOString().split('T')[0];
      
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      
      eventsByDate[dateKey].push(event);
    } catch (err) {
      console.error('Error parsing event date:', event.start, err);
    }
  });
  
  // Log the grouped events to debug
  useEffect(() => {
    console.log('Events grouped by date:', eventsByDate);
  }, [eventsByDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      let period = 'AM';
      let hour12 = hours;
      
      if (hours >= 12) {
        period = 'PM';
        hour12 = hours === 12 ? 12 : hours - 12;
      }
      
      if (hour12 === 0) {
        hour12 = 12;
      }
      
      return `${hour12}:${minutes} ${period}`;
    } catch (err) {
      console.error('Error formatting time:', dateTimeString, err);
      return dateTimeString; // Return the original string if there's an error
    }
  };
  
  return (
    <div className="space-y-6">
      {dates.map((date, dateIndex) => (
        <div key={date.date} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-100 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {formatDate(date.date)}
              </h4>
              <button
                type="button"
                onClick={() => onAddTimeRange(dateIndex)}
                className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Time Slot
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {/* Calendar events for this date */}
            {eventsByDate[date.date] && eventsByDate[date.date].length > 0 ? (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Schedule
                </h5>
                <div className="space-y-2">
                  {eventsByDate[date.date].map(event => (
                    <div 
                      key={event.id} 
                      className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-2 rounded"
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {event.summary}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {event.allDay 
                          ? 'All day' 
                          : `${formatTime(event.start)} - ${formatTime(event.end)}`
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No events scheduled
                </p>
              </div>
            )}
            
            {/* Available time slots */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Availability
              </h5>
              
              {date.timeRanges.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No availability added for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {date.timeRanges.map((range, rangeIndex) => (
                    <div 
                      key={rangeIndex} 
                      className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">From</span>
                          <input
                            type="time"
                            value={range.start}
                            onChange={(e) => onTimeRangeChange(dateIndex, rangeIndex, 'start', e.target.value)}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">To</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(e) => onTimeRangeChange(dateIndex, rangeIndex, 'end', e.target.value)}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveTimeRange(dateIndex, rangeIndex)}
                        className="p-1 text-red-500 hover:text-red-700"
                        aria-label="Remove time range"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarView; 