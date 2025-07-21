export default async function globalTeardown() {
  console.log('🧹 Cleaning up AI test environment...');
  
  try {
    // Clean up database connections
    try {
      const { prisma } = await import('../../../../src/lib/database/prisma/client');
      await prisma.$disconnect();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.warn('⚠️ Database cleanup warning:', error);
    }

    // Clean up AI client connections
    try {
      await import('../../../../lib/ai/aiClient');
      // Force any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('✅ AI client connections cleaned up');
    } catch (error) {
      console.warn('⚠️ AI client cleanup warning:', error);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('✅ Garbage collection triggered');
    }
    
    console.log('✅ AI test cleanup completed');
    
  } catch (error) {
    console.error('⚠️ Cleanup warning:', error);
    // Don't throw - cleanup failures shouldn't fail the test suite
  }
} 