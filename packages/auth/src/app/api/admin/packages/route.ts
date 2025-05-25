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
      const packages = await prisma.package.findMany({
        orderBy: { createdAt: 'asc' }
      });

      return NextResponse.json({ packages });
    } catch (error) {
      // Database tables might not exist yet
      console.warn('Database query failed - authorization system may not be initialized:', error);
      return NextResponse.json({ packages: [] });
    }
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' }, 
      { status: 500 }
    );
  }
} 