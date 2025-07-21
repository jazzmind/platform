'use client';

import React, { useState } from 'react';

interface ParsedQuestion {
  id: string;
  number: string;
  question: string;
  fullText: string;
}

interface AIAnswer {
  questionId: string;
  answer: string;
  confidence: number;
  sources: Array<{
    documentId: string;
    filename: string;
    section: string;
    relevance: number;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'flagged' | 'approved';
  flagReason?: string;
}

interface AskProcessorProps {
  organizationId: string;
  onQAGenerated?: (questions: ParsedQuestion[], answers: AIAnswer[]) => void;
}

export default function AskProcessor({ 
  organizationId, 
  onQAGenerated 
}: AskProcessorProps) {
  const [rawText, setRawText] = useState('');
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<AIAnswer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [processingSummary, setProcessingSummary] = useState<{
    total: number;
    completed: number;
    failed: number;
  }>({ total: 0, completed: 0, failed: 0 });

  /**
   * Parse questions from raw text input
   */
  const parseQuestions = (text: string): ParsedQuestion[] => {
    const lines = text.split('\n');
    const parsedQuestions: ParsedQuestion[] = [];
    let currentQuestion: ParsedQuestion | null = null;
    let questionText = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line starts with Q followed by number
      const questionMatch = trimmedLine.match(/^Q(\d+)\s+(.+)/);
      
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion) {
          currentQuestion.fullText = questionText.trim();
          parsedQuestions.push(currentQuestion);
        }
        
        // Start new question
        const questionNumber = questionMatch[1];
        const questionContent = questionMatch[2];
        
        currentQuestion = {
          id: `q${questionNumber}`,
          number: questionNumber,
          question: questionContent,
          fullText: ''
        };
        questionText = trimmedLine + '\n';
      } else if (currentQuestion && trimmedLine) {
        // Continue building current question
        questionText += line + '\n';
      } else if (!trimmedLine && currentQuestion) {
        // Empty line might indicate end of question
        questionText += '\n';
      }
    }
    
    // Don't forget the last question
    if (currentQuestion) {
      currentQuestion.fullText = questionText.trim();
      parsedQuestions.push(currentQuestion);
    }

    return parsedQuestions;
  };

  /**
   * Process questions with AI to generate answers
   */
  const processQuestionsWithAI = async (parsedQuestions: ParsedQuestion[]) => {
    setIsProcessing(true);
    setCurrentProgress(0);
    setProcessingSummary({ total: parsedQuestions.length, completed: 0, failed: 0 });
    
    const generatedAnswers: AIAnswer[] = [];

    for (let i = 0; i < parsedQuestions.length; i++) {
      const question = parsedQuestions[i];
      setCurrentQuestion(`Q${question.number}: ${question.question.substring(0, 60)}...`);
      setCurrentProgress((i / parsedQuestions.length) * 100);

      try {
        console.log(`🤖 Processing Q${question.number} with AI...`);
        
        // Use real PolicyDocumentService to get AI-powered answer
        const response = await fetch('/api/security/questionnaire', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question.question,
            organizationId
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process question: ${response.statusText}`);
        }

        const result = await response.json();
        
        const aiAnswer: AIAnswer = {
          questionId: question.id,
          answer: result.answer,
          confidence: result.confidence,
          sources: result.sources || [],
          status: result.confidence > 0.7 ? 'completed' : 'flagged'
        };

        generatedAnswers.push(aiAnswer);
        setProcessingSummary(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));

        console.log(`✅ Q${question.number} processed. Confidence: ${result.confidence}`);

      } catch (error) {
        console.error(`❌ Failed to process Q${question.number}:`, error);
        
        // Add failed answer
        const failedAnswer: AIAnswer = {
          questionId: question.id,
          answer: 'Failed to generate answer. Please try again.',
          confidence: 0,
          sources: [],
          status: 'flagged',
          flagReason: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };

        generatedAnswers.push(failedAnswer);
        setProcessingSummary(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
      }

      // Small delay to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentProgress(100);
    setCurrentQuestion('Processing complete!');
    setAnswers(generatedAnswers);
    setIsProcessing(false);

    // Notify parent component
    if (onQAGenerated) {
      onQAGenerated(parsedQuestions, generatedAnswers);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!rawText.trim()) {
      alert('Please enter questions to process');
      return;
    }

    // Parse questions
    const parsedQuestions = parseQuestions(rawText);
    if (parsedQuestions.length === 0) {
      alert('No valid questions found. Make sure questions start with Q1, Q2, etc.');
      return;
    }

    console.log(`📝 Parsed ${parsedQuestions.length} questions`);
    setQuestions(parsedQuestions);

    // Process with AI
    await processQuestionsWithAI(parsedQuestions);
  };

  return (
    <div className="py-6">
      {/* Main Input Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 p-6">
          
          <p className="text-gray-600 mt-2">
            Ask Questions or paste your questionnaire text below. The AI will analyze each question against your uploaded policy documents and generate answers with references.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Questions
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your questions here. Format: Q1 Question text here..."
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-2 items-center">
            <button 
              onClick={handleSubmit}
              disabled={isProcessing || !rawText.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span>🧠</span>
              {isProcessing ? 'Processing...' : 'Process with AI'}
            </button>
            
            {questions.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                <span>📄</span>
                {questions.length} questions parsed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">AI Processing Progress</h3>
            <p className="text-gray-600">
              Analyzing questions against your policy documents...
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Current: {currentQuestion}</span>
                <span>{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {processingSummary.total}
                </div>
                <div className="text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {processingSummary.completed}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {processingSummary.failed}
                </div>
                <div className="text-gray-600">Failed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {answers.length > 0 && !isProcessing && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <span className="text-xl text-green-500">✅</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Processing Complete
              </h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {answers.length}
                </div>
                <div className="text-gray-600">Total Answers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {answers.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-gray-600">High Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {answers.filter(a => a.status === 'flagged').length}
                </div>
                <div className="text-gray-600">Need Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {answers.reduce((sum, a) => sum + a.sources.length, 0)}
                </div>
                <div className="text-gray-600">Total References</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                <p className="text-sm text-yellow-800">
                  Processing complete! Review the answers below and approve or flag for regeneration.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 