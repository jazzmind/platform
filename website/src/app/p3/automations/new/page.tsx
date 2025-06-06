'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function AutomationBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Automation Assistant. I'll help you create smart rules to support your students and streamline your workflow. What kind of situation would you like to automate?"
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
    
    setTimeout(() => {
      let aiResponse = ''
      
      if (currentStep === 1) {
        aiResponse = "Perfect! I understand you want to address teams that haven't met in several days. Let me create an automation rule for this situation."
        setCurrentStep(2)
      } else if (currentStep === 2) {
        aiResponse = "Great! Here's your complete automation rule with trigger logic and action sequence. Ready to activate?"
        setCurrentStep(3)
      } else if (currentStep === 3) {
        aiResponse = "Excellent! Your automation is now active and monitoring your teams!"
        setCurrentStep(4)
      }
      
      addMessage(aiResponse, 'ai')
    }, 1500)

    setInputValue('')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Automation Builder</h1>
            <p className="text-gray-600">Create intelligent rules through conversation</p>
          </div>
          <Link 
            href="/p3/automations"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Back to Automations
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-lg px-4 py-3 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}>
                <div className="whitespace-pre-line">{message.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-4xl mx-auto w-full">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Describe the situation you want to automate..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3"
            />
            <button
              onClick={handleSendMessage}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 