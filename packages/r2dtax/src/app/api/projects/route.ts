import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '../../../lib/services/project-service';
import { z } from 'zod';

const projectService = new ProjectService();

/**
 * GET /api/projects - List all projects for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get session and organizationId from auth
    // For now, using a mock organizationId
    const organizationId = 'test-org-1';

    const projects = await projectService.getProjects(organizationId);

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch projects',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Get session and user info from auth
    // For now, using mock values
    const organizationId = 'test-org-1';
    const userId = 'test-user-1';

    // Add organizationId to the request data
    const projectData = {
      ...body,
      organizationId,
    };

    const project = await projectService.createProject(projectData, userId);

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    
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
        error: 'Failed to create project',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 