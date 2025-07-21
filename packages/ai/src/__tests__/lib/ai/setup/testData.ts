// Test data for AI system testing

// Sample documents for testing
export const SAMPLE_DOCUMENTS = {
  // Requirements document
  requirements: `
PROJECT REQUIREMENTS DOCUMENT

1. TECHNICAL SPECIFICATIONS
- Develop a web-based customer portal
- Must support 10,000+ concurrent users
- React.js frontend, Node.js backend
- PostgreSQL database
- AWS cloud deployment

2. FUNCTIONAL REQUIREMENTS
- User authentication and authorization
- Customer profile management
- Order tracking and history
- Real-time notifications
- Payment processing integration

3. NON-FUNCTIONAL REQUIREMENTS
- 99.9% uptime SLA
- < 2 second page load times
- GDPR compliance
- SOC 2 Type II certification

4. BUDGET AND TIMELINE
- Total budget: $150,000 - $200,000
- Timeline: 6-8 months
- Phased delivery preferred
`,

  // Proposal document
  proposal: `
TECHNICAL PROPOSAL: CUSTOMER PORTAL DEVELOPMENT

EXECUTIVE SUMMARY
We propose to develop a modern, scalable customer portal that meets all specified requirements. Our solution leverages proven technologies and follows industry best practices.

TECHNICAL APPROACH
Frontend: React 18 with TypeScript
Backend: Node.js with Express
Database: PostgreSQL 14
Cloud: AWS with auto-scaling
Security: OAuth 2.0, JWT tokens

DELIVERABLES
Phase 1: Authentication & Core UI (2 months)
Phase 2: Customer Management (2 months)
Phase 3: Order Processing (2 months)
Phase 4: Testing & Deployment (1 month)

PRICING
Development: $175,000
Testing: $15,000
Deployment: $10,000
Total: $200,000

TIMELINE
Project Duration: 7 months
Start Date: March 1, 2024
Completion: September 30, 2024
`,

  // Organization description
  organization: `
TechCorp Solutions is a leading software development company specializing in enterprise web applications. Founded in 2015, we have successfully delivered over 200 projects for clients ranging from startups to Fortune 500 companies.

Our expertise includes:
- Full-stack web development
- Cloud migration and deployment
- API development and integration
- Database design and optimization
- DevOps and CI/CD implementation

Technologies:
- Frontend: React, Angular, Vue.js
- Backend: Node.js, Python, Java
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Azure, Google Cloud
- DevOps: Docker, Kubernetes, Jenkins

Team:
- 25 senior developers
- 8 solution architects
- 12 UI/UX designers
- 6 DevOps engineers
- 5 project managers

Certifications:
- ISO 9001:2015
- SOC 2 Type II
- AWS Advanced Consulting Partner
- Microsoft Gold Partner
`,

  // Contact information
  contact: `
John Smith
Senior Software Architect
TechCorp Solutions

Email: john.smith@techcorp.com
Phone: +1 (555) 123-4567
LinkedIn: linkedin.com/in/johnsmith-architect

Experience:
- 12+ years in software development
- Expert in React, Node.js, AWS
- Led 50+ enterprise projects
- Specializes in scalable architectures

Skills:
- Full-stack development
- Solution architecture
- Team leadership
- Client communication
- Agile methodologies

Education:
- MS Computer Science, Stanford University
- BS Software Engineering, UC Berkeley
- AWS Solutions Architect Certification
- Scrum Master Certification
`,
};

// Sample prompts for evaluation testing
export const EVALUATION_PROMPTS = {
  contentGeneration: [
    {
      prompt: "Generate an executive summary for a cloud migration project",
      expectedElements: ['cloud', 'migration', 'benefits', 'timeline', 'approach'],
      minLength: 200,
      maxLength: 800,
    },
    {
      prompt: "Create a technical specification for API development",
      expectedElements: ['API', 'endpoints', 'authentication', 'data format', 'testing'],
      minLength: 300,
      maxLength: 1000,
    },
  ],
  
  documentAnalysis: [
    {
      prompt: "Analyze the requirements document and identify key sections",
      input: SAMPLE_DOCUMENTS.requirements,
      expectedSections: ['technical', 'functional', 'budget', 'timeline'],
    },
    {
      prompt: "Extract pricing information from the proposal",
      input: SAMPLE_DOCUMENTS.proposal,
      expectedPricing: ['175000', '15000', '10000', '200000'],
    },
  ],
  
  search: [
    {
      query: "React frontend development",
      expectedContent: ['React', 'frontend', 'development', 'user interface'],
    },
    {
      query: "database requirements PostgreSQL",
      expectedContent: ['PostgreSQL', 'database', 'data', 'storage'],
    },
  ],
};

// Test contact information
export const TEST_CONTACTS = [
  {
    name: "Jane Developer",
    email: "jane@example.com",
    role: "Senior Developer",
    skills: ["React", "Node.js", "TypeScript"],
    experience: "8 years",
  },
  {
    name: "Bob Manager",
    email: "bob@example.com",
    role: "Project Manager",
    skills: ["Agile", "Scrum", "Leadership"],
    experience: "10 years",
  },
];

// Test organization data
export const TEST_ORGANIZATIONS = [
  {
    name: "Test Software Inc",
    domain: "testsoftware.com",
    industry: "Software Development",
    size: "50-100 employees",
    services: ["Web Development", "Mobile Apps", "Cloud Services"],
  },
  {
    name: "Digital Solutions LLC",
    domain: "digitalsolutions.com",
    industry: "Digital Marketing",
    size: "20-50 employees",
    services: ["SEO", "Social Media", "Web Design"],
  },
];

// Expected embedding patterns for similarity testing
export const EMBEDDING_TEST_CASES = [
  {
    text1: "React frontend development with TypeScript",
    text2: "Frontend development using React and TypeScript",
    expectedSimilarity: 0.85, // Should be very similar
  },
  {
    text1: "Database design and optimization",
    text2: "Machine learning algorithms",
    expectedSimilarity: 0.3, // Should be dissimilar
  },
  {
    text1: "Project management and Agile methodologies",
    text2: "Agile project management practices",
    expectedSimilarity: 0.8, // Should be similar
  },
];

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  embeddingGeneration: {
    singleText: 5000, // 5 seconds max
    batchTexts: 15000, // 15 seconds for batch
  },
  contentGeneration: {
    shortContent: 10000, // 10 seconds
    longContent: 30000, // 30 seconds
  },
  documentAnalysis: {
    smallDocument: 15000, // 15 seconds
    largeDocument: 60000, // 60 seconds
  },
  search: {
    simpleQuery: 3000, // 3 seconds
    complexQuery: 8000, // 8 seconds
  },
};

// Quality assessment criteria
export const QUALITY_CRITERIA = {
  contentGeneration: {
    coherence: "Content should be logically structured and coherent",
    relevance: "Content should be relevant to the input prompt",
    completeness: "Content should address all key aspects",
    professionalism: "Content should maintain professional tone",
  },
  
  documentAnalysis: {
    accuracy: "Extracted information should be accurate",
    completeness: "All relevant sections should be identified",
    structure: "Results should be well-structured",
  },
  
  search: {
    relevance: "Results should be relevant to query",
    ranking: "Most relevant results should rank higher",
    coverage: "Should return diverse relevant results",
  },
};

// Error scenarios for testing
export const ERROR_SCENARIOS = [
  {
    name: "Empty input",
    input: "",
    expectedBehavior: "Handle gracefully with appropriate error",
  },
  {
    name: "Very long input",
    input: "x".repeat(100000),
    expectedBehavior: "Handle chunking or return size limit error",
  },
  {
    name: "Invalid characters",
    input: "Text with \x00 null characters \x01",
    expectedBehavior: "Clean input or handle encoding issues",
  },
  {
    name: "Non-English text",
    input: "这是中文测试文本 русский текст العربية",
    expectedBehavior: "Process international text correctly",
  },
];

// Utility functions for test data
export function generateRandomText(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createTestFileData(id: string, content: string) {
  return {
    id: `test_${id}`,
    content,
    metadata: {
      fileName: `test_file_${id}.txt`,
      fileType: 'text/plain',
      uploadedAt: new Date().toISOString(),
    },
  };
}

export function createMockOpportunity(id: string) {
  return {
    id: `test_opp_${id}`,
    title: `Test Opportunity ${id}`,
    description: SAMPLE_DOCUMENTS.requirements,
    status: 'active',
    estimatedValue: 200000,
  };
}

export function createMockProposal(id: string, opportunityId: string) {
  return {
    id: `test_prop_${id}`,
    opportunityId,
    title: `Test Proposal ${id}`,
    content: SAMPLE_DOCUMENTS.proposal,
    status: 'draft',
    totalValue: 200000,
  };
} 