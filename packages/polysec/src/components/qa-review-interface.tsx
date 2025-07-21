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

interface QAReviewInterfaceProps {
  questions: ParsedQuestion[];
  answers: AIAnswer[];
  organizationId: string;
  onAnswerUpdate: (questionId: string, updatedAnswer: AIAnswer) => void;
  onExportMarkdown: () => void;
}

export default function QAReviewInterface({
  questions,
  answers,
  organizationId,
  onAnswerUpdate,
  onExportMarkdown
}: QAReviewInterfaceProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [flaggingQuestion, setFlaggingQuestion] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<string | null>(null);

  const toggleQuestionExpanded = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleApprove = (questionId: string) => {
    const answer = answers.find(a => a.questionId === questionId);
    if (answer) {
      const updatedAnswer = { ...answer, status: 'approved' as const };
      onAnswerUpdate(questionId, updatedAnswer);
    }
  };

  const handleFlag = (questionId: string) => {
    setFlaggingQuestion(questionId);
    setFlagReason('');
  };

  const submitFlag = () => {
    if (!flaggingQuestion || !flagReason.trim()) return;
    
    const answer = answers.find(a => a.questionId === flaggingQuestion);
    if (answer) {
      const updatedAnswer = { 
        ...answer, 
        status: 'flagged' as const, 
        flagReason: flagReason.trim() 
      };
      onAnswerUpdate(flaggingQuestion, updatedAnswer);
    }
    
    setFlaggingQuestion(null);
    setFlagReason('');
  };

  const handleRegenerate = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    const currentAnswer = answers.find(a => a.questionId === questionId);
    
    if (!question || !currentAnswer) return;

    setRegeneratingQuestion(questionId);

    try {
      console.log(`🔄 Regenerating answer for Q${question.number}...`);
      
      // Include flag reason as context for regeneration
      const requestBody = {
        question: question.question,
        organizationId,
        context: currentAnswer.flagReason ? `Previous attempt failed because: ${currentAnswer.flagReason}` : undefined
      };

      const response = await fetch('/api/security/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.statusText}`);
      }

      const result = await response.json();
      
      const updatedAnswer: AIAnswer = {
        questionId: question.id,
        answer: result.answer,
        confidence: result.confidence,
        sources: result.sources || [],
        status: result.confidence > 0.7 ? 'completed' : 'flagged'
      };

      onAnswerUpdate(questionId, updatedAnswer);
      console.log(`✅ Q${question.number} regenerated. New confidence: ${result.confidence}`);

    } catch (error) {
      console.error(`❌ Failed to regenerate Q${question.number}:`, error);
      alert(`Failed to regenerate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegeneratingQuestion(null);
    }
  };

  const getStatusBadge = (status: AIAnswer['status']) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">✅ Approved</span>;
      case 'completed':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">✅ High Confidence</span>;
      case 'flagged':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">⚠️ Flagged</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">⏳ Pending</span>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const approvedCount = answers.filter(a => a.status === 'approved').length;
  const flaggedCount = answers.filter(a => a.status === 'flagged').length;
  const completedCount = answers.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                Review AI Generated Answers
              </h2>
              <p className="text-gray-600 mt-1">
                Review each answer and approve or flag for regeneration. Export when ready.
              </p>
            </div>
            
            <button 
              onClick={onExportMarkdown}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <span>📥</span>
              Export Markdown
            </button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
              <div className="text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
              <div className="text-gray-600">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{flaggedCount}</div>
              <div className="text-gray-600">Need Review</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question/Answer List */}
      <div className="space-y-4">
        {questions.map((question) => {
          const answer = answers.find(a => a.questionId === question.id);
          const isExpanded = expandedQuestions.has(question.id);
          const isRegenerating = regeneratingQuestion === question.id;
          
          return (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Question Header */}
              <div 
                className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleQuestionExpanded(question.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-blue-600">Q{question.number}</span>
                      {answer && getStatusBadge(answer.status)}
                      {answer && (
                        <span className={`text-sm font-medium ${getConfidenceColor(answer.confidence)}`}>
                          {Math.round(answer.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 mt-1 font-medium">{question.question}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && answer && (
                <div className="p-4 space-y-4">
                  {/* Answer */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">AI Generated Answer:</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-800 whitespace-pre-wrap">{answer.answer}</p>
                    </div>
                  </div>

                  {/* Sources */}
                  {answer.sources.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        References ({answer.sources.length}):
                      </h4>
                      <div className="space-y-2">
                        {answer.sources.map((source, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-blue-900">{source.filename}</p>
                                <p className="text-sm text-blue-700 mt-1">{source.section}</p>
                              </div>
                              <span className="text-sm text-blue-600 font-medium">
                                {Math.round(source.relevance * 100)}% match
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flag Reason */}
                  {answer.flagReason && (
                    <div className="bg-red-50 p-3 rounded-md border-l-4 border-red-400">
                      <h4 className="font-medium text-red-900">Flag Reason:</h4>
                      <p className="text-red-700 mt-1">{answer.flagReason}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {answer.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(question.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        ✅ Approve
                      </button>
                    )}
                    
                    {answer.status !== 'flagged' && (
                      <button
                        onClick={() => handleFlag(question.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        ⚠️ Flag
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleRegenerate(question.id)}
                      disabled={isRegenerating}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isRegenerating ? '🔄 Regenerating...' : '🔄 Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flag Modal */}
      {flaggingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Flag Answer for Review
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for flagging this answer. This will help the AI generate a better response.
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g., Answer is too generic, missing specific policy details, incorrect reference..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitFlag}
                disabled={!flagReason.trim()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Flag Answer
              </button>
              <button
                onClick={() => setFlaggingQuestion(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 