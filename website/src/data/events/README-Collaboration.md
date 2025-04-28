# Document Collaboration Feature

This document provides an overview of the collaborative features for event-related documents.

## Features

The collaboration system allows event attendees to provide feedback and interact with documents in the following ways:

1. **Authentication**
   - Event attendees can join collaboration using their name, email, and event code
   - The event code is stored in `event.json` under the `private.code` field
   - Session persistence with cookies for seamless experience

2. **Document Feedback**
   - Interactive highlighting system:
     - Highlight text to see a popup with "Endorse" and "Challenge" options
     - Inline comment icons appear in the text for quick reference (✓ for endorsements, ? for challenges) 
     - Feedback icons are clickable to view the related comment
   - Feedback types:
     - **Endorse**: Show support for specific content
     - **Challenge**: Question or debate specific content
   - Feedback can be public (with name) or anonymous
   - All comments visible in the right-side panel

3. **Social Sharing**
   - Generate shareable text about documents using AI
   - Share options for Twitter, LinkedIn, and Facebook
   - Customizable sharing with key points
   - Copy-to-clipboard functionality
   - Optimized for different platform character limits

## User Experience

### Layout
- Modern two-panel layout with content on the left, files/comments on the right
- Tabbed interface in the right panel for easy switching between:
  - **Files**: List of available documents
  - **Comments**: View all feedback for the current document

### Interaction Flow
1. Users select a document from the files tab
2. Authenticated users are automatically switched to the comments tab
3. To provide feedback, users highlight text in the document:
   - A popup appears with "Endorse" and "Challenge" buttons
   - Selecting an option opens a comment form
   - After submission, an icon appears inline with the text
4. Clicking a feedback icon in the document highlights the related comment in the panel

## Technical Implementation

### Data Storage

All collaboration data is stored in Vercel Blob Storage with the following patterns:

- Collaborator information: `{eventId}-collaborator-{collaboratorId}.json`
- Feedback items: `{eventId}-feedback-{feedbackId}.json`

### API Endpoints

The collaboration feature exposes the following API endpoints:

1. **Authentication**
   - `POST /api/events/[eventId]/files/collaborate`
     - Authenticates a user with name, email, and event code
     - Sets a session cookie
   - `GET /api/events/[eventId]/files/collaborate`
     - Checks if user is authenticated

2. **Feedback**
   - `POST /api/events/[eventId]/files/collaborate/feedback`
     - Saves endorsements and challenges
   - `GET /api/events/[eventId]/files/collaborate/feedback?fileId={fileId}`
     - Retrieves feedback for a specific file

3. **Social Sharing**
   - `POST /api/events/[eventId]/files/share`
     - Generates social media text using OpenAI

### React Components

- `CollaborationAuth.tsx`: Authentication modal for users to join collaboration
- `CollaborationFeedback.tsx`: Interface for viewing and submitting feedback
  - Manages text selection and popup display
  - Injects feedback icons into document content
  - Displays feedback list in the right panel
- `SocialShare.tsx`: Modal for generating and sharing document content
- Modified `EventFiles.tsx`: 
  - Implements tabbed layout with files and comments
  - Manages document display and panel switching

## Setup Requirements

1. **Environment Variables**
   - Ensure `OPENAI_API_KEY` is set for social sharing
   - `NEXT_PUBLIC_SITE_URL` should point to your site URL for share links

2. **Event Configuration**
   - Add a unique `code` field to the `private` section of your event.json:
   ```json
   {
     "public": { /*...*/ },
     "private": {
       "code": "UNIQUE-EVENT-CODE",
       /*...*/
     }
   }
   ```

## Security Considerations

- Event codes provide basic security for joining collaboration
- Authentication is maintained via HTTP-only cookies
- Vercel Blob Storage provides secure storage for collaboration data
- User can choose whether their name appears with feedback 