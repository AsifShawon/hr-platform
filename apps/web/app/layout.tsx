import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HR ID Platform — Local-First Registry & Bilingual Card Issuance',
  description:
    'Professional employee registry and high-precision bilingual ID card issuance platform for private local servers and enterprise clouds.',
  keywords: [
    'employee ID card',
    'bilingual ID card',
    'local-first HR',
    'badge printing',
    'Bengali ID card',
    'on-premises HR',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#134E4A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-white text-slate-900 antialiased flex flex-col overflow-x-hidden">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
