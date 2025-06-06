'use client';

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpBadgeProps {
  topic: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const helpContent: Record<string, string> = {
  'ai-orchestration': `**AI-First Automation System**

The platform watches every experiential-learning signal and automatically responds to issues across 7 categories: Engagement, Quality, Timeliness, Skill Development, Satisfaction, Team Dynamics, and Progress.

Instead of educators manually checking dashboards and sending emails, AI agents handle routine interventions while escalating complex issues for human approval.`,

  'moments-that-matter': `**Critical Intervention Points**

These are the high-impact moments where educator intervention can dramatically improve student outcomes. The AI identifies these moments by analyzing patterns across engagement, quality, and team dynamics data.

Examples: Expert marked as unhelpful by entire team, student falling behind on skills, team conflict detected in peer surveys.`,

  'unified-inbox': `**Omni-Channel Communication Hub**

Instead of checking multiple chat systems, emails, and SMS separately, all communication channels are threaded into one unified view. 

Responses automatically go back through the same channel they came from, with SLA timers and AI-drafted replies to streamline educator workflow.`,

  'learning-velocity': `**Skills-as-Trajectory Measurement**

Rather than point-in-time assessment, the platform tracks skill development velocity - how quickly students are improving across competencies compared to cohort baselines.

This enables targeted coaching interventions when students lag behind their expected growth trajectory.`,

  'automation-effectiveness': `**Evidence-Based Automation**

Every automation tracks effectiveness metrics: open rates, click-through, resolution time, and false positive rates.

This allows continuous refinement of intervention thresholds and helps educators understand which automated responses work best for different issue types.`,

  'xapi-integration': `**Event-Driven Architecture**

The system responds to xAPI events from multiple sources: student/expert app interactions, external simulations, LMS activities, and meeting attendance.

This creates a comprehensive real-time picture of student engagement and progress across all learning touchpoints.`,

  'natural-language-setup': `**Conversational Configuration**

Instead of complex rule builders, educators describe automation logic in natural language: "Send a nudge 5 hours before assessment due, escalate if no submission after deadline."

The AI translates this into executable automation rules while allowing fine-tuning of parameters and messaging.`,

  'intervention-system': `**Automated Intervention Engine**

Based on XAPI events and threshold analysis, the system automatically generates appropriate responses:
- Nudges for engagement/timeliness
- Coaching suggestions for skill gaps  
- Meeting requests for team conflicts
- Expert feedback reminders

Critical issues require educator approval before action.`,

  'real-time-reporting': `**AI-Powered Analytics**

Educators describe the data they want to see in natural language: "Show skill growth vs engagement by cohort." The system generates interactive reports with drill-down capabilities and explains insights.

Reports can be saved as templates, scheduled for delivery, and exported for institutional BI systems.`,

  'ip-rights-management': `**Intellectual Property Compliance**

Automatically monitors uploaded content for proprietary materials and ensures all necessary IP agreements are in place between students, institutions, and industry project providers.

Flags potential violations and guides users through proper attribution and permission processes.`,

  'gamification': `**Behavioral Motivation System**

Optional badges, streaks, and team leaderboards designed to increase engagement without creating unhealthy competition.

Educators control weighting and visibility to align with pedagogical goals and institutional culture.`,

  'pooled-availability': `**Smart Scheduling Coordination**

Like Calendly but integrated with automation system. When an intervention requires a meeting, the scheduler automatically finds optimal times across all qualified staff members.

Includes conflict detection against institutional calendars and auto-attachment of relevant meeting materials.`
};

export default function HelpBadge({ topic, content, position = 'right', size = 'sm' }: HelpBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const helpText = helpContent[topic] || content;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-gray-800'
  };

  // Parse markdown-style bold text
  const parseContent = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} text-blue-500 hover:text-blue-600 transition-colors flex-shrink-0`}
        title="Learn more about this feature"
      >
        <HelpCircle className="w-full h-full" />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover */}
          <div className={`absolute z-50 w-80 max-w-sm ${positionClasses[position]}`}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl p-4 relative">
              {/* Arrow */}
              <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
              
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
              
              {/* Content */}
              <div className="text-sm leading-relaxed whitespace-pre-line pr-6">
                {parseContent(helpText)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 