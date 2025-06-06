import React from 'react';
import { Mail, MessageSquare, Phone, Clock, AlertTriangle, ArrowRight, Bot, Zap } from 'lucide-react';

export default function InboxPage() {
  const messages = [
    {
      id: 1,
      type: 'email',
      from: 'Dr. Sarah Mitchell',
      subject: 'Team Gamma API Integration - Urgent Support Needed',
      preview: 'Hi, our team is completely stuck on the authentication...',
      channel: 'Email',
      time: '2 min ago',
      priority: 'urgent',
      sla: '22h remaining',
      thread: 3,
      unread: true
    },
    {
      id: 2,
      type: 'chat',
      from: 'Alex Chen (Team Beta)',
      subject: 'Sprint Review Questions',
      preview: 'Should we include the user testing results in...',
      channel: 'Platform Chat',
      time: '15 min ago',
      priority: 'normal',
      sla: '46h remaining',
      thread: 1,
      unread: true
    },
    {
      id: 3,
      type: 'sms',
      from: 'Jordan Kim',
      subject: 'Meeting Reminder',
      preview: 'Hey, just confirming our 3pm check-in today?',
      channel: 'SMS',
      time: '1h ago',
      priority: 'low',
      sla: '70h remaining',
      thread: 1,
      unread: false
    }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Unified Inbox</h1>
          <p className="text-slate-600 mt-1">All communications threaded by learner with AI-powered assistance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            2 urgent messages
          </div>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Compose
          </button>
        </div>
      </div>

      {/* Communication Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Messages</p>
              <p className="text-2xl font-bold text-slate-900">24</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Across all channels</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Unread</p>
              <p className="text-2xl font-bold text-slate-900">7</p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Requires attention</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">SLA Breached</p>
              <p className="text-2xl font-bold text-red-600">2</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Immediate action needed</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avg Response</p>
              <p className="text-2xl font-bold text-slate-900">4.2h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">Within SLA targets</p>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-6 h-6 text-teal-600" />
          <h2 className="text-lg font-semibold text-slate-900">AI Communication Assistant</h2>
          <Zap className="w-5 h-5 text-teal-500" />
        </div>
        <p className="text-slate-600 mb-4">
          AI analyzes conversation context and generates appropriate responses for each communication channel, maintaining the right tone for email, SMS, or chat.
        </p>
        <div className="flex gap-3">
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
            Generate Smart Reply
          </button>
          <button className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            Quick Templates
          </button>
          <button className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            Sentiment Analysis
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Threaded Conversations</h2>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Smart Threading Active</span>
            </div>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1 bg-teal-100 text-teal-800 rounded-lg">All</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">Unread</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">Urgent</button>
              <button className="text-sm px-3 py-1 hover:bg-slate-100 rounded-lg">AI Flagged</button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-200">
          {messages.map((message) => (
            <div key={message.id} className={`p-6 hover:bg-slate-50 cursor-pointer transition-colors ${message.unread ? 'bg-blue-50 border-l-4 border-l-teal-500' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 rounded-lg bg-white border border-slate-200">
                  {message.type === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
                  {message.type === 'chat' && <MessageSquare className="w-5 h-5 text-green-600" />}
                  {message.type === 'sms' && <Phone className="w-5 h-5 text-purple-600" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-semibold ${message.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {message.from}
                    </h3>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {message.channel}
                    </span>
                    {message.thread > 1 && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                        {message.thread} messages
                      </span>
                    )}
                    {message.priority === 'urgent' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        Urgent
                      </span>
                    )}
                  </div>
                  
                  <h4 className={`text-sm mb-2 ${message.unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {message.subject}
                  </h4>
                  
                  <p className="text-sm text-slate-600 mb-3">
                    {message.preview}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{message.time}</span>
                      <span className={`px-2 py-1 rounded ${
                        message.priority === 'urgent' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        SLA: {message.sla}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded hover:bg-teal-200">
                        AI Reply
                      </button>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 