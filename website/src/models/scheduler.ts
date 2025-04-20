export interface SchedulerEvent {
  id: string;
  title: string;
  objective: string;
  timePreferences: {
    partOfDay: ('morning' | 'afternoon' | 'evening')[];
    earlyLate: 'early' | 'late' | 'either';
  };
  duration: number; // in minutes
  frequency: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    occurrences: number;
  };
  dateRangeStart: string; // ISO date string
  dateRangeEnd: string; // ISO date string
  createdAt: string; // ISO date string
  createdBy: string;
}

export interface CalendarConnection {
  userId: string;
  email: string;
  provider: 'google' | 'outlook' | 'apple' | 'manual';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  providerId?: string; // ID from the provider's system
}

export interface UserAvailability {
  eventId: string;
  userId: string;
  email: string;
  availableDates: {
    date: string; // ISO date string
    timeRanges: {
      start: string; // ISO time string
      end: string; // ISO time string
    }[];
  }[];
}

export interface ScheduledMeeting {
  eventId: string;
  title: string;
  date: string; // ISO date string
  startTime: string; // ISO time string
  endTime: string; // ISO time string
  attendees: {
    email: string;
    status: 'pending' | 'accepted' | 'declined';
  }[];
  calendarEventIds: {
    provider: string;
    eventId: string;
  }[];
} 