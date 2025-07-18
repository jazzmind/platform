import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'knowledgebase Package',
  description: 'Dual-mode package supporting standalone and composition use',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
