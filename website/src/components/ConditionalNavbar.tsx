'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't show navbar in p3 section
  if (pathname?.startsWith('/p3')) {
    return null;
  }
  
  return <Navbar />;
} 