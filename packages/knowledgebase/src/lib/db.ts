import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __knowledgebase_prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__knowledgebase_prisma) {
    global.__knowledgebase_prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__knowledgebase_prisma;
}

export { prisma };

// Database utilities
export async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to knowledgebase database');
    return prisma;
  } catch (error) {
    console.error('Failed to connect to knowledgebase database:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Disconnected from knowledgebase database');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
}

// Health check for database connection
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

export default prisma; 