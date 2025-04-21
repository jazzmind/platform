import { list, put, del } from "@vercel/blob";

// Max requests per day per client
const MAX_REQUESTS_PER_DAY = 20;

/**
 * Check if the current session has exceeded the rate limit
 * @param sessionId A unique identifier for the session (e.g., userId or sessionId)
 * @returns An object with remainingRequests and isRateLimited
 */
export async function checkRateLimit(sessionId: string = 'global'): Promise<{
  remainingRequests: number;
  isRateLimited: boolean;
}> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, '_'); // Prevent invalid characters
    const blobName = `rate-limit-${sanitizedSessionId}-${today}.json`;
    
    // Try to fetch existing rate limit data
    let rateData: { count: number; resetAt: number } = { count: 1, resetAt: 0 };
    let blobExists = false;
    
    // List blobs with this exact prefix to find if it exists
    const existingBlobs = await list({ prefix: blobName });
    
    if (existingBlobs.blobs.length > 0) {
      blobExists = true;
      // Get the blob contents
      const response = await fetch(existingBlobs.blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        rateData = data;
      }
    }
    
    // Current time
    const now = Date.now();
    
    // If data is expired (day changed) or the blob doesn't exist, reset/initialize it
    if (!blobExists || rateData.resetAt < now) {
      const tomorrow = getEndOfDay();
      rateData = {
        count: 1,
        resetAt: tomorrow.getTime()
      };
      
      // Save the updated rate data
      await put(blobName, JSON.stringify(rateData), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false
      });
      
      return {
        remainingRequests: MAX_REQUESTS_PER_DAY - 1,
        isRateLimited: false
      };
    }
    
    // Check if rate limited
    if (rateData.count >= MAX_REQUESTS_PER_DAY) {
      return {
        remainingRequests: 0,
        isRateLimited: true
      };
    }
    
    // Increment count
    rateData.count += 1;
    
    // Save updated count
    await put(blobName, JSON.stringify(rateData), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false
    });
    
    return {
      remainingRequests: MAX_REQUESTS_PER_DAY - rateData.count,
      isRateLimited: false
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    
    // Allow the request if there's an error with rate limiting
    return {
      remainingRequests: 1,
      isRateLimited: false
    };
  }
}

// Clean up expired rate limits
export async function cleanupRateLimits(): Promise<void> {
  try {
    // List all blobs with the rate-limit prefix
    const { blobs } = await list({ prefix: 'rate-limit-' });
    const now = Date.now();
    
    // Process each blob
    for (const blob of blobs) {
      try {
        // Skip if it's not a JSON file
        if (!blob.pathname.endsWith('.json')) continue;
        
        // Try to fetch and parse
        const response = await fetch(blob.url);
        if (response.ok) {
          const data = await response.json();
          
          // Delete blob if it's expired
          if (data.resetAt && data.resetAt < now) {
            await del(blob.pathname);
          }
        }
      } catch {
        // If we can't parse it, try to delete it
        try {
          await del(blob.pathname);
        } catch {
          // Ignore errors deleting blobs
        }
      }
    }
  } catch (cleanupError) {
    console.error('Error cleaning up rate limits:', cleanupError);
  }
}

/**
 * Helper function to get end of the current day
 */
function getEndOfDay(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
} 