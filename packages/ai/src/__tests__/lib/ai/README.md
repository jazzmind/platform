# AI System Testing Framework

## Overview

This directory contains comprehensive testing for the AI library functions in `src/lib/ai/`. Our testing approach includes:

1. **Unit Tests**: Individual function testing with real AI API calls
2. **Integration Tests**: End-to-end workflows testing multiple AI functions
3. **Vector Store Tests**: Embedding and search functionality validation
4. **Evaluation Framework**: Prompt testing with quality assessment

## Testing Philosophy

> 🚨 **Critical Requirement**: No mocking of AI API calls. All tests use real OpenAI API interactions to ensure actual functionality.

> 💡 **Quality Focus**: Tests evaluate both technical correctness and AI response quality.

## Test Structure

```
src/__tests__/lib/ai/
├── README.md (this file)
├── setup/
│   ├── testConfig.ts          # Test configuration and environment
│   ├── testData.ts            # Sample data for testing
│   └── apiMocks.ts            # Database mocking only (not AI APIs)
├── unit/
│   ├── embeddingService.test.ts
│   ├── contentGeneration.test.ts
│   ├── documentAnalysis.test.ts
│   ├── searchExtraction.test.ts
│   ├── chatDispatcher.test.ts
│   ├── documentProcessing.test.ts
│   ├── fileClassification.test.ts
│   ├── documentExtraction.test.ts
│   ├── pricing.test.ts
│   ├── organizationMatching.test.ts
│   ├── contentExtraction.test.ts
│   ├── requirements.test.ts
│   ├── slideGeneration.test.ts
│   └── crawlerService.test.ts
├── integration/
│   ├── documentToVectorStore.test.ts
│   ├── searchAndResponse.test.ts
│   ├── chatWorkflow.test.ts
│   └── documentProcessingPipeline.test.ts
├── evaluation/
│   ├── promptEvaluation.test.ts
│   ├── responseQuality.test.ts
│   └── semanticAccuracy.test.ts
└── utils/
    ├── testHelpers.ts
    ├── vectorStoreTestUtils.ts
    └── evaluationMetrics.ts
```

## Test Categories

### 1. Unit Tests (`unit/`)

Each AI library file has corresponding unit tests that verify:
- Function inputs/outputs
- Error handling
- AI model responses
- Performance characteristics

**Example Test Structure**:
```typescript
describe('EmbeddingService', () => {
  describe('generateEmbedding', () => {
    it('should generate valid embedding for text input', async () => {
      // Test with real OpenAI API call
    });
    
    it('should handle empty text gracefully', async () => {
      // Error handling test
    });
  });
});
```

### 2. Integration Tests (`integration/`)

Test complete workflows that span multiple AI functions:
- Document upload → content extraction → embedding → search
- Chat message → intent analysis → tool dispatch → response generation
- Opportunity analysis → section matching → content generation

### 3. Vector Store Tests

Comprehensive testing of embedding and search functionality:
- Embed known content
- Search for similar content
- Verify relevance scores
- Test edge cases (empty queries, very long text)

### 4. Evaluation Framework (`evaluation/`)

AI response quality assessment:
- Prompt templates with expected response characteristics
- Semantic similarity scoring
- Factual accuracy verification
- Response completeness evaluation

## Configuration

### Environment Variables

Required for testing:
```bash
# OpenAI API (required)
OPENAI_API_KEY=your_key_here

# Database (for integration tests)
DATABASE_URL=your_test_db_url

# Vector Store (if using external)
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=your_env
```

### Test Data

`setup/testData.ts` contains:
- Sample documents of various types
- Known good prompts and expected responses
- Test organizations and contacts
- Reference embeddings for comparison

## Running Tests

```bash
# All AI tests
npm test src/__tests__/lib/ai

# Unit tests only
npm test src/__tests__/lib/ai/unit

# Integration tests
npm test src/__tests__/lib/ai/integration

# Evaluation framework
npm test src/__tests__/lib/ai/evaluation

# Specific function tests
npm test embeddingService.test.ts

# Watch mode for development
npm test src/__tests__/lib/ai --watch
```

## Evaluation Metrics

### Quality Measures

1. **Semantic Accuracy**: Response relevance to input
2. **Factual Correctness**: Verifiable information accuracy
3. **Completeness**: Coverage of required response elements
4. **Consistency**: Similar inputs produce similar outputs
5. **Performance**: Response time and resource usage

### Scoring System

- **Pass/Fail**: Binary tests for critical functionality
- **Quality Score**: 0-100 scale for response quality
- **Performance Score**: Latency and efficiency metrics

## Test Maintenance

### Adding New Tests

1. Create test file following naming convention
2. Add test data to `testData.ts` if needed
3. Update this README with new test categories
4. Ensure CI/CD pipeline includes new tests

### Test Data Updates

- Review test data quarterly for relevance
- Add new examples as AI models evolve
- Maintain backward compatibility for regression testing

### Performance Monitoring

- Track test execution times
- Monitor API usage and costs
- Set thresholds for acceptable performance

## Debugging Failed Tests

### Common Issues

1. **API Rate Limits**: Implement retry logic and delays
2. **Model Response Variability**: Use multiple test runs for stability
3. **Database State**: Ensure proper test isolation
4. **Environment Differences**: Verify all required env vars

### Debugging Tools

- Detailed logging for AI API interactions
- Response caching for expensive operations
- Visual diff tools for response comparison
- Performance profiling for slow tests

## Contributing

When adding new AI functions:
1. Create corresponding unit tests
2. Add integration tests if function is part of workflow
3. Include evaluation tests for quality assessment
4. Update documentation and test data as needed

> ℹ️ **Note**: All tests should be deterministic where possible, but account for AI model variability in evaluation criteria. 