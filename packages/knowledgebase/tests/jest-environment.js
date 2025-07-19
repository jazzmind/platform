const { TestEnvironment } = require('jest-environment-node');
const dotenv = require('dotenv');
const { resolve } = require('path');

class CustomEnvironment extends TestEnvironment {
  constructor(config, context) {
    // Load environment variables BEFORE calling super
    const envPath = resolve(__dirname, '../../../.env');
    dotenv.config({ path: envPath });
    
    console.log('🔧 Jest Environment: Loaded environment variables for testing');
    console.log(`📊 Jest Environment: DATABASE_URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    
    super(config, context);
  }

  async setup() {
    await super.setup();
    this.global.process.env = { ...process.env };
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomEnvironment; 