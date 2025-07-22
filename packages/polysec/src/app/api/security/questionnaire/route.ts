import { NextRequest, NextResponse } from 'next/server';
import { PolicyDocumentService } from '../../../../lib/services/document-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, question, organizationId = 'default-org' } = body;
    // context parameter is available but not currently used in this implementation
    // const context = body.context;

    // Handle both single question and array of questions
    let questionsToProcess: string[] = [];
    
    if (question && typeof question === 'string') {
      // Single question from bulk processor
      questionsToProcess = [question];
    } else if (questions && Array.isArray(questions)) {
      // Array of questions from original interface
      questionsToProcess = questions.filter(q => typeof q === 'string');
    } else {
      return NextResponse.json(
        { error: 'Question or questions array is required' },
        { status: 400 }
      );
    }

    console.log(`🔐 Security Questionnaire: Processing ${questionsToProcess.length} questions`);

    const policyService = new PolicyDocumentService();
    
    // For single question, return single response
    if (questionsToProcess.length === 1) {
      const singleQuestion = questionsToProcess[0];
      console.log(`❓ Processing single question: "${singleQuestion}"`);
      
      try {
        const response = await policyService.answerSecurityQuestion(singleQuestion, organizationId);
        
        console.log(`✅ Question processed. Confidence: ${response.confidence}`);
        
        return NextResponse.json({
          question: singleQuestion,
          answer: response.answer,
          confidence: response.confidence,
          sources: response.sources
        });
        
      } catch (error) {
        console.error('Failed to process question:', error);
        return NextResponse.json({
          question: singleQuestion,
          answer: 'Failed to generate answer. Please try again.',
          confidence: 0,
          sources: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // For multiple questions, return array (original behavior)
    const answers = [];

    for (const questionText of questionsToProcess) {
      console.log(`❓ Processing question: "${questionText}"`);

      try {
        const response = await policyService.answerSecurityQuestion(questionText, organizationId);
        
        answers.push({
          question: questionText,
          answer: response.answer,
          confidence: response.confidence,
          sources: response.sources
        });

        console.log(`✅ Question processed. Confidence: ${response.confidence}`);

      } catch (error) {
        console.error('Failed to process question:', error);
        
        answers.push({
          question: questionText,
          answer: 'Failed to generate answer. Please try again.',
          confidence: 0,
          sources: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ answers });

  } catch (error) {
    console.error('Security questionnaire API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process security questionnaire',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Predefined security questionnaire templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const framework = searchParams.get('framework') || 'general';

    const questionnaires = {
      soc2: {
        name: 'SOC 2 Type II Compliance',
        description: 'Security questionnaire covering SOC 2 Type II requirements',
        questions: [
          'What is your data encryption policy for data at rest?',
          'How do you handle user access controls and authentication?',
          'What is your incident response procedure?',
          'How do you monitor and log system activities?',
          'What is your backup and disaster recovery plan?',
          'How do you conduct security awareness training?',
          'What is your vendor risk management process?',
          'How do you handle data retention and disposal?',
          'What security controls do you have for your development environment?',
          'How do you perform vulnerability assessments and penetration testing?'
        ]
      },
      iso27001: {
        name: 'ISO 27001 Information Security',
        description: 'Information security questionnaire based on ISO 27001 standards',
        questions: [
          'What is your information security policy?',
          'How do you classify and handle sensitive information?',
          'What physical security controls are in place?',
          'How do you manage cryptographic controls?',
          'What is your supplier relationship security policy?',
          'How do you handle information security incident management?',
          'What business continuity planning do you have?',
          'How do you ensure compliance with legal and contractual requirements?',
          'What security measures are in place for remote access?',
          'How do you conduct security audits and reviews?'
        ]
      },
      pci: {
        name: 'PCI DSS Compliance',
        description: 'Payment Card Industry Data Security Standard questionnaire',
        questions: [
          'How do you protect stored cardholder data?',
          'What encryption methods do you use for transmitting cardholder data?',
          'How do you maintain a vulnerability management program?',
          'What access control measures are in place for cardholder data?',
          'How do you regularly monitor and test networks?',
          'What is your information security policy regarding cardholder data?',
          'How do you restrict access to cardholder data by business need-to-know?',
          'What unique ID assignment process do you have for computer access?',
          'How do you restrict physical access to cardholder data?',
          'What logging and monitoring capabilities do you have?'
        ]
      },
      general: {
        name: 'General Security Assessment',
        description: 'Comprehensive security questionnaire covering common security practices',
        questions: [
          'What is your overall information security strategy?',
          'How do you handle data privacy and protection?',
          'What cybersecurity training do you provide to employees?',
          'How do you manage third-party security risks?',
          'What is your approach to cloud security?',
          'How do you handle security incidents and breaches?',
          'What security technologies and tools do you use?',
          'How do you ensure secure software development?',
          'What is your network security architecture?',
          'How do you measure and report on security metrics?'
        ]
      }
    };

    const selectedQuestionnaire = questionnaires[framework as keyof typeof questionnaires] || questionnaires.general;

    return NextResponse.json({
      framework,
      questionnaire: selectedQuestionnaire,
      availableFrameworks: Object.keys(questionnaires)
    });

  } catch (error) {
    console.error('Get questionnaire template error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get questionnaire template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 