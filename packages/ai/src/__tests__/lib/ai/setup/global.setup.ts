import { validateTestEnvironment } from './testConfig';

export default async function globalSetup() {
  console.log('🔧 Setting up AI test environment...');
  
  try {
    // Validate that we have required environment variables
    validateTestEnvironment();
    
    // Log configuration
    console.log('✅ Environment validation passed');
    console.log(`📊 Test timeout: ${process.env.JEST_TIMEOUT || '300000'}ms`);
    console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
    
    // Additional setup if needed
    console.log('🚀 AI test environment ready');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
} 