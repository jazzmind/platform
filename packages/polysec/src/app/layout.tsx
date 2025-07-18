import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PolySec - Security Policy Management',
  description: 'A comprehensive security policy management system for processing documents, answering questionnaires, and performing compliance analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
