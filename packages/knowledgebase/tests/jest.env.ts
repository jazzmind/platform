import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the project root .env file
config({ path: resolve(__dirname, '../../../.env') });

console.log('🔧 Jest: Loaded environment variables for testing');
console.log(`📊 Jest: DATABASE_URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
console.log(`🔗 Jest: DATABASE_URL value: ${process.env.DATABASE_URL?.substring(0, 50)}...`); 