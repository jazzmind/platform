'use client';

import { useState, useEffect } from 'react';
import { generateBackground } from './actions';
import * as LucideIcons from 'lucide-react';

interface Highlight {
  text: string;
  icon: string;
}

export interface BackgroundFormData {
  name: string;
  tagline: string;
  location: string;
  highlights: Highlight[];
  primaryColor: string;
  secondaryColor: string;
  qrCodeUrl?: string;
  fontSize: number;
  iconSize: number;
  fontFamily: string;
  backgroundStyle: 'gradient' | 'solid' | 'location' | 'skills' | 'tagline' | 'abstract';
  textOpacity: number;
  textColor: string;
  iconColor: string;
}

interface SavedBackground {
  id: string;
  name: string;
  backgroundImageUrl: string; // Only the background without overlay
  formData: BackgroundFormData;
  timestamp: number;
}

interface DisplaySettings {
  showName: boolean;
  showTagline: boolean;
  showQRCode: boolean;
}

// Icon component that dynamically renders Lucide icons
function DynamicIcon({ name, size = 16 }: { name: string; size?: number }) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    return <LucideIcons.Star size={size} />;
  }
  return <IconComponent size={size} />;
}

// Person silhouette overlay component with improved positioning and size
function PersonSilhouetteOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ marginTop: '40px' }}>
        {/* Head positioned below title area - 20% larger */}
        <div 
          className="w-14 h-14 bg-black bg-opacity-25 rounded-full mx-auto mb-1"
        />
        {/* Body - 20% larger */}
        <div 
          className="w-29 h-43 bg-black bg-opacity-25 rounded-2xl mx-auto"
          style={{ width: '100px', height: '100px' }}
        />
        {/* Label positioned higher up */}
        <div className="absolute bottom-7 left-1/2 transform -translate-x-1/2 w-20">
          <span className="text-xs text-gray-500 bg-white bg-opacity-80 px-2 py-1 rounded text-center block">
            Your video area
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BackgroundGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingTagline, setIsGeneratingTagline] = useState(false);
  const [loadingIconIndex, setLoadingIconIndex] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null); // Background without overlay
  const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    showName: true,
    showTagline: true,
    showQRCode: true
  });
  const [formData, setFormData] = useState<BackgroundFormData>({
    name: '',
    tagline: '',
    location: '',
    highlights: [
      { text: '', icon: 'Star' },
      { text: '', icon: 'Star' },
      { text: '', icon: 'Star' }
    ],
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    qrCodeUrl: '',
    fontSize: 36,
    iconSize: 32,
    fontFamily: 'Inter',
    backgroundStyle: 'gradient',
    textOpacity: 1.0,
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF'
  });

  const fontFamilies = [
    { name: 'Inter', label: 'Inter (Modern)' },
    { name: 'Roboto', label: 'Roboto (Clean)' },
    { name: 'Open Sans', label: 'Open Sans (Friendly)' },
    { name: 'Montserrat', label: 'Montserrat (Bold)' },
    { name: 'Lato', label: 'Lato (Professional)' },
    { name: 'Poppins', label: 'Poppins (Rounded)' },
    { name: 'Source Sans Pro', label: 'Source Sans Pro (Tech)' },
    { name: 'Nunito', label: 'Nunito (Soft)' },
    { name: 'Arial', label: 'Arial (Classic)' },
    { name: 'Helvetica', label: 'Helvetica (Swiss)' }
  ];

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('bgmaker-form-data');
    const savedDisplaySettings = localStorage.getItem('bgmaker-display-settings');
    const savedBackgroundsData = localStorage.getItem('bgmaker-saved-backgrounds');
    
    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData));
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
    
    if (savedDisplaySettings) {
      try {
        setDisplaySettings(JSON.parse(savedDisplaySettings));
      } catch (error) {
        console.error('Error loading saved display settings:', error);
      }
    }
    
    if (savedBackgroundsData) {
      try {
        setSavedBackgrounds(JSON.parse(savedBackgroundsData));
      } catch (error) {
        console.error('Error loading saved backgrounds:', error);
      }
    }
  }, []);

  // Auto-save form data and display settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('bgmaker-form-data', JSON.stringify(formData));
    } catch (error) {
      console.error('Error auto-saving form data:', error);
    }
  }, [formData]);

  useEffect(() => {
    try {
      localStorage.setItem('bgmaker-display-settings', JSON.stringify(displaySettings));
    } catch (error) {
      console.error('Error auto-saving display settings:', error);
    }
  }, [displaySettings]);

  // Auto-save generated background - only store background without overlay
  useEffect(() => {
    if (backgroundImage && formData.name.trim()) {
      const newBackground: SavedBackground = {
        id: Date.now().toString(),
        name: formData.name || 'Untitled Background',
        backgroundImageUrl: backgroundImage, // Only store background, not full image
        formData: { ...formData },
        timestamp: Date.now()
      };
      
      setSavedBackgrounds(prev => {
        // Remove any existing background with the same name to avoid duplicates
        const filtered = prev.filter(bg => bg.name !== newBackground.name);
        
        // Keep only the most recent 10 backgrounds to manage storage
        const limited = [...filtered, newBackground].slice(-10);
        
        try {
          // Check localStorage quota before saving
          const dataToSave = JSON.stringify(limited);
          const sizeInBytes = new Blob([dataToSave]).size;
          const sizeInMB = sizeInBytes / (1024 * 1024);
          
          // If approaching 5MB limit, remove oldest entries
          if (sizeInMB > 4) {
            const reducedList = limited.slice(-5); // Keep only 5 most recent
            localStorage.setItem('bgmaker-saved-backgrounds', JSON.stringify(reducedList));
            console.log(`Reduced saved backgrounds to ${reducedList.length} items to manage storage`);
            return reducedList;
          } else {
            localStorage.setItem('bgmaker-saved-backgrounds', dataToSave);
            return limited;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, clearing old backgrounds');
            // Keep only the 3 most recent backgrounds
            const minimal = limited.slice(-3);
            try {
              localStorage.setItem('bgmaker-saved-backgrounds', JSON.stringify(minimal));
              return minimal;
            } catch (secondError) {
              console.error('Failed to save even minimal backgrounds:', secondError);
              return prev; // Return previous state if all fails
            }
          } else {
            console.error('Error auto-saving background:', error);
            return prev;
          }
        }
      });
    }
  }, [backgroundImage, formData.name]); // Only depend on backgroundImage, not generatedImage

  // Delete saved background
  const deleteSavedBackground = (id: string) => {
    const updatedBackgrounds = savedBackgrounds.filter(bg => bg.id !== id);
    setSavedBackgrounds(updatedBackgrounds);
    localStorage.setItem('bgmaker-saved-backgrounds', JSON.stringify(updatedBackgrounds));
  };

  // Load saved background and regenerate overlay
  const loadSavedBackground = async (background: SavedBackground) => {
    setFormData(background.formData);
    setBackgroundImage(background.backgroundImageUrl);
    
    // Regenerate the full image with overlay using the saved background
    setIsGenerating(true);
    try {
      const filteredHighlights = background.formData.highlights.filter(h => h.text.trim() !== '');
      
      const result = await generateBackground({
        ...background.formData,
        highlights: filteredHighlights,
        displaySettings,
        backgroundImageUrl: background.backgroundImageUrl // Use saved background
      });

      if (result.success && result.imageUrl) {
        setGeneratedImage(result.imageUrl);
      }
    } catch (error) {
      console.error('Error regenerating background overlay:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const researchPerson = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name first');
      return;
    }

    setIsResearching(true);
    try {
      const response = await fetch('/api/research-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name })
      });

      const result = await response.json();
      
      if (result.success && result.highlights) {
        // Convert highlights to objects with icons
        const highlightsWithIcons = await Promise.all(
          result.highlights.map(async (text: string) => {
            const iconResponse = await fetch('/api/recommend-icon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ highlight: text })
            });
            const iconResult = await iconResponse.json();
            return {
              text,
              icon: iconResult.success ? iconResult.icon : 'Star'
            };
          })
        );

        setFormData(prev => ({
          ...prev,
          highlights: highlightsWithIcons
        }));
      } else {
        alert('Failed to research person. Please try manually entering highlights.');
      }
    } catch (error) {
      console.error('Error researching person:', error);
      alert('An error occurred while researching. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const generateTagline = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name first');
      return;
    }

    setIsGeneratingTagline(true);
    try {
      const highlights = formData.highlights.filter(h => h.text.trim() !== '').map(h => h.text);
      const response = await fetch('/api/generate-tagline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name,
          highlights: highlights
        })
      });

      const result = await response.json();
      
      if (result.success && result.tagline) {
        setFormData(prev => ({
          ...prev,
          tagline: result.tagline
        }));
      } else {
        alert('Failed to generate tagline. Please try entering one manually.');
      }
    } catch (error) {
      console.error('Error generating tagline:', error);
      alert('An error occurred while generating tagline. Please try again.');
    } finally {
      setIsGeneratingTagline(false);
    }
  };

  const recommendIcon = async (index: number) => {
    const highlight = formData.highlights[index];
    if (!highlight.text.trim()) return;

    setLoadingIconIndex(index);
    try {
      const response = await fetch('/api/recommend-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlight: highlight.text })
      });

      const result = await response.json();
      
      if (result.success) {
        updateHighlight(index, 'icon', result.icon);
      }
    } catch (error) {
      console.error('Error recommending icon:', error);
    } finally {
      setLoadingIconIndex(null);
    }
  };

  const addHighlight = () => {
    if (formData.highlights.length < 10) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, { text: '', icon: 'Star' }]
      }));
    }
  };

  const removeHighlight = (index: number) => {
    if (formData.highlights.length > 1) {
      setFormData(prev => ({
        ...prev,
        highlights: prev.highlights.filter((_, i) => i !== index)
      }));
    }
  };

  const updateHighlight = (index: number, field: 'text' | 'icon', value: string) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => 
        i === index ? { ...h, [field]: value } : h
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateNewBackground();
  };

  const generateNewBackground = async () => {
    setIsGenerating(true);
    
    try {
      // Filter out empty highlights
      const filteredHighlights = formData.highlights.filter(h => h.text.trim() !== '');
      
      const result = await generateBackground({
        ...formData,
        highlights: filteredHighlights,
        tagline: formData.tagline,
        displaySettings
      });

      if (result.success && result.imageUrl) {
        // Store both background and full image
        setBackgroundImage(result.backgroundImageUrl || result.imageUrl);
        setGeneratedImage(result.imageUrl);
      } else {
        console.error('Failed to generate background:', result.error);
        alert('Failed to generate background. Please try again.');
      }
    } catch (error) {
      console.error('Error generating background:', error);
      alert('An error occurred while generating the background.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateOverlay = async () => {
    if (!backgroundImage) return;
    
    setIsGenerating(true);
    try {
      // Filter out empty highlights
      const filteredHighlights = formData.highlights.filter(h => h.text.trim() !== '');
      
      const result = await generateBackground({
        ...formData,
        highlights: filteredHighlights,
        displaySettings,
        backgroundImageUrl: backgroundImage // Pass existing background
      });

      if (result.success && result.imageUrl) {
        setGeneratedImage(result.imageUrl);
      } else {
        console.error('Failed to update overlay:', result.error);
        alert('Failed to update overlay. Please try again.');
      }
    } catch (error) {
      console.error('Error updating overlay:', error);
      alert('An error occurred while updating the overlay.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'video-conference-background.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Powered Background Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Create a professional background that showcases your achievements with AI assistance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input with Research Button */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Tagline Input with Auto Generate Button */}
              <div>
                <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Professional Tagline
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., 'Innovation Leader & Strategic Thinker'"
                  />
                  <button
                    type="button"
                    onClick={generateTagline}
                    disabled={isGeneratingTagline || !formData.name.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center space-x-2"
                  >
                    {isGeneratingTagline ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <LucideIcons.Sparkles size={16} />
                        <span>Auto Generate</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Will appear below your name in the background
                </p>
              </div>

              {/* Location Input */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., San Francisco, New York, London"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Used for location-based background generation
                </p>
              </div>

              {/* QR Code URL */}
              <div>
                <label htmlFor="qrCodeUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LinkedIn or Website URL (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={formData.qrCodeUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, qrCodeUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                  <button
                    type="button"
                    onClick={researchPerson}
                    disabled={isResearching || !formData.name.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors flex items-center space-x-2"
                  >
                    {isResearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Researching...</span>
                      </>
                    ) : (
                      <>
                        <LucideIcons.Search size={16} />
                        <span>Research</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A real QR code will be added to the upper left corner
                </p>
              </div>

              {/* Personal Highlights with Icons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Personal Highlights ({formData.highlights.length}/10)
                </label>
                <div className="space-y-3">
                  {formData.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {/* Icon selector with loading state */}
                      <button
                        type="button"
                        onClick={() => recommendIcon(index)}
                        disabled={loadingIconIndex === index}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        title="Click to get AI icon recommendation"
                      >
                        {loadingIconIndex === index ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <DynamicIcon name={highlight.icon} size={16} />
                        )}
                      </button>
                      
                      {/* Text input */}
                      <input
                        type="text"
                        value={highlight.text}
                        onChange={(e) => updateHighlight(index, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={`Achievement or highlight ${index + 1}`}
                      />
                      
                      {/* Remove button */}
                      {formData.highlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHighlight(index)}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <LucideIcons.X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.highlights.length < 10 && (
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex items-center space-x-1"
                  >
                    <LucideIcons.Plus size={16} />
                    <span>Add Another Highlight</span>
                  </button>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Click on icons to get AI recommendations based on your highlights
                </p>
              </div>

              {/* Background Style Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Background Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'gradient' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'gradient'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.Palette size={16} />
                      <span>Gradient</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Color gradient background
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'solid' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'solid'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.Square size={16} />
                      <span>Solid</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Single color background
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'location' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'location'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.MapPin size={16} />
                      <span>Location</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      City skyline from location
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'abstract' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'abstract'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.Zap size={16} />
                      <span>Abstract</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      AI abstract patterns
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'skills' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'skills'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.Sparkles size={16} />
                      <span>Skills</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      AI-generated from skills
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, backgroundStyle: 'tagline' }))}
                    className={`p-3 border rounded-lg text-sm transition-colors ${
                      formData.backgroundStyle === 'tagline'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <LucideIcons.Tag size={16} />
                      <span>Tagline</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      AI-generated from tagline
                    </p>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating || !formData.name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating Background...</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.ImageIcon size={16} />
                    <span>Generate Background</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Preview
            </h3>
            
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="Generated background"
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                  {/* Person silhouette overlay - only in preview */}
                  <PersonSilhouetteOverlay />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={downloadImage}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <LucideIcons.Download size={16} />
                    <span>Download Background</span>
                  </button>
                </div>

                {/* Display Toggles */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Display Elements
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={displaySettings.showName}
                        onChange={(e) => setDisplaySettings(prev => ({ ...prev, showName: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Name</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={displaySettings.showTagline}
                        onChange={(e) => setDisplaySettings(prev => ({ ...prev, showTagline: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show Tagline</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={displaySettings.showQRCode}
                        onChange={(e) => setDisplaySettings(prev => ({ ...prev, showQRCode: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show QR Code</span>
                    </label>
                  </div>
                </div>
                
                {/* Font and Icon Size Controls */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Customize Design & Layout
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Font Size - Increased range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Font Size: {formData.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="84"
                        value={formData.fontSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    {/* Icon Size - Increased range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Icon Size: {formData.iconSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="72"
                        value={formData.iconSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, iconSize: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Font Family Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Font Family
                    </label>
                    <select
                      value={formData.fontFamily}
                      onChange={(e) => setFormData(prev => ({ ...prev, fontFamily: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {fontFamilies.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Primary Color */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Primary Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-8 w-12 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>

                    {/* Secondary Color */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="h-8 w-12 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.secondaryColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="#1E40AF"
                        />
                      </div>
                    </div>

                    {/* Text Color Control */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                          className="h-8 w-12 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.textColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>

                    {/* Icon Color Control */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Icon Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.iconColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, iconColor: e.target.value }))}
                          className="h-8 w-12 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.iconColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, iconColor: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Text Opacity Control */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Text & Icon Opacity: {Math.round(formData.textOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={formData.textOpacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, textOpacity: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <button
                    onClick={updateOverlay}
                    disabled={isGenerating}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                  >
                    {isGenerating ? 'Updating...' : 'Update Background'}
                  </button>
                </div>

                {/* Saved Backgrounds */}
                {savedBackgrounds.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Saved Backgrounds ({savedBackgrounds.length}/10)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {savedBackgrounds.map((background) => (
                        <div key={background.id} className="relative group">
                          <img
                            src={background.backgroundImageUrl}
                            alt={background.name}
                            className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => loadSavedBackground(background)}
                          />
                          <button
                            onClick={() => deleteSavedBackground(background.id)}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <LucideIcons.X size={12} />
                          </button>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                            {background.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Backgrounds auto-save. Overlays regenerate when loaded.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  The person silhouette is just a preview guide - it won't appear in your downloaded background
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <LucideIcons.ImageIcon className="mx-auto h-12 w-12" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Your generated background will appear here
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Use AI research to auto-fill highlights
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}