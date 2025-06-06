// This file can be used to export key modules from the @sonnenreich/contact package.
// For now, specific entry points are defined in package.json's "exports" map.

export {}; // Ensures it's treated as a module 

// Export the main component
export { default as BackgroundGenerator } from './components/BackgroundGenerator';

// Export types if needed
export type { BackgroundFormData } from './components/BackgroundGenerator'; 