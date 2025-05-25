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

    // Check if authorization system is initialized
    let isInitialized = false;
    try {
      // Check if packages exist
      const packageCount = await prisma.package.count();
      if (packageCount === 0) {
        isInitialized = false;
      } else {
        // Check if meetings package has roles and permissions
        const meetingsPackage = await prisma.package.findUnique({
          where: { name: 'meetings' },
          include: {
            roles: true,
            permissions: true
          }
        });
        
        isInitialized = !!(
          meetingsPackage &&
          meetingsPackage.roles.length > 0 &&
          meetingsPackage.permissions.length > 0
        );
      }
    } catch (error) {
      // Database tables might not exist yet
      isInitialized = false;
    }

    return NextResponse.json({ 
      isInitialized,
      adminEmail: session.user.email
    });
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' }, 
      { status: 500 }
    );
  }
} 