import { NextRequest, NextResponse } from 'next/server';
import { ActivityService } from '../../../../../lib/services/activity-service';
import { z } from 'zod';

const activityService = new ActivityService();

/**
 * GET /api/projects/[projectId]/activities - List all activities for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // TODO: Get session and organizationId from auth
    const organizationId = 'test-org-1';

    const activities = await activityService.getActivitiesByProject(projectId, organizationId);

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch activities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/activities - Create a new activity in a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
    // TODO: Get session and organizationId from auth
    const organizationId = 'test-org-1';

    // Add projectId to the request data
    const activityData = {
      ...body,
      projectId,
    };

    const activity = await activityService.createActivity(activityData);

    return NextResponse.json({
      success: true,
      data: activity,
      message: 'Activity created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 