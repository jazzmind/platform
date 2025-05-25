
/**
 * Formats a timestamp as a human-readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Formats timer seconds into mm:ss format
 */
export function formatTimerTime(seconds: number | null): string {
  if (seconds === null) return '--:--';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 