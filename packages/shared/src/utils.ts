import { PairingCommand } from './types';

/**
 * Parses controller commands from a JSON string
 */
export function parseControllerCommands(commandsJson: string | null): PairingCommand[] {
  if (!commandsJson) return [];
  
  try {
    return JSON.parse(commandsJson);
  } catch (error) {
    console.error('Failed to parse controller commands:', error);
    return [];
  }
}

/**
 * Generates a random pairing code
 */
export function generatePairingCode(length: number = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

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