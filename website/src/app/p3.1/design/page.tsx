import { BookOpen, FileQuestion, MessageCircle, Users, Building2, File } from 'lucide-react';

export default function DesignPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Design</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-8">
          <Step number={1} label="Design" active />
          <Step number={2} label="Schedule" />
          <Step number={3} label="Enrol" />
          <Step number={4} label="Live" />
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">
              Learner View
            </button>
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Expert View
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option>Experience</option>
            </select>
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Import
            </button>
            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              Export
            </button>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
              Preview
            </button>
          </div>
        </div>

        {/* Activity Groups */}
        <div className="space-y-6">
          {/* Onboarding Group */}
          <ActivityGroup
            title="Onboarding and Capstone Challenge Welcome"
            description="type a description for this group of activities..."
            isLocked={false}
            activities={[
              {
                title: "Welcome to the Capstone Challenge",
                type: "reading",
                readings: 5,
                isLocked: false
              },
              {
                title: "Practera User Guide",
                type: "quiz",
                readings: 6,
                feedbacks: 1,
                isLocked: false
              },
              {
                title: "Your Employability Skill Development",
                type: "reflection",
                readings: 3,
                feedbacks: 1,
                isLocked: false
              }
            ]}
          />

          {/* Week 1 Group */}
          <ActivityGroup
            title="Week 1: Conducting a Vulnerability Scan"
            isLocked={false}
            activities={[
              {
                title: "Initial Risk Recommendations - Peer Feedback",
                type: "moderated",
                isLocked: false
              },
              {
                title: "Initial Risk Recommendations - Team Submission",
                type: "moderated-team",
                isLocked: false
              }
            ]}
          />

          {/* Add Activity Button */}
          <div className="flex justify-center">
            <button className="flex items-center justify-center w-80 h-48 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">+</span>
                </div>
                <span className="text-teal-700 font-medium">Add Activity</span>
              </div>
            </button>
          </div>

          {/* Add Group Button */}
          <div className="flex justify-center">
            <button className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
              + Add Group
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ number, label, active = false }: { number: number; label: string; active?: boolean }) {
  return (
    <div className="flex items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
        active 
          ? 'bg-teal-600 text-white' 
          : 'bg-slate-200 text-slate-600'
      }`}>
        {number}
      </div>
      <span className={`ml-3 text-sm font-medium ${
        active ? 'text-teal-600' : 'text-slate-500'
      }`}>
        {label}
      </span>
    </div>
  )
}

function ActivityGroup({ 
  title, 
  description, 
  activities 
}: { 
  title: string; 
  description?: string; 
  isLocked: boolean; 
  activities: Array<{
    title: string;
    type: string;
    readings?: number;
    feedbacks?: number;
    isLocked: boolean;
  }>;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              learner
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              expert
            </span>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {description && (
        <p className="text-slate-600 text-sm mb-4 italic">{description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activities.map((activity, index) => (
          <ActivityCard key={index} {...activity} />
        ))}
      </div>
    </div>
  )
}

function ActivityCard({ 
  title, 
  type, 
  readings, 
  feedbacks, 
}: { 
  title: string; 
  type: string; 
  readings?: number; 
  feedbacks?: number; 
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return <BookOpen className="w-8 h-8 text-blue-600" />;
      case 'quiz':
        return <FileQuestion className="w-8 h-8 text-green-600" />;
      case 'reflection':
        return <MessageCircle className="w-8 h-8 text-purple-600" />;
      case 'moderated':
        return <Users className="w-8 h-8 text-teal-600" />;
      case 'moderated-team':
        return <Building2 className="w-8 h-8 text-orange-600" />;
      default:
        return <File className="w-8 h-8 text-slate-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reading':
        return 'border-blue-200 bg-blue-50';
      case 'quiz':
        return 'border-green-200 bg-green-50';
      case 'reflection':
        return 'border-purple-200 bg-purple-50';
      case 'moderated':
        return 'border-teal-200 bg-teal-50';
      case 'moderated-team':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <div className={`relative border rounded-lg p-4 hover:shadow-md transition-shadow ${getTypeColor(type)}`}>
      <div className="text-center">
        <div className="flex justify-center mb-2">{getTypeIcon(type)}</div>
        <h4 className="text-sm font-medium text-slate-900 mb-2">{title}</h4>
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-600">
          {readings && (
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {readings} readings
            </span>
          )}
          {feedbacks && (
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {feedbacks} feedback
            </span>
          )}
        </div>
      </div>
      <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  )
} 