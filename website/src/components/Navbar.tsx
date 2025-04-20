'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NavLink = ({ href, children, onClick, isMobile = false }: { href: string; children: React.ReactNode; onClick?: () => void; isMobile?: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));
  
  return (
    <Link 
      href={href} 
      className={`${isMobile ? 'block w-full py-3 px-4 text-center' : 'px-4 py-2'} font-medium text-sm transition-colors duration-200 rounded ${
        isActive 
          ? 'text-white bg-red-600 hover:bg-red-700' 
          : 'text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-white'
      }`}
      style={{ backgroundColor: isActive ? 'rgb(220 38 38/var(--tw-bg-opacity,1))' : 'transparent' }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Wes Sonnenreich</span>
            </Link>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex space-x-3">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/#about">About</NavLink>
            <NavLink href="/events">Events</NavLink>
            <NavLink href="/presentations">Presentations</NavLink>
            <NavLink href="/publications">Publications</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              className="p-2 rounded-md text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-white focus:outline-none" 
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              <NavLink href="/" onClick={closeMenu} isMobile>Home</NavLink>
              <NavLink href="/#about" onClick={closeMenu} isMobile>About</NavLink>
              <NavLink href="/events" onClick={closeMenu} isMobile>Events</NavLink>
              <NavLink href="/presentations" onClick={closeMenu} isMobile>Presentations</NavLink>
              <NavLink href="/publications" onClick={closeMenu} isMobile>Publications</NavLink>
              <NavLink href="/contact" onClick={closeMenu} isMobile>Contact</NavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 