import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminUsers = process.env.ADMIN_USERS?.split(',').map(email => email.trim()) || [];
    if (!adminUsers.includes(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
      const roles = await prisma.role.findMany({
        orderBy: [
          { isSystemRole: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return NextResponse.json({ roles });
    } catch (error) {
      // Database tables might not exist yet
      console.warn('Database query failed - authorization system may not be initialized:', error);
      return NextResponse.json({ roles: [] });
    }
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' }, 
      { status: 500 }
    );
  }
} 