import React from 'react';
import { Mail, MessageSquare, Phone, Calendar, Clock, AlertTriangle, CheckCircle, Users, ArrowRight } from 'lucide-react';
import HelpBadge from '../../../components/HelpBadge';

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Unified Inbox</h1>
          <HelpBadge topic="unified-inbox" position="bottom" content="" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            2 urgent messages
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Compose
          </button>
        </div>
      </div>

      {/* SLA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-gray-900">7</p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SLA Breached</p>
              <p className="text-2xl font-bold text-red-600">2</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">4.2h</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* AI Draft Helper */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Reply Assistant</h2>
          <HelpBadge topic="unified-inbox" content="**AI-Drafted Replies**

The platform analyzes conversation context and suggests appropriate responses for different communication channels, maintaining the right tone and format for email vs SMS vs chat." />
        </div>
        <p className="text-gray-600 mb-4">
          AI analyzes context and generates draft replies appropriate for each channel. Review, edit, and send.
        </p>
        <div className="flex gap-3">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Generate Draft
          </button>
          <button className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
            Quick Macros
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <HelpBadge 
                topic="unified-inbox" 
                content="**Omni-Channel Threading**

All communications with a student or team are threaded together regardless of channel (email, SMS, chat). Responses automatically go back through the same channel they came from." 
              />
            </div>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">All</button>
              <button className="text-sm px-3 py-1 hover:bg-gray-100 rounded-lg">Unread</button>
              <button className="text-sm px-3 py-1 hover:bg-gray-100 rounded-lg">Urgent</button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {messages.map((message) => (
            <div key={message.id} className={`p-6 hover:bg-gray-50 cursor-pointer ${message.unread ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {message.type === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
                  {message.type === 'chat' && <MessageSquare className="w-5 h-5 text-green-600" />}
                  {message.type === 'sms' && <Phone className="w-5 h-5 text-purple-600" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-medium ${message.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {message.from}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {message.channel}
                    </span>
                    {message.thread > 1 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        {message.thread} messages
                      </span>
                    )}
                    {message.priority === 'urgent' && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Urgent
                      </span>
                    )}
                  </div>
                  
                  <h4 className={`text-sm mb-2 ${message.unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {message.subject}
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {message.preview}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{message.time}</span>
                    <span className={`px-2 py-1 rounded ${
                      message.priority === 'urgent' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      SLA: {message.sla}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Reply
                  </button>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Channel Distribution</h3>
            <HelpBadge 
              topic="unified-inbox" 
              content="**Multi-Channel Analytics**

Track communication patterns across all channels to understand how students and experts prefer to communicate, and ensure consistent response times regardless of channel." 
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <span className="text-sm">Email</span>
              </div>
              <span className="text-sm font-medium">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-green-600" />
                <span className="text-sm">Platform Chat</span>
              </div>
              <span className="text-sm font-medium">38%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-purple-600" />
                <span className="text-sm">SMS</span>
              </div>
              <span className="text-sm font-medium">17%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">Replied to Team Alpha inquiry</span>
              <span className="text-gray-400 ml-auto">5 min ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Escalated Team Gamma issue</span>
              <span className="text-gray-400 ml-auto">12 min ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600">Scheduled check-in with Jordan</span>
              <span className="text-gray-400 ml-auto">1h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 