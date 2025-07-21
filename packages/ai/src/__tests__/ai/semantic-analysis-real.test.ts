/**
 * @jest-environment node
 */

/**
 * REAL AI Integration Tests
 * These tests actually call the OpenAI API to verify semantic analysis works correctly
 * They will be skipped if no API key is available
 */

import fs from 'fs';
import path from 'path';

// Define expected results for validation
const EXPECTED_TOPICS = {
  CARS: 'lightning mcqueen',
  TRUCKS: 'tow mater', 
  PLANES: 'blue angels'
};

const SAMPLE_OPPORTUNITY_SECTIONS = [
  {
    id: 'section-1',
    title: 'Vehicle Overview',
    content: 'Existing content about vehicles'
  },
  {
    id: 'section-2', 
    title: 'Transportation Methods',
    content: ''
  },
  {
    id: 'section-3',
    title: 'Aircraft Systems',
    content: 'Some existing aircraft info'
  }
];

describe('Real AI Semantic Analysis Integration Tests', () => {
  // Skip all tests if no OpenAI API key
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  
  beforeAll(() => {
    if (!hasApiKey) {
      console.log('\n🔑 No OpenAI API key found - skipping real AI tests');
      console.log('   Set OPENAI_API_KEY environment variable to run these tests\n');
    } else {
      console.log('\n🤖 Running real AI semantic analysis tests...\n');
    }
  });

  describe('Direct AI Function Testing', () => {
    it('should correctly identify semantic sections in sample markdown', async () => {
      if (!hasApiKey) {
        console.log('Skipped - no API key');
        return;
      }

      // Read the actual sample file
      const samplePath = path.join(process.cwd(), 'src/tests/sampleFile.md');
      const content = fs.readFileSync(samplePath, 'utf-8');
      
      console.log('📄 Analyzing sample markdown content...');
      console.log('Content:', content.substring(0, 100) + '...');

      // Import and call the real AI function
      const { analyzeSemantic } = await import('@/src/lib/ai/documentAnalysis');
      const result = await analyzeSemantic(content);

      console.log('\n📊 AI Analysis Results:');
      result.forEach((section, index) => {
        console.log(`  ${index + 1}. "${section.title}" (${section.content.length} chars)`);
        console.log(`     Content preview: ${section.content.substring(0, 60)}...`);
      });

      // Verify basic structure
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check each section has required properties
      result.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(typeof section.title).toBe('string');
        expect(typeof section.content).toBe('string');
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.content.length).toBeGreaterThan(0);
      });

      // Verify AI found the expected topics
      const allContent = result.map(s => s.content.toLowerCase()).join(' ');
      const allTitles = result.map(s => s.title.toLowerCase()).join(' ');
      const searchableText = (allContent + ' ' + allTitles);

      const foundCars = searchableText.includes(EXPECTED_TOPICS.CARS) || 
                       searchableText.includes('car');
      const foundTrucks = searchableText.includes(EXPECTED_TOPICS.TRUCKS) || 
                         searchableText.includes('truck');
      const foundPlanes = searchableText.includes(EXPECTED_TOPICS.PLANES) || 
                         searchableText.includes('plane');

      console.log('\n🎯 Topic Detection Results:');
      console.log(`   Cars: ${foundCars ? '✅' : '❌'}`);
      console.log(`   Trucks: ${foundTrucks ? '✅' : '❌'}`);
      console.log(`   Planes: ${foundPlanes ? '✅' : '❌'}`);

      // Test passes if AI found at least 2 of the 3 topics
      const topicsFound = [foundCars, foundTrucks, foundPlanes].filter(Boolean).length;
      expect(topicsFound).toBeGreaterThanOrEqual(2);

      if (topicsFound === 3) {
        console.log('\n🏆 Perfect! AI identified all three topics correctly');
      } else {
        console.log(`\n✅ Good! AI identified ${topicsFound}/3 topics`);
      }
    }, 45000);

    it('should match semantic sections to opportunity sections intelligently', async () => {
      if (!hasApiKey) {
        console.log('Skipped - no API key');
        return;
      }

      // Get the sample content
      const samplePath = path.join(process.cwd(), 'src/tests/sampleFile.md');
      const content = fs.readFileSync(samplePath, 'utf-8');

      console.log('🔗 Testing section matching...');

      // First analyze to get semantic sections
      const { analyzeSemantic, matchSections } = await import('@/src/lib/ai/documentAnalysis');
      const semanticSections = await analyzeSemantic(content);
      
      console.log(`Found ${semanticSections.length} semantic sections`);

      // Then match to opportunity sections
      const matches = await matchSections(semanticSections, SAMPLE_OPPORTUNITY_SECTIONS);

      console.log('\n🎯 Section Matching Results:');
      console.log(`Total matches found: ${Object.keys(matches).length}`);

      Object.entries(matches).forEach(([sectionId, match]) => {
        const oppSection = SAMPLE_OPPORTUNITY_SECTIONS.find(s => s.id === sectionId);
        console.log(`\n📌 Matched "${oppSection?.title}" (${sectionId}):`);
        console.log(`   Relevance: ${(match.relevanceScore * 100).toFixed(1)}%`);
        console.log(`   Content: ${match.extractedContent.substring(0, 100)}...`);
      });

      // Verify structure of matches
      expect(matches).toBeDefined();
      expect(typeof matches).toBe('object');

      // Check each match has required properties
      Object.values(matches).forEach(match => {
        expect(match).toHaveProperty('sectionTitle');
        expect(match).toHaveProperty('extractedContent');
        expect(match).toHaveProperty('relevanceScore');
        expect(typeof match.relevanceScore).toBe('number');
        expect(match.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(match.relevanceScore).toBeLessThanOrEqual(1);
        expect(match.extractedContent.length).toBeGreaterThan(0);
      });

      // Verify intelligent matching - should find relevant content
      const hasVehicleMatch = Object.values(matches).some(match => 
        match.extractedContent.toLowerCase().includes('lightning mcqueen') ||
        match.extractedContent.toLowerCase().includes('tow mater')
      );

      const hasAircraftMatch = Object.values(matches).some(match => 
        match.extractedContent.toLowerCase().includes('blue angels')
      );

      console.log('\n🎯 Intelligent Matching Assessment:');
      console.log(`   Found vehicle-related match: ${hasVehicleMatch ? '✅' : '❌'}`);
      console.log(`   Found aircraft-related match: ${hasAircraftMatch ? '✅' : '❌'}`);

      // Should find at least one intelligent match
      expect(hasVehicleMatch || hasAircraftMatch).toBe(true);

      if (Object.keys(matches).length === 0) {
        console.log('\n⚠️  No matches found - this may indicate matching thresholds need adjustment');
      }
    }, 60000);

    it('should demonstrate content merging works correctly', async () => {
      if (!hasApiKey) {
        console.log('Skipped - no API key');
        return;
      }

      console.log('🔀 Testing intelligent content merging...');

      const { intelligentMergeContent } = await import('@/src/lib/ai/documentAnalysis');
      
      const existingContent = 'Our analysis covers transportation systems and vehicle technologies.';
      const newContent = [{
        title: 'Racing Vehicles',
        content: 'Lightning McQueen is a race car with advanced performance capabilities.',
        confidence: 0.8
      }];

      const mergedResult = await intelligentMergeContent(
        'Vehicle Overview',
        existingContent,
        newContent
      );

      console.log('\n📝 Content Merging Results:');
      console.log('Original:', existingContent);
      console.log('New content:', newContent[0].content);
      console.log('Merged result:', mergedResult);

      // Verify merge worked
      expect(mergedResult).toBeDefined();
      expect(typeof mergedResult).toBe('string');
      expect(mergedResult.length).toBeGreaterThan(existingContent.length);
      
      // Should contain elements from both sources
      const mergedLower = mergedResult.toLowerCase();
      expect(mergedLower).toContain('transportation');
      expect(mergedLower).toContain('lightning mcqueen');

      console.log('\n✅ Content successfully merged with AI intelligence');
    }, 30000);
  });

  describe('API Route Integration', () => {
    it('should handle the complete file analysis workflow', async () => {
      if (!hasApiKey) {
        console.log('Skipped - no API key');
        return;
      }

      console.log('🔄 Testing complete workflow: extract → analyze → store');

      // This tests the pattern used in the actual API routes
      const { analyzeSemantic } = await import('@/src/lib/ai/documentAnalysis');
      // const { storeExtractedText, storeSemanticSections } = await import('@/src/lib/database/prisma/fileData');

      // Read sample file
      const samplePath = path.join(process.cwd(), 'src/tests/sampleFile.md');
      const extractedContent = fs.readFileSync(samplePath, 'utf-8');

      console.log('📄 Step 1: Content extracted');

      // Analyze semantically (this is what the /analyze route does)
      const semanticSections = await analyzeSemantic(extractedContent);
      console.log(`📊 Step 2: Found ${semanticSections.length} semantic sections`);

      // Verify the sections are meaningful
      expect(semanticSections.length).toBeGreaterThan(0);
      
      semanticSections.forEach((section, index) => {
        console.log(`   Section ${index + 1}: "${section.title}"`);
        expect(section.title).toBeDefined();
        expect(section.content).toBeDefined();
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.content.length).toBeGreaterThan(0);
      });

      // Mock the storage operations (since we don't want to actually store in tests)
      const mockStoreExtractedText = jest.fn().mockResolvedValue({ id: 'test-extracted' });
      const mockStoreSemanticSections = jest.fn().mockResolvedValue({ id: 'test-semantic' });

      // Simulate the storage (what would happen in real API)
      console.log('💾 Step 3: Simulating storage operations');

      await mockStoreExtractedText(
        'test-file-id',
        'opportunity',
        'test-opportunity-id', 
        'test-org-id',
        extractedContent
      );

      await mockStoreSemanticSections(
        'test-file-id',
        'opportunity',
        'test-opportunity-id',
        'test-org-id', 
        semanticSections
      );

      expect(mockStoreExtractedText).toHaveBeenCalled();
      expect(mockStoreSemanticSections).toHaveBeenCalledWith(
        'test-file-id',
        'opportunity', 
        'test-opportunity-id',
        'test-org-id',
        semanticSections
      );

      console.log('✅ Complete workflow test passed');
    }, 45000);
  });

  describe('Quality Assessment', () => {
    it('should meet quality thresholds for semantic analysis', async () => {
      if (!hasApiKey) {
        console.log('Skipped - no API key');
        return;
      }

      console.log('🎯 Assessing AI quality against known benchmarks...');

      const samplePath = path.join(process.cwd(), 'src/tests/sampleFile.md');
      const content = fs.readFileSync(samplePath, 'utf-8');

      const { analyzeSemantic, matchSections } = await import('@/src/lib/ai/documentAnalysis');
      
      // Run analysis
      const semanticSections = await analyzeSemantic(content);
      const matches = await matchSections(semanticSections, SAMPLE_OPPORTUNITY_SECTIONS);

      // Quality Metrics
      const topicCoverage = {
        cars: semanticSections.some(s => 
          s.content.toLowerCase().includes('lightning mcqueen') || 
          s.title.toLowerCase().includes('car')
        ),
        trucks: semanticSections.some(s => 
          s.content.toLowerCase().includes('tow mater') || 
          s.title.toLowerCase().includes('truck')
        ),
        planes: semanticSections.some(s => 
          s.content.toLowerCase().includes('blue angels') || 
          s.title.toLowerCase().includes('plane')
        )
      };

      const topicScore = Object.values(topicCoverage).filter(Boolean).length / 3;
      const sectionCount = semanticSections.length;
      const matchCount = Object.keys(matches).length;
      const avgRelevance = Object.values(matches).length > 0 
        ? Object.values(matches).reduce((sum, m) => sum + m.relevanceScore, 0) / Object.values(matches).length
        : 0;

      console.log('\n📊 Quality Assessment Results:');
      console.log(`   Topic Coverage: ${(topicScore * 100).toFixed(0)}% (${Object.values(topicCoverage).filter(Boolean).length}/3 topics)`);
      console.log(`   Sections Identified: ${sectionCount}`);
      console.log(`   Successful Matches: ${matchCount}`);
      console.log(`   Average Relevance: ${(avgRelevance * 100).toFixed(1)}%`);

      // Quality thresholds
      expect(topicScore).toBeGreaterThanOrEqual(0.6); // Should find at least 60% of topics
      expect(sectionCount).toBeGreaterThanOrEqual(2); // Should create at least 2 sections
      expect(sectionCount).toBeLessThanOrEqual(10);   // Shouldn't over-segment

      if (matchCount > 0) {
        expect(avgRelevance).toBeGreaterThanOrEqual(0.3); // Matches should have reasonable relevance
      }

      const overallScore = (topicScore * 0.4) + (Math.min(sectionCount / 4, 1) * 0.3) + (avgRelevance * 0.3);
      console.log(`   Overall Quality Score: ${(overallScore * 100).toFixed(1)}%`);

      if (overallScore >= 0.7) {
        console.log('🏆 Excellent AI performance!');
      } else if (overallScore >= 0.5) {
        console.log('✅ Good AI performance');  
      } else {
        console.log('⚠️ AI performance needs improvement');
      }

      expect(overallScore).toBeGreaterThanOrEqual(0.4); // Minimum acceptable performance
    }, 60000);
  });
}); 