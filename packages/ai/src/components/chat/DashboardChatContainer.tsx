'use client';

import React, { useState, useCallback, useEffect } from 'react';
// NOTE: `@/src/auth/client` is resolved by the consuming application and is
// expected to export a better-auth React client (see @jazzmind/auth/client
// for a reference implementation). Migrated from `next-auth/react` during
// the better-auth migration.
import { useSession } from '@/src/auth/client';
import ChatContainer from './ChatContainer';

interface DashboardChatContainerProps {
  viewState?: 'normal' | 'collapsed' | 'fullscreen';
  onViewStateChange?: (state: 'normal' | 'collapsed' | 'fullscreen') => void;
  onWidthChange?: (width: number) => void;
}

interface OpportunityContext {
  id: string;
  title: string;
  value: number;
  status: string;
  createdAt: string;
}

interface DashboardContext {
  opportunities: OpportunityContext[];
  totalOpportunities: number;
  pipelineStages: string[];
}

export default function DashboardChatContainer({ 
  viewState: externalViewState,
  onViewStateChange,
  onWidthChange 
}: DashboardChatContainerProps = {}) {
  const { data: session } = useSession();
  
  // Use external state if provided, otherwise use internal state
  const [internalViewState, setInternalViewState] = useState<'normal' | 'collapsed' | 'fullscreen'>('normal');
  const viewState = externalViewState ?? internalViewState;
  const setViewState = onViewStateChange ?? setInternalViewState;
  
  // Dashboard context state
  const [dashboardContext, setDashboardContext] = useState<DashboardContext>({
    opportunities: [],
    totalOpportunities: 0,
    pipelineStages: []
  });

  // Fetch dashboard context on mount
  useEffect(() => {
    const initializeDashboard = async () => {
      if (!session?.user?.contact?.id) return;

      try {
        const isOrgAdmin = session.user.role === 'admin' || session.user.role === 'owner';
        const endpoint = isOrgAdmin ? '/api/dashboard/org' : '/api/dashboard/user';
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const data = await response.json();
        
        // Extract opportunities from pipeline stages
        const allOpportunities: OpportunityContext[] = [];
        const stages = new Set<string>();
        
        if (data.pipeline) {
          data.pipeline.forEach((stage: { stage: string; items?: Array<{ id: string; title: string; value?: number; status?: string; createdAt: string }> }) => {
            stages.add(stage.stage);
            if (stage.items) {
              stage.items.forEach((item) => {
                allOpportunities.push({
                  id: item.id,
                  title: item.title,
                  value: item.value || 0,
                  status: item.status || stage.stage,
                  createdAt: item.createdAt
                });
              });
            }
          });
        }
        
        setDashboardContext({
          opportunities: allOpportunities,
          totalOpportunities: data.totalOpportunities || 0,
          pipelineStages: Array.from(stages)
        });

      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    };

    initializeDashboard();
  }, [session?.user?.contact?.id, session?.user?.role]);

  // Enhanced action handling for dashboard-specific actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDashboardAction = useCallback(async (action: string, data?: any) => {
    console.log('Dashboard action handler:', { action, data });

    switch (action) {
      case 'navigate_opportunities':
      case 'view_opportunities':
        window.location.href = '/manage/opportunities';
        break;

      case 'search_opportunities_biggest':
        // This will be handled by ChatContainer's natural language processing
        return { 
          type: 'search_query', 
          query: 'what is the biggest opportunity I\'m working on' 
        };

      case 'search_opportunities_recent':
        return { 
          type: 'search_query', 
          query: 'what is the most recent opportunity' 
        };

      case 'view_organizations':
        window.location.href = '/manage/organizations';
        break;

      case 'view_contacts':
        window.location.href = '/manage/team';
        break;

      case 'view_knowledge_base':
        window.location.href = '/manage/knowledge';
        break;

      case 'web_search_organization':
        if (data?.query) {
          return { 
            type: 'search_query', 
            query: `web search ${data.query}` 
          };
        }
        break;

      default:
        console.log('Unknown dashboard action:', action, data);
        break;
    }
  }, []);

  const handleResizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (viewState === 'fullscreen') {
      setViewState('collapsed');
    } else if (viewState === 'collapsed') {
      // On mobile, go directly to fullscreen; on desktop, go to normal
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1280;
      setViewState(isMobile ? 'fullscreen' : 'normal');
    } else {
      setViewState('collapsed');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const containerRect = document.querySelector('.dashboard-chat-wrapper')?.getBoundingClientRect();
    const initialWidth = containerRect?.width || 448;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; // Drag left = positive delta = wider
      const newWidth = Math.max(280, Math.min(800, initialWidth + deltaX)); // Min 280px, max 800px
      
      // Update the wrapper width directly
      const wrapper = document.querySelector('.dashboard-chat-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.width = `${newWidth}px`;
      }
      
      // Notify parent about width change during drag
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Dashboard-specific welcome message
  const dashboardWelcomeMessage = `# Welcome to your ProposalHub Workspace! 👋

I'm here to help you manage your opportunities, proposals, and business development workflow. Here's what I can do:

## 📄 Document Analysis
- **Drop files here** to automatically analyze them
- **RFPs & Requirements**: I'll suggest creating new opportunities
- **Proposals**: I'll help you improve existing content
- **CSV/Spreadsheets**: I can extract contacts, opportunities, and organizations
- **Notes & References**: I'll add them to your knowledge base

## 🚀 Quick Actions
- Ask me to create new opportunities or proposals
- Get insights from your existing data
- Find similar documents across your workspace
- Extract contacts and organizations from any document

## 💡 Pro Tips
- **Drag & Drop**: Just drop any document to get started
- **Natural Language**: Ask me anything in plain English
- **Context Aware**: I know about all your opportunities and proposals
- **Smart Suggestions**: I'll recommend the best actions for each document

Try dropping a document or asking me something like "show me my latest opportunities" or "create a new proposal for [company]"!`;

  return (
    <div className="h-full flex bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-all duration-300 relative">
      {/* Draggable Resize Handle - positioned based on view state */}
      <div 
        className={`absolute top-1/2 transform -translate-y-1/2 z-20 group ${
          viewState === 'fullscreen' ? 'left-0 cursor-pointer' : '-left-6 cursor-col-resize'
        }`}
        onMouseDown={viewState === 'fullscreen' ? undefined : handleMouseDown}
        onClick={handleResizeClick}
        title={viewState === 'fullscreen' ? 'Click to collapse' : 'Drag to resize, click to expand/collapse'}
      >
        <div className={`w-6 h-16 bg-gray-300 dark:bg-gray-600 shadow-md flex items-center justify-center group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors ${
          viewState === 'fullscreen' ? 'rounded-r-lg' : 'rounded-l-lg'
        }`}>
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1">
        <ChatContainer
          entityType="workspace"
          entityId={session?.user?.activeOrganizationId || 'dashboard'}
          contactId={session?.user?.contact?.id || ''}
          currentTab="dashboard"
          onActionClick={handleDashboardAction}
          dashboardContext={dashboardContext}
          welcomeMessage={dashboardWelcomeMessage}
          enableSSE={true}
          // No section-related props for dashboard
        />
      </div>
    </div>
  );
} 