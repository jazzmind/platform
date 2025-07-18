import { prisma } from '../db';
import { ActivityType, ActivityStatus } from '@prisma/client';
import { z } from 'zod';

// Validation schemas
export const CreateActivitySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  type: z.enum(['CORE', 'SUPPORTING']),
  name: z.string().min(1, 'Activity name is required'),
  hypothesis: z.string().optional(),
  experiments: z.string().optional(),
  results: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  expenditure: z.number().optional(),
});

export const UpdateActivitySchema = CreateActivitySchema.partial().extend({
  id: z.string().min(1, 'Activity ID is required'),
});

export type CreateActivityRequest = z.infer<typeof CreateActivitySchema>;
export type UpdateActivityRequest = z.infer<typeof UpdateActivitySchema>;

export interface ActivityResponse {
  id: string;
  projectId: string;
  type: ActivityType;
  name: string;
  hypothesis?: string;
  experiments?: string;
  results?: string;
  startDate: Date;
  endDate: Date;
  expenditure?: number;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityWithProject extends ActivityResponse {
  project: {
    id: string;
    name: string;
    reference?: string;
  };
}

export class ActivityService {
  
  /**
   * Create a new R&D activity
   */
  async createActivity(data: CreateActivityRequest): Promise<ActivityResponse> {
    const validatedData = CreateActivitySchema.parse(data);
    
    // Verify project exists and get organization for security
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }
    
    const activity = await prisma.rDActivity.create({
      data: {
        ...validatedData,
        type: validatedData.type as ActivityType,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
      },
    });

    return activity as ActivityResponse;
  }

  /**
   * Get an activity by ID
   */
  async getActivity(id: string, organizationId: string): Promise<ActivityResponse | null> {
    const activity = await prisma.rDActivity.findFirst({
      where: {
        id,
        project: {
          organizationId,
        },
      },
    });

    return activity as ActivityResponse | null;
  }

  /**
   * Get all activities for a project
   */
  async getActivitiesByProject(projectId: string, organizationId: string): Promise<ActivityResponse[]> {
    const activities = await prisma.rDActivity.findMany({
      where: {
        projectId,
        project: {
          organizationId,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return activities as ActivityResponse[];
  }

  /**
   * Get all activities for an organization
   */
  async getActivities(organizationId: string): Promise<ActivityWithProject[]> {
    const activities = await prisma.rDActivity.findMany({
      where: {
        project: {
          organizationId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            reference: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return activities as ActivityWithProject[];
  }

  /**
   * Update an existing activity
   */
  async updateActivity(data: UpdateActivityRequest, organizationId: string): Promise<ActivityResponse> {
    const validatedData = UpdateActivitySchema.parse(data);
    const { id, ...updateData } = validatedData;

    // Verify activity exists and user has access
    const existingActivity = await this.getActivity(id, organizationId);
    if (!existingActivity) {
      throw new Error('Activity not found or access denied');
    }

    // Convert date strings to Date objects if provided
    const processedData = {
      ...updateData,
      ...(updateData.type && { type: updateData.type as ActivityType }),
      ...(updateData.startDate && { startDate: new Date(updateData.startDate) }),
      ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
    };

    const activity = await prisma.rDActivity.update({
      where: { id },
      data: processedData,
    });

    return activity as ActivityResponse;
  }

  /**
   * Delete an activity (soft delete by setting status to CANCELLED)
   */
  async deleteActivity(id: string, organizationId: string): Promise<void> {
    // Verify activity exists and user has access
    const existingActivity = await this.getActivity(id, organizationId);
    if (!existingActivity) {
      throw new Error('Activity not found or access denied');
    }

    await prisma.rDActivity.update({
      where: { id },
      data: {
        status: ActivityStatus.CANCELLED,
      },
    });
  }

  /**
   * Get activity statistics for a project
   */
  async getActivityStats(projectId: string, organizationId: string) {
    const stats = await prisma.rDActivity.groupBy({
      by: ['type', 'status'],
      where: {
        projectId,
        project: {
          organizationId,
        },
      },
      _count: {
        id: true,
      },
    });

    const totalExpenditure = await prisma.rDActivity.aggregate({
      where: {
        projectId,
        project: {
          organizationId,
        },
        status: ActivityStatus.ACTIVE,
      },
      _sum: {
        expenditure: true,
      },
    });

    return {
      stats: stats.map(stat => ({
        type: stat.type,
        status: stat.status,
        count: stat._count.id,
      })),
      totalActiveExpenditure: totalExpenditure._sum.expenditure || 0,
    };
  }

  /**
   * Validate activity dates against project dates
   */
  async validateActivityDates(activityStartDate: Date, activityEndDate: Date, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { startDate: true, endDate: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (activityStartDate < project.startDate) {
      throw new Error('Activity start date cannot be before project start date');
    }

    if (activityEndDate > project.endDate) {
      throw new Error('Activity end date cannot be after project end date');
    }

    if (activityEndDate <= activityStartDate) {
      throw new Error('Activity end date must be after start date');
    }
  }

  /**
   * Check if user has access to activity
   */
  async hasActivityAccess(activityId: string, organizationId: string): Promise<boolean> {
    const activity = await prisma.rDActivity.findFirst({
      where: {
        id: activityId,
        project: {
          organizationId,
        },
      },
    });

    return !!activity;
  }
} 