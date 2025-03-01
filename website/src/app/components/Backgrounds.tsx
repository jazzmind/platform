import React from 'react';

export const HeroBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 800"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1525" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#0f1629" stopOpacity="0.98" />
          </linearGradient>
          <radialGradient id="glowGradient" cx="70%" cy="30%" r="60%" fx="70%" fy="30%">
            <stop offset="0%" stopColor="#e74c3c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Single path combining rectangle and bottom wave */}
        <path
          d="M0,0 L1440,0 L1440,800 L0,800 Z"
          fill="url(#heroGradient)"
        />
        
        {/* Simple, elegant wave overlay */}
        <path
          d="M0,120 C320,180,640,60,960,120 C1280,180,1440,120,1440,120 L1440,0 L0,0 Z"
          fill="#1a2639"
          fillOpacity="0.4"
        />
        
        {/* Red accent glow */}
        <circle cx="75%" cy="25%" r="250" fill="url(#glowGradient)" />
        
        {/* Subtle blue accent */}
        <circle cx="20%" cy="60%" r="180" fill="#3498db" fillOpacity="0.1" />
        
        {/* Bottom wave transition to Biography section */}
        <path
          d="M0,800 L1440,800 L1440,720 C1080,760,720,680,360,720 C180,740,90,760,0,740 Z"
          fill="url(#heroGradient)"
        />
      </svg>
    </div>
  );
};

export const BiographyBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="bioGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-gray-50 dark:text-gray-900" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" className="text-gray-100 dark:text-gray-800" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Single combined shape with both rectangle and wave transition */}
        <path 
          d="M0,0 L1440,0 L1440,80 C1080,40,720,120,360,80 C180,60,90,40,0,60 L0,100% L1440,100% L1440,calc(100% - 80px) C1080,calc(100% - 40px),720,calc(100% - 120px),360,calc(100% - 80px) C180,calc(100% - 60px),90,calc(100% - 40px),0,calc(100% - 60px) L0,0 Z" 
          fill="url(#bioGradient)"
        />
        
        {/* Subtle pattern */}
        <rect width="100%" height="100%" fill="url(#bioPattern)" fillOpacity="0.05" />
        <defs>
          <pattern
            id="bioPattern"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M50,0 L100,50 L50,100 L0,50 Z"
              fill="none"
              stroke="#3498db"
              strokeOpacity="0.2"
              strokeWidth="1"
            />
          </pattern>
        </defs>
      </svg>
    </div>
  );
};

export const PresentationsBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="presentationsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-gray-100 dark:text-gray-800" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" className="text-gray-200 dark:text-gray-700" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Single combined shape with both content area and transitions */}
        <path
          d="M0,0 L1440,0 L1440,100 C1080,60,720,140,360,100 C180,80,90,60,0,80 L0,100% L1440,100% L1440,calc(100% - 120px) L0,calc(100% - 60px) Z"
          fill="url(#presentationsGradient)"
        />
      </svg>
    </div>
  );
};

export const SpeakingTopicsBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="speakingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="text-white dark:text-gray-900" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" className="text-gray-50 dark:text-gray-800" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Single combined shape with diagonal top and curved bottom */}
        <path
          d="M0,0 L1440,0 L1440,120 L0,60 L0,100% C240,calc(100% - 80px),480,calc(100% - 120px),720,calc(100% - 80px) C960,calc(100% - 40px),1200,calc(100% - 80px),1440,calc(100% - 120px) L1440,100% L0,100% Z"
          fill="url(#speakingGradient)"
        />
        
        {/* Red accent line */}
        <path
          d="M0,55 L1440,115 L1440,120 L0,60 Z"
          fill="#e74c3c"
          fillOpacity="0.9"
        />
        
        {/* Subtle pattern overlay */}
        <rect width="100%" height="100%" fill="url(#speakingPattern)" fillOpacity="0.03" />
        <defs>
          <pattern
            id="speakingPattern"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="20" cy="20" r="2" fill="#3498db" />
          </pattern>
        </defs>
      </svg>
    </div>
  );
};

export const TestimonialsBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="testimonialGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" className="text-gray-50 dark:text-gray-800" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" className="text-white dark:text-gray-900" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* Single combined shape with curved top and bottom */}
        <path
          d="M0,0 C240,80,480,120,720,80 C960,40,1200,80,1440,120 L1440,0 L1440,100% L0,100% L0,calc(100% - 120px) C240,calc(100% - 80px),480,calc(100% - 40px),720,calc(100% - 80px) C960,calc(100% - 120px),1200,calc(100% - 80px),1440,calc(100% - 40px) L0,0 Z"
          fill="url(#testimonialGradient)"
        />
        
        {/* Red accent - curved to match top divider */}
        <path
          d="M0,0 C240,80,480,120,720,80 C960,40,1200,80,1440,120 L1440,0 Z"
          className="fill-red-600 dark:fill-red-800"
          fillOpacity=".3"
          transform="translate(0, -3)"
        />
      </svg>
    </div>
  );
}; 