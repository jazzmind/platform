import { prisma } from '../db';
import { ProjectStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  reference: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalBudget: z.number().optional(),
  description: z.string().min(1, 'Project description is required'),
  primaryContact: z.string().optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: z.string().min(1, 'Project ID is required'),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;

export interface ProjectResponse {
  id: string;
  name: string;
  reference?: string;
  startDate: Date;
  endDate: Date;
  totalBudget?: number;
  description: string;
  primaryContact?: string;
  status: ProjectStatus;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export class ProjectService {
  
  /**
   * Create a new R&D project
   */
  async createProject(data: CreateProjectRequest, createdBy?: string): Promise<ProjectResponse> {
    const validatedData = CreateProjectSchema.parse(data);
    
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        createdBy,
      },
    });

    return project as ProjectResponse;
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string, organizationId: string): Promise<ProjectResponse | null> {
    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    return project as ProjectResponse | null;
  }

  /**
   * Get all projects for an organization
   */
  async getProjects(organizationId: string): Promise<ProjectResponse[]> {
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects as ProjectResponse[];
  }

  /**
   * Update an existing project
   */
  async updateProject(data: UpdateProjectRequest): Promise<ProjectResponse> {
    const validatedData = UpdateProjectSchema.parse(data);
    const { id, ...updateData } = validatedData;

    // Convert date strings to Date objects if provided
    const processedData = {
      ...updateData,
      ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
      ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
    };

    const project = await prisma.project.update({
      where: { id },
      data: processedData,
    });

    return project as ProjectResponse;
  }

  /**
   * Delete a project (soft delete by setting status to CANCELLED)
   */
  async deleteProject(id: string, organizationId: string): Promise<void> {
    await prisma.project.updateMany({
      where: {
        id,
        organizationId,
      },
      data: {
        status: ProjectStatus.CANCELLED,
      },
    });
  }

  /**
   * Get project statistics for an organization
   */
  async getProjectStats(organizationId: string) {
    const stats = await prisma.project.groupBy({
      by: ['status'],
      where: {
        organizationId,
      },
      _count: {
        id: true,
      },
    });

    const totalBudget = await prisma.project.aggregate({
      where: {
        organizationId,
        status: ProjectStatus.ACTIVE,
      },
      _sum: {
        totalBudget: true,
      },
    });

    return {
      stats: stats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      })),
      totalActiveBudget: totalBudget._sum.totalBudget || 0,
    };
  }

  /**
   * Validate project dates
   */
  private validateProjectDates(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
  }

  /**
   * Check if user has access to project
   */
  async hasProjectAccess(projectId: string, organizationId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    return !!project;
  }
} 