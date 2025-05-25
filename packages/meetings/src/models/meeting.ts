export interface MeetingEvent {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  location?: string;
  organizerId?: string;
  createdBy?: string;
  participantIds?: string[];
  calendarIds?: string[]; // For group scheduling, which calendars to check
  isGroupEvent?: boolean;
  duration?: number; // Duration in minutes, if applicable
  timePreferences?: {
    partOfDay: Array<'morning' | 'afternoon' | 'evening' | 'any'>;
    earlyLate: 'early' | 'late' | 'any';
    daysOfWeek?: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'>;
  };
  dateRangeStart?: string;
  dateRangeEnd?: string;
  frequency?: string;
  createdAt?: Date;
  userAvailability?: UserAvailability[];
  scheduledMeetings?: ScheduledMeeting[];
}

export interface UserAvailability {
  userId: string;
  eventId: string;
  calendarId?: string;
  email?: string;
  name?: string;
  availableSlots: Array<{ startTime: Date; endTime: Date }>;
  // Add other relevant availability properties here
}

export interface ScheduledMeeting {
  meetingId: string;
  eventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  participants: Array<{ userId: string; email?: string; name?: string }>;
  location?: string;
  // Add other relevant meeting properties here
} 