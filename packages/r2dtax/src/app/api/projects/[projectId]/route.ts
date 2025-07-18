import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '../../../../lib/services/project-service';
import { z } from 'zod';

const projectService = new ProjectService();

/**
 * GET /api/projects/[projectId] - Get a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // TODO: Get session and organizationId from auth
    const organizationId = 'test-org-1';

    const project = await projectService.getProject(projectId, organizationId);

    if (!project) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Project not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch project',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[projectId] - Update a specific project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    
    // TODO: Get session and organizationId from auth
    const organizationId = 'test-org-1';

    // Verify project exists and user has access
    const existingProject = await projectService.getProject(projectId, organizationId);
    if (!existingProject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Project not found' 
        },
        { status: 404 }
      );
    }

    // Update project
    const updateData = {
      ...body,
      id: projectId,
    };

    const project = await projectService.updateProject(updateData);

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    
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
        error: 'Failed to update project',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId] - Delete a specific project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // TODO: Get session and organizationId from auth
    const organizationId = 'test-org-1';

    // Verify project exists and user has access
    const existingProject = await projectService.getProject(projectId, organizationId);
    if (!existingProject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Project not found' 
        },
        { status: 404 }
      );
    }

    await projectService.deleteProject(projectId, organizationId);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 