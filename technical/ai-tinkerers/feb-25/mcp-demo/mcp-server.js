/**
 * Example MCP Server with Notion Integration
 * 
 * This demonstrates how to set up a Model Control Protocol server
 * that enables AI agents in Cursor to interact with Notion.
 */

// Import necessary libraries
// Note: This is a conceptual implementation - actual SDK might differ
import { MCPServer } from '@anthropic-ai/mcp-sdk';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the MCP server
const server = new MCPServer({
  name: 'notion-mcp',
  description: 'MCP server for Notion integration',
  version: '1.0.0',
});

// Initialize Notion client (would use environment variables in production)
const notionApiKey = process.env.NOTION_API_KEY || 'your_notion_api_key';
const notion = new Client({ auth: notionApiKey });

/**
 * Search for pages in Notion
 */
const notionSearchPages = async ({ query, notionApiKey }) => {
  try {
    // Use client's API key if provided, otherwise use default
    const client = notionApiKey 
      ? new Client({ auth: notionApiKey }) 
      : notion;
    
    const response = await client.search({
      query,
      filter: { property: 'object', value: 'page' }
    });
    
    return {
      status: 'success',
      results: response.results,
      nextCursor: response.next_cursor,
      hasMore: response.has_more
    };
  } catch (error) {
    console.error('Error searching Notion:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Create a new page in Notion
 */
const notionCreatePage = async ({ createOptions, notionApiKey }) => {
  try {
    // Use client's API key if provided, otherwise use default
    const client = notionApiKey 
      ? new Client({ auth: notionApiKey }) 
      : notion;
    
    const response = await client.pages.create(createOptions);
    
    return {
      status: 'success',
      page: response
    };
  } catch (error) {
    console.error('Error creating Notion page:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Update a page in Notion
 */
const notionUpdatePage = async ({ pageId, updateOptions, notionApiKey }) => {
  try {
    // Use client's API key if provided, otherwise use default
    const client = notionApiKey 
      ? new Client({ auth: notionApiKey }) 
      : notion;
    
    const response = await client.pages.update({
      page_id: pageId,
      ...updateOptions
    });
    
    return {
      status: 'success',
      page: response
    };
  } catch (error) {
    console.error('Error updating Notion page:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

/**
 * Append blocks to a page in Notion
 */
const notionAppendBlocks = async ({ blockId, children, notionApiKey }) => {
  try {
    // Use client's API key if provided, otherwise use default
    const client = notionApiKey 
      ? new Client({ auth: notionApiKey }) 
      : notion;
    
    const response = await client.blocks.children.append({
      block_id: blockId,
      children
    });
    
    return {
      status: 'success',
      results: response.results
    };
  } catch (error) {
    console.error('Error appending blocks:', error);
    return {
      status: 'error',
      message: error.message,
    };
  }
};

// Register all the Notion functions with the MCP server
server.registerFunction({
  name: 'mcp_notion_search_pages',
  description: 'Search through pages in Notion.',
  parameters: {
    properties: {
      query: { type: 'string' },
      notionApiKey: { type: 'string' }
    },
    required: ['query']
  },
  function: notionSearchPages
});

server.registerFunction({
  name: 'mcp_notion_create_page',
  description: 'Create a new page in Notion.',
  parameters: {
    properties: {
      createOptions: { type: 'object' },
      notionApiKey: { type: 'string' }
    },
    required: ['createOptions']
  },
  function: notionCreatePage
});

server.registerFunction({
  name: 'mcp_notion_update_page',
  description: 'Update a page in Notion.',
  parameters: {
    properties: {
      pageId: { type: 'string' },
      updateOptions: { type: 'object' },
      notionApiKey: { type: 'string' }
    },
    required: ['pageId', 'updateOptions']
  },
  function: notionUpdatePage
});

server.registerFunction({
  name: 'mcp_notion_append_block_children',
  description: 'Append children blocks to a block in Notion.',
  parameters: {
    properties: {
      blockId: { type: 'string' },
      children: { type: 'array' },
      notionApiKey: { type: 'string' }
    },
    required: ['blockId', 'children']
  },
  function: notionAppendBlocks
});

// Example of how to create documentation with this MCP server
const createDocumentationExample = async () => {
  // Imagine the agent has extracted API details from code:
  const apiDetails = {
    endpoint: '/api/auth/login',
    method: 'POST',
    parameters: [
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'password', type: 'string', required: true, description: 'User password' }
    ],
    response: {
      success: true,
      user: { id: '123', email: 'user@example.com' },
      token: 'jwt-token-here'
    }
  };
  
  // The agent would then call the MCP function to create documentation:
  const pageContent = {
    parent: { database_id: 'your_database_id' },
    properties: {
      title: {
        title: [{ text: { content: 'Login API' } }]
      },
      Tags: {
        multi_select: [
          { name: 'Authentication' },
          { name: 'API' }
        ]
      }
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Authenticates a user and returns a JWT token for accessing protected resources.`
              }
            }
          ]
        }
      },
      // Additional blocks for parameters, response, etc.
    ]
  };
  
  console.log('Documentation would be created with:', pageContent);
  
  // In actual use, the agent would call:
  // await notionCreatePage({ createOptions: pageContent });
};

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`MCP Notion server running on port ${PORT}`);
  console.log(`Ready to handle Cursor agent requests`);
  
  // Just for example purposes
  createDocumentationExample();
}); 