# Chat Integration Tests

## Overview

These tests validate the complete chat functionality including file management, document analysis, enhanced actions, and API endpoints. They replace the previous test scripts and are now integrated with Jest for better reliability and IDE integration.

## Test Files

### 1. `chat-file-manager.test.ts`
Tests the ChatFileManager core functionality including:
- File processing with fresh analysis
- Caching behavior for repeated uploads
- Force reprocessing with user feedback
- API integration with file uploads
- Error handling for invalid files

### 2. `chat-enhanced-actions.test.ts`
Tests the enhanced document action handlers:
- Opportunity matching actions
- Entity extraction from documents
- Opportunity creation workflows
- Error handling and edge cases
- Performance under concurrent load

### 3. `chat-api-server.test.ts`
Tests against the actual running API server:
- Document upload and analysis via API
- Enhanced document actions via API
- Chat functionality across different contexts
- Error handling and validation
- Performance and concurrent request handling

## Running the Tests

### Command Line Execution

```bash
# Run all chat integration tests
npm test src/__tests__/integration/chat-

# Run specific test files
npm test src/__tests__/integration/chat-file-manager.test.ts
npm test src/__tests__/integration/chat-enhanced-actions.test.ts
npm test src/__tests__/integration/chat-api-server.test.ts

# Run with verbose output
npm test src/__tests__/integration/chat- --verbose

# Run with coverage
npm test src/__tests__/integration/chat- --coverage
```

### Admin Testing Interface

The tests are automatically discoverable by the admin testing interface at:
`/admin/site/testing/ai`

They will appear in the integration test section and can be run individually or as a group.

### API Server Tests

The `chat-api-server.test.ts` tests require the API development server to be running:

```bash
# Terminal 1: Start the API server
npm run api

# Terminal 2: Run the API tests
npm test src/__tests__/integration/chat-api-server.test.ts
```

The API server runs on port 3101 with `LOCAL_API=true` for testing without authentication.

## Test Environment

### Mock Data
Tests use realistic business documents and scenarios:
- Business requirements documents
- CRM implementation projects
- Contact information extraction
- Opportunity matching scenarios

### Database Setup
Tests automatically:
- Create test organizations and users
- Set up test opportunities for matching
- Clean up data after test completion
- Use isolated test IDs to prevent conflicts

### Authentication
Tests use mocked authentication that simulates:
- Valid user sessions
- Organization access
- Contact permissions
- Admin capabilities for testing

## Test Coverage

### Core Functionality ✅
- [x] File upload and processing
- [x] Document classification
- [x] Content extraction
- [x] Caching mechanisms
- [x] Progress tracking

### Enhanced Actions ✅
- [x] Opportunity matching
- [x] Entity extraction
- [x] Opportunity creation
- [x] Document linking
- [x] User feedback processing

### API Integration ✅
- [x] File upload endpoints
- [x] Streaming responses
- [x] Error handling
- [x] Different entity types
- [x] Concurrent request handling

### Performance ✅
- [x] Response time validation
- [x] Concurrent request testing
- [x] Large file handling
- [x] Memory usage monitoring
- [x] Cache efficiency testing

## Debugging Tests

### Console Output
Tests provide detailed console output showing:
- Processing times and performance metrics
- Cache hit/miss information
- Entity extraction results
- Error details and stack traces

### Debug Mode
Run tests with additional debugging:

```bash
# Enable debug logging
DEBUG=true npm test src/__tests__/integration/chat-

# Run with Jest debug flags
npm test src/__tests__/integration/chat- --detectOpenHandles --forceExit
```

### Common Issues

**Test Timeouts**
- Increase timeout for AI-dependent tests
- Check OpenAI API key configuration
- Verify network connectivity

**Database Errors**
- Ensure test database is accessible
- Check Prisma configuration
- Verify cleanup functions are working

**API Server Issues**
- Confirm API server is running on port 3101
- Check LOCAL_API environment variable
- Verify authentication bypass is working

## Test Data

### Sample Documents
Tests use realistic business documents including:
- Requirements specifications
- Proposal documents  
- Meeting transcripts
- Contact lists
- Organization profiles

### Test Scenarios
- Education platform development
- CRM system implementation
- Cloud infrastructure migration
- Data analytics solutions

## Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Use descriptive test names
3. Include proper setup/teardown
4. Add comprehensive assertions
5. Document any special requirements

### Updating Test Data
1. Modify TEST_DOCUMENT_CONTENT constants
2. Update TEST_OPPORTUNITIES arrays
3. Ensure realistic business scenarios
4. Maintain consistency across tests

### Performance Baselines
Current performance expectations:
- Document analysis: < 60 seconds
- Entity extraction: < 30 seconds
- Opportunity matching: < 30 seconds
- API responses: < 2 seconds
- Cache retrieval: < 1 second

## Integration with CI/CD

These tests are designed to run in continuous integration:
- Use environment variables for configuration
- Include proper timeout handling
- Provide clear success/failure indicators
- Generate detailed test reports
- Support parallel execution where safe 