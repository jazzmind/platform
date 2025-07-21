// Environment setup for AI tests

// AI API configuration for testing
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set - AI tests will fail');
}

// Database configuration for testing
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set - database tests will fail');
}

// Test-specific overrides (these are safe to set)
process.env.AI_TEST_MODE = 'true';
process.env.DISABLE_AI_CACHING = 'true';
process.env.AI_DEBUG_LOGGING = 'true'; // Ensure fresh responses for testing 