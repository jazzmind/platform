'use client';

import React, { useState, useEffect } from 'react';

interface ComplianceTemplate {
  name: string;
  description: string;
  questions: string[];
}

interface ComplianceAnswer {
  question: string;
  answer: string;
  confidence: number;
  sources: Array<{
    documentId: string;
    filename: string;
    section: string;
    relevance: number;
  }>;
  timestamp: string;
  error?: string;
}

interface ComplianceProps {
  organizationId?: string;
}

export function Compliance({ organizationId = 'default-org' }: ComplianceProps) {
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('general');
  const [complianceQuestionnaire, setComplianceQuestionnaire] = useState<ComplianceTemplate | null>(null);
  const [answers, setAnswers] = useState<ComplianceAnswer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState('');

  // Load available frameworks
  useEffect(() => {
    loadFrameworks();
  }, []);

  // Load questionnaire when framework changes
  useEffect(() => {
    if (selectedFramework) {
      loadCompliance(selectedFramework);
    }
  }, [selectedFramework]);

  const loadFrameworks = async () => {
    try {
      const response = await fetch('/api/security/questionnaire');
      const data = await response.json();
      setFrameworks(data.availableFrameworks || []);
    } catch (error) {
      console.error('Failed to load frameworks:', error);
    }
  };

  const loadCompliance = async (framework: string) => {
    try {
      const response = await fetch(`/api/security/questionnaire?framework=${framework}`);
      const data = await response.json();
      setComplianceQuestionnaire(data.questionnaire);
      setAnswers([]);
      setSelectedQuestions([]);
    } catch (error) {
      console.error('Failed to load questionnaire:', error);
    }
  };

  const handleQuestionToggle = (question: string) => {
    setSelectedQuestions(prev => 
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const addCustomQuestion = () => {
    if (customQuestion.trim() && !selectedQuestions.includes(customQuestion.trim())) {
      setSelectedQuestions(prev => [...prev, customQuestion.trim()]);
      setCustomQuestion('');
    }
  };

  const processQuestionnaire = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question to process.');
      return;
    }

    setIsProcessing(true);
    setAnswers([]);

    try {
      console.log(`🔐 Processing ${selectedQuestions.length} security questions`);

      const response = await fetch('/api/security/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: selectedQuestions,
          organizationId
        })
      });

      const data = await response.json();

      if (data.success) {
        setAnswers(data.answers);
        console.log(`✅ Received ${data.answers.length} answers`);
      } else {
        throw new Error(data.error || 'Failed to process questionnaire');
      }

    } catch (error) {
      console.error('Questionnaire processing failed:', error);
      alert(`Failed to process questionnaire: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-6">
      {/* Framework Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Compliance Framework</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {frameworks.map((framework) => (
            <button
              key={framework}
              onClick={() => setSelectedFramework(framework)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedFramework === framework
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium">
                {framework.toUpperCase()}
              </div>
            </button>
          ))}
        </div>

        {complianceQuestionnaire && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h4 className="font-medium text-gray-900">{complianceQuestionnaire.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{complianceQuestionnaire.description}</p>
          </div>
        )}
      </div>

      {/* Question Selection */}
      {complianceQuestionnaire && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Select Questions</h3>
            <div className="text-sm text-gray-500">
              {selectedQuestions.length} selected
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {complianceQuestionnaire.questions.map((question, index) => (
              <label key={index} className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(question)}
                  onChange={() => handleQuestionToggle(question)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{question}</span>
              </label>
            ))}
          </div>

          {/* Custom Question */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Add Custom Question</h4>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Enter your security question..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addCustomQuestion()}
              />
              <button
                onClick={addCustomQuestion}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Process Button */}
          <div className="mt-6">
            <button
              onClick={processQuestionnaire}
              disabled={isProcessing || selectedQuestions.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isProcessing || selectedQuestions.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? 'Processing Questions...' : `Process ${selectedQuestions.length} Questions`}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {answers.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Security Questionnaire Results
          </h3>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {answers.filter(a => a.confidence > 0).length}
              </div>
              <div className="text-sm text-gray-600">Questions Answered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {((answers.reduce((sum, a) => sum + a.confidence, 0) / answers.length) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Average Confidence</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {answers.reduce((sum, a) => sum + a.sources.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Policy References</div>
            </div>
          </div>

          {/* Answers */}
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Q{index + 1}: {answer.question}
                  </h4>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(answer.confidence)}`}>
                    {getConfidenceLabel(answer.confidence)} ({(answer.confidence * 100).toFixed(0)}%)
                  </div>
                </div>

                <div className="text-sm text-gray-700 mb-3">
                  {answer.answer}
                </div>

                {answer.sources.length > 0 && (
                  <div className="border-t pt-3">
                    <h5 className="text-xs font-medium text-gray-500 mb-2">
                      Sources ({answer.sources.length}):
                    </h5>
                    <div className="space-y-1">
                      {answer.sources.map((source, sourceIndex) => (
                        <div key={sourceIndex} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <div className="font-medium">{source.filename}</div>
                          <div className="truncate">{source.section}</div>
                          <div className="text-gray-500">Relevance: {(source.relevance * 100).toFixed(0)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {answer.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {answer.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 