// Authorization integration for meetings package
import { PrismaClient } from '@prisma/client';
import { 
  getAuthorizationEngine, 
  checkMeetingPermissions,
  grantMeetingOwnership,
  grantMeetingAccess,
  revokeMeetingAccess,
  setupAuthorizationSystem,
  checkAuthorizationSetup,
  type MeetingPermissions,
  type AccessType
} from '@sonnenreich/shared';

// Initialize authorization with meetings database
const prisma = new PrismaClient();

// Setup authorization engine with Prisma client
const authEngine = getAuthorizationEngine();
authEngine.setPrismaClient(prisma);

/**
 * Initialize authorization system for meetings package
 */
export async function initializeMeetingsAuthorization(): Promise<void> {
  try {
    // Check if authorization is already set up
    const isSetup = await checkAuthorizationSetup(prisma);
    
    if (!isSetup) {
      console.log('🔐 Initializing authorization system for meetings...');
      await setupAuthorizationSystem({ 
        prisma, 
        verbose: process.env.NODE_ENV === 'development' 
      });
      console.log('✅ Authorization system initialized!');
    } else {
      console.log('✅ Authorization system already initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize authorization:', error);
    throw error;
  }
}

/**
 * Service class for meeting authorization operations
 */
export class MeetingAuthService {
  /**
   * Create a new meeting and grant ownership to creator
   */
  static async createMeetingWithOwnership(
    meetingData: any,
    creatorId: string
  ): Promise<{ meeting: any; permissions: MeetingPermissions }> {
    try {
      // Create meeting (using your existing meeting creation logic)
      const meeting = await prisma.meetingEvent.create({
        data: {
          ...meetingData,
          organizerId: creatorId,
          createdBy: creatorId
        }
      });

      // Grant ownership to creator
      await grantMeetingOwnership(prisma, creatorId, meeting.id);

      // Get permissions for response
      const permissions = await checkMeetingPermissions(creatorId, meeting.id);

      return { meeting, permissions };
    } catch (error) {
      console.error('Error creating meeting with ownership:', error);
      throw error;
    }
  }

  /**
   * Add a participant to a meeting with specified access level
   */
  static async addMeetingParticipant(
    meetingId: string,
    userId: string,
    accessType: AccessType,
    grantedBy: string
  ): Promise<void> {
    try {
      // Verify that the granter has permission to manage participants
      const granterPermissions = await checkMeetingPermissions(grantedBy, meetingId);
      
      if (!granterPermissions.canManageParticipants) {
        throw new Error('Insufficient permissions to add participants');
      }

      // Grant access
      await grantMeetingAccess(prisma, userId, meetingId, accessType, grantedBy);

      // Update meeting participant list if needed
      const meeting = await prisma.meetingEvent.findUnique({
        where: { id: meetingId }
      });

      if (meeting && !meeting.participantIds.includes(userId)) {
        await prisma.meetingEvent.update({
          where: { id: meetingId },
          data: {
            participantIds: [...meeting.participantIds, userId]
          }
        });
      }
    } catch (error) {
      console.error('Error adding meeting participant:', error);
      throw error;
    }
  }

  /**
   * Remove a participant from a meeting
   */
  static async removeMeetingParticipant(
    meetingId: string,
    userId: string,
    accessType: AccessType,
    revokedBy: string
  ): Promise<void> {
    try {
      // Verify that the revoker has permission to manage participants
      const revokerPermissions = await checkMeetingPermissions(revokedBy, meetingId);
      
      if (!revokerPermissions.canManageParticipants) {
        throw new Error('Insufficient permissions to remove participants');
      }

      // Revoke access
      await revokeMeetingAccess(prisma, userId, meetingId, accessType, revokedBy);

      // Update meeting participant list
      const meeting = await prisma.meetingEvent.findUnique({
        where: { id: meetingId }
      });

      if (meeting && meeting.participantIds.includes(userId)) {
        await prisma.meetingEvent.update({
          where: { id: meetingId },
          data: {
            participantIds: meeting.participantIds.filter(id => id !== userId)
          }
        });
      }
    } catch (error) {
      console.error('Error removing meeting participant:', error);
      throw error;
    }
  }

  /**
   * Get meeting with user's permissions
   */
  static async getMeetingWithPermissions(
    meetingId: string,
    userId: string
  ): Promise<{ meeting: any; permissions: MeetingPermissions } | null> {
    try {
      // Get meeting permissions first
      const permissions = await checkMeetingPermissions(userId, meetingId);

      // If user can't view, return null
      if (!permissions.canView) {
        return null;
      }

      // Get meeting data
      const meeting = await prisma.meetingEvent.findUnique({
        where: { id: meetingId },
        include: {
          userAvailabilities: true,
          scheduledMeetings: true
        }
      });

      if (!meeting) {
        return null;
      }

      return { meeting, permissions };
    } catch (error) {
      console.error('Error getting meeting with permissions:', error);
      throw error;
    }
  }

  /**
   * List meetings accessible by user
   */
  static async listUserMeetings(userId: string): Promise<Array<{ meeting: any; permissions: MeetingPermissions }>> {
    try {
      // Get all meetings where user has some access
      const userAccess = await prisma.resourceAccess.findMany({
        where: {
          userId,
          resourceType: 'meeting',
          isActive: true
        }
      });

      const meetingResults = [];

      for (const access of userAccess) {
        const meetingData = await this.getMeetingWithPermissions(access.resourceId, userId);
        if (meetingData) {
          meetingResults.push(meetingData);
        }
      }

      // Also include meetings where user is the organizer
      const organizedMeetings = await prisma.meetingEvent.findMany({
        where: {
          organizerId: userId
        }
      });

      for (const meeting of organizedMeetings) {
        // Check if we already have this meeting from access list
        const alreadyIncluded = meetingResults.some(result => result.meeting.id === meeting.id);
        
        if (!alreadyIncluded) {
          const permissions = await checkMeetingPermissions(userId, meeting.id);
          meetingResults.push({ meeting, permissions });
        }
      }

      return meetingResults;
    } catch (error) {
      console.error('Error listing user meetings:', error);
      throw error;
    }
  }

  /**
   * Update meeting (with permission check)
   */
  static async updateMeeting(
    meetingId: string,
    updateData: any,
    userId: string
  ): Promise<any> {
    try {
      // Check permissions
      const permissions = await checkMeetingPermissions(userId, meetingId);

      if (!permissions.canEdit) {
        throw new Error('Insufficient permissions to edit meeting');
      }

      // Update meeting
      const meeting = await prisma.meetingEvent.update({
        where: { id: meetingId },
        data: updateData
      });

      return meeting;
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Delete meeting (with permission check)
   */
  static async deleteMeeting(meetingId: string, userId: string): Promise<void> {
    try {
      // Check permissions
      const permissions = await checkMeetingPermissions(userId, meetingId);

      if (!permissions.canDelete) {
        throw new Error('Insufficient permissions to delete meeting');
      }

      // Delete meeting (this will cascade to related records)
      await prisma.meetingEvent.delete({
        where: { id: meetingId }
      });

      // Clean up any remaining resource access records
      await prisma.resourceAccess.deleteMany({
        where: {
          resourceType: 'meeting',
          resourceId: meetingId
        }
      });
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }
}

// Initialize on module load
initializeMeetingsAuthorization().catch(console.error);

export { prisma as meetingsPrisma }; 