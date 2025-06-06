'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ProjectBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your AI Project Assistant. I'll help you create a new experiential learning project from scratch. Let's start with your project idea - what would you like your students to work on?"
    }
  ])
  const [inputValue, setInputValue] = useState('')

  const addMessage = (content: string, type: 'user' | 'ai') => {
    const newMessage = {
      id: messages.length + 1,
      type,
      content
    }
    setMessages([...messages, newMessage])
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    addMessage(inputValue, 'user')
    
    // Simulate AI responses based on step
    setTimeout(() => {
      let aiResponse = ''
      
      if (currentStep === 1) {
        aiResponse = "Great! I understand you want students to work on a mobile app for local businesses. Let me help you structure this as a SMART goal. Based on your description, here's what I'm thinking:\n\n**Project Goal:** Students will design and prototype a mobile application that helps local businesses increase customer engagement through digital loyalty programs.\n\n**Success Criteria:**\n- Create user research findings (week 2)\n- Design interactive prototypes (week 4)\n- Validate with 3 local business owners (week 6)\n- Present final solution with implementation roadmap (week 8)\n\nDoes this capture your vision? What would you like to adjust?"
        setCurrentStep(2)
      } else if (currentStep === 2) {
        aiResponse = "Perfect! I'll now create a detailed project structure with auto-generated tasks. Here's your project breakdown:\n\n**Week 1-2: Discovery & Research**\n- Conduct stakeholder interviews with 5 local businesses\n- Analyze competitor loyalty apps\n- Create user personas and journey maps\n\n**Week 3-4: Design & Prototyping**\n- Wireframe key user flows\n- Design high-fidelity mockups\n- Create interactive prototype\n\n**Week 5-6: Validation & Testing**\n- User testing sessions with target customers\n- Stakeholder feedback sessions\n- Iterate based on feedback\n\n**Week 7-8: Final Delivery**\n- Finalize designs and documentation\n- Create implementation roadmap\n- Present to panel of local business owners\n\nShould I create the project with these tasks?"
        setCurrentStep(3)
      } else if (currentStep === 3) {
        aiResponse = "Excellent! I've created your project: 'Local Business Mobile App' with 24 auto-generated tasks, 4 major milestones, and integrated assessment rubrics. The project includes:\n\n✅ Kanban board with task assignments\n✅ Meeting bot integration for team standups\n✅ GitHub repository monitoring\n✅ Industry expert reviewer assignments\n✅ Skills tracking for UX Design, Business Analysis, and Mobile Development\n\nYour project is now live and ready for student teams! Would you like me to set up automated interventions or add any specific learning objectives?"
        setCurrentStep(4)
      }
      
      addMessage(aiResponse, 'ai')
    }, 1500)

    setInputValue('')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Project Builder</h1>
            <p className="text-gray-600">Create experiential learning projects through conversation</p>
          </div>
          <Link 
            href="/p3/projects"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</div>
            <span className="ml-2 font-medium">Project Idea</span>
          </div>
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
            <span className="ml-2 font-medium">SMART Goals</span>
          </div>
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>3</div>
            <span className="ml-2 font-medium">Task Breakdown</span>
          </div>
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className={`flex items-center ${currentStep >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>4</div>
            <span className="ml-2 font-medium">Project Created</span>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl rounded-lg px-4 py-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {message.type === 'ai' && (
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">AI</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">Project Assistant</span>
                      </div>
                    )}
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Describe your project idea or respond to the AI assistant..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              
              {/* Quick Suggestions */}
              {currentStep === 1 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Quick start examples:</p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setInputValue("Students should create a mobile app for local businesses to increase customer engagement")}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200"
                    >
                      Mobile app for local businesses
                    </button>
                    <button 
                      onClick={() => setInputValue("Design a sustainability initiative for campus dining services")}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200"
                    >
                      Campus sustainability project
                    </button>
                    <button 
                      onClick={() => setInputValue("Create a social media strategy for a nonprofit organization")}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200"
                    >
                      Nonprofit social media strategy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Project Template Library */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Project Templates</h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
              <h4 className="font-medium text-sm text-gray-900">Tech Startup MVP</h4>
              <p className="text-xs text-gray-600 mt-1">8-week product development cycle with industry mentorship</p>
              <div className="mt-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Popular</span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
              <h4 className="font-medium text-sm text-gray-900">Marketing Campaign</h4>
              <p className="text-xs text-gray-600 mt-1">Real client projects with measurable outcomes</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
              <h4 className="font-medium text-sm text-gray-900">Social Impact Initiative</h4>
              <p className="text-xs text-gray-600 mt-1">Community-focused projects with NGO partnerships</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
              <h4 className="font-medium text-sm text-gray-900">Financial Analysis</h4>
              <p className="text-xs text-gray-600 mt-1">Data-driven business recommendations for real companies</p>
            </div>
          </div>

          {currentStep >= 3 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 text-sm">Project Preview</h4>
              <div className="mt-2 text-xs text-green-700 space-y-1">
                <div>• 24 auto-generated tasks</div>
                <div>• 4 major milestones</div>
                <div>• Industry expert assignments</div>
                <div>• Skills tracking enabled</div>
                <div>• Meeting bot integration</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 