import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import crypto from 'crypto';

interface FeedbackItem {
  type: 'endorse' | 'challenge';
  fileId: string;
  selectedText: string;
  comment: string;
  timestamp: string;
  collaboratorId: string;
  isPublic: boolean;
  collaboratorName?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { type, fileId, selectedText, comment, isPublic } = body;
    
    // Validate required fields
    if (!eventId || !type || !fileId || !selectedText) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate feedback type
    if (type !== 'endorse' && type !== 'challenge') {
      return NextResponse.json({ message: 'Invalid feedback type' }, { status: 400 });
    }
    
    // Get collaborator ID from cookie
    const collaboratorId = request.cookies.get('collaborator_id')?.value;
    
    if (!collaboratorId) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    
    // Get collaborator info
    const collaboratorFileName = `${eventId}-collaborator-${collaboratorId}.json`;
    const collaboratorBlobs = await list({ prefix: collaboratorFileName });
    
    if (collaboratorBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Collaborator not found' }, { status: 404 });
    }
    
    // Get collaborator data
    const collaboratorBlobUrl = collaboratorBlobs.blobs[0].url;
    const collaboratorResponse = await fetch(collaboratorBlobUrl);
    
    if (!collaboratorResponse.ok) {
      return NextResponse.json({ message: 'Failed to retrieve collaborator info' }, { status: 500 });
    }
    
    const collaboratorInfo = await collaboratorResponse.json();
    
    // Create a new feedback item
    const feedbackItem: FeedbackItem = {
      type,
      fileId,
      selectedText,
      comment: comment || '',
      timestamp: new Date().toISOString(),
      collaboratorId,
      isPublic,
      collaboratorName: isPublic ? collaboratorInfo.name : undefined
    };
    
    // Generate a unique ID for the feedback
    const feedbackId = crypto.randomBytes(16).toString('hex');
    const feedbackFileName = `${eventId}-feedback-${feedbackId}.json`;
    
    // Save feedback data
    await put(feedbackFileName, JSON.stringify(feedbackItem), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
    
    return NextResponse.json({ 
      message: 'Feedback saved successfully',
      feedbackId
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ message: 'An error occurred while saving feedback' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    
    // Validate file ID
    if (!fileId) {
      return NextResponse.json({ message: 'Missing fileId parameter' }, { status: 400 });
    }
    
    // List all feedback for this event
    const allFeedbackBlobs = await list({ prefix: `${eventId}-feedback-` });
    
    if (allFeedbackBlobs.blobs.length === 0) {
      return NextResponse.json({ feedback: [] }, { status: 200 });
    }
    
    // Filter and process feedback for this file
    const fileFeedback = [];
    
    for (const blob of allFeedbackBlobs.blobs) {
      try {
        const response = await fetch(blob.url);
        if (response.ok) {
          const feedbackItem = await response.json();
          
          // Only include feedback for the requested file
          if (feedbackItem.fileId === fileId) {
            // Sanitize feedback for public consumption
            // Only include collaborator name if feedback is public
            const publicFeedback = {
              collaboratorId: feedbackItem.collaboratorId,
              type: feedbackItem.type,
              selectedText: feedbackItem.selectedText,
              comment: feedbackItem.comment,
              timestamp: feedbackItem.timestamp,
              collaboratorName: feedbackItem.isPublic ? feedbackItem.collaboratorName : undefined,
              isPublic: feedbackItem.isPublic
            };
            
            fileFeedback.push(publicFeedback);
          }
        }
      } catch (error) {
        console.error('Error processing feedback blob:', error);
        // Continue with other blobs on error
      }
    }
    
    return NextResponse.json({ feedback: fileFeedback }, { status: 200 });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    return NextResponse.json({ message: 'An error occurred while retrieving feedback' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const feedbackId = searchParams.get('feedbackId');

    if (!eventId || !feedbackId) {
      return NextResponse.json({ message: 'Missing eventId or feedbackId' }, { status: 400 });
    }

    // Get collaborator ID from cookie (authentication)
    const collaboratorId = request.cookies.get('collaborator_id')?.value;
    if (!collaboratorId) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // Construct the blob filename
    const feedbackFileName = `${eventId}-feedback-${feedbackId}.json`;

    // List blobs to get the exact URL (needed for deletion)
    const feedbackBlobs = await list({ prefix: feedbackFileName });

    if (feedbackBlobs.blobs.length === 0) {
      return NextResponse.json({ message: 'Feedback not found' }, { status: 404 });
    }

    const blobUrl = feedbackBlobs.blobs[0].url;

    // Fetch the feedback data to verify ownership
    const feedbackResponse = await fetch(blobUrl);
    if (!feedbackResponse.ok) {
      return NextResponse.json({ message: 'Failed to retrieve feedback data' }, { status: 500 });
    }
    const feedbackItem = await feedbackResponse.json();

    // Check if the current user is the author
    if (feedbackItem.collaboratorId !== collaboratorId) {
      return NextResponse.json({ message: 'Unauthorized to delete this feedback' }, { status: 403 });
    }

    // Delete the blob
    await del(blobUrl);

    return NextResponse.json({ message: 'Feedback deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ message: 'An error occurred while deleting feedback' }, { status: 500 });
  }
} 