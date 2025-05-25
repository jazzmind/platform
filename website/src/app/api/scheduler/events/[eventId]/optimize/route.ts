import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { SchedulerEvent, UserAvailability, ScheduledMeeting } from '@/models/scheduler';
import OpenAI from 'openai/index.mjs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Access code validation
const SCHEDULER_ACCESS_CODE = process.env.SCHEDULER_ACCESS_CODE;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { accessCode, quorum = 0 } = body;
    
    // Validate access code
    if (!accessCode || accessCode !== SCHEDULER_ACCESS_CODE) {
      return NextResponse.json({ message: 'Invalid access code' }, { status: 403 });
    }
    
    // Get the event data
    const eventFileName = `scheduler-event-${eventId}.json`;
    const eventBlobs = await list({ prefix: eventFileName });
    
    if (eventBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    const eventResponse = await fetch(eventBlobs.blobs[0].url);
    const event = await eventResponse.json() as SchedulerEvent;
    
    // Get availability data
    const availabilityFileName = `scheduler-availability-${eventId}.json`;
    const availabilityBlobs = await list({ prefix: availabilityFileName });
    
    if (availabilityBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'No availability data found' }, { status: 404 });
    }
    
    const availabilityResponse = await fetch(availabilityBlobs.blobs[0].url);
    const availabilityData = await availabilityResponse.json() as UserAvailability[];
    
    // Check if we have enough participants
    if (quorum > 0 && availabilityData.length < quorum) {
      return NextResponse.json({ 
        message: `Not enough participants. Needed: ${quorum}, Current: ${availabilityData.length}`,
        participantCount: availabilityData.length 
      }, { status: 400 });
    }
    
    // Prepare data for the AI optimization
    const optimizationData = {
      event,
      participantAvailability: availabilityData
    };
    
    // Use AI to optimize the schedule
    const optimizedSchedule = await optimizeSchedule(optimizationData);
    
    // Store the optimized schedule
    const scheduledMeetingsFileName = `scheduler-meetings-${eventId}.json`;
    await put(scheduledMeetingsFileName, JSON.stringify(optimizedSchedule), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Prepare response with the optimized schedule
    return NextResponse.json({ 
      message: 'Schedule optimized successfully',
      scheduledMeetings: optimizedSchedule 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error optimizing schedule:', error);
    return NextResponse.json({ message: 'An error occurred while optimizing the schedule' }, { status: 500 });
  }
}

// Get the optimized schedule for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const accessCode = searchParams.get('accessCode');
    
    // Check access code for admin access or let participants view without code
    const isAdmin = accessCode === SCHEDULER_ACCESS_CODE;
    
    // Get the event data
    const eventFileName = `scheduler-event-${eventId}.json`;
    const eventBlobs = await list({ prefix: eventFileName });
    
    if (eventBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    // Get the scheduled meetings
    const scheduledMeetingsFileName = `scheduler-meetings-${eventId}.json`;
    const meetingsBlobs = await list({ prefix: scheduledMeetingsFileName });
    
    if (meetingsBlobs.blobs.length === 0) {
      return NextResponse.json({ 
        message: 'No optimized schedule found for this event',
        isOptimized: false 
      }, { status: 200 });
    }
    
    const meetingsResponse = await fetch(meetingsBlobs.blobs[0].url);
    const scheduledMeetings = await meetingsResponse.json() as ScheduledMeeting[];
    
    // If it's not an admin request, filter out email addresses for privacy
    if (!isAdmin) {
      // Remove full email addresses, keeping only the first part for display
      const publicScheduledMeetings = scheduledMeetings.map(meeting => ({
        ...meeting,
        attendees: meeting.attendees.map(attendee => ({
          ...attendee,
          // Only keep the part before the @ symbol
          email: attendee.email.split('@')[0]
        }))
      }));
      
      return NextResponse.json({ 
        scheduledMeetings: publicScheduledMeetings,
        isOptimized: true
      }, { status: 200 });
    }
    
    // Return full data for admin
    return NextResponse.json({ 
      scheduledMeetings,
      isOptimized: true
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching optimized schedule:', error);
    return NextResponse.json({ message: 'An error occurred while fetching the schedule' }, { status: 500 });
  }
}

// AI optimization function
async function optimizeSchedule(data: { 
  event: SchedulerEvent, 
  participantAvailability: UserAvailability[] 
}): Promise<ScheduledMeeting[]> {
  const { event, participantAvailability } = data;
  
  // Create prompt for OpenAI to optimize the schedule
  const prompt = `
You are an AI scheduler assistant that optimizes meeting times based on participant availability. 
Please analyze the following event requirements and participant availability data to determine the optimal meeting schedule.

EVENT DETAILS:
- Title: ${event.title}
- Objective: ${event.objective}
- Time Preferences: ${JSON.stringify(event.timePreferences)}
- Duration: ${event.duration} minutes
- Frequency: ${JSON.stringify(event.frequency)}
- Date Range: ${event.dateRangeStart} to ${event.dateRangeEnd}

PARTICIPANT AVAILABILITY:
${JSON.stringify(participantAvailability, null, 2)}

TASK:
1. Analyze the event requirements and participant availability
2. Find optimal meeting times that maximize participant attendance
3. Create a schedule that meets the frequency requirements (number of occurrences)
4. Respect the time of day preferences when possible
5. Output a JSON array of scheduled meetings in this format:
[
  {
    "eventId": "${event.id}",
    "title": "${event.title}",
    "date": "ISO date string",
    "startTime": "ISO time string",
    "endTime": "ISO time string",
    "attendees": [
      {
        "email": "participant email",
        "status": "pending"
      }
    ],
    "calendarEventIds": []
  }
]

YOUR RESPONSE MUST BE VALID JSON:
`;

  try {
    // Call OpenAI for optimization
    const completion = await openai.chat.completions.create({
      model: "o3-mini", // Per project guidelines
      messages: [
        {
          role: "system", 
          content: "You are a scheduling AI assistant that finds optimal meeting times based on participant availability."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const responseText = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(responseText || "{}");
    
    // Extract the scheduled meetings from the response
    const scheduledMeetings = parsedResponse.scheduledMeetings || [];
    
    return scheduledMeetings;
  } catch (error) {
    console.error("Error calling OpenAI for schedule optimization:", error);
    throw new Error("Failed to optimize schedule using AI");
  }
} 