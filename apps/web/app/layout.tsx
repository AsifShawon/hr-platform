import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HR ID Platform — Local-First Employee Registry & Bilingual Card Issuance',
  description:
    'High-precision employee registry and physical ID card issuance system. 100% on-premises operation, private LAN mobile photo capture, exact 60×90mm bilingual rendering, and immutable audit trails.',
  keywords: [
    'employee ID card',
    'bilingual ID card',
    'local-first HR',
    'badge printing',
    'Bengali ID card',
    'on-premises HR',
    'factory ID card',
    '60x90mm card',
  ],
  authors: [{ name: 'HR ID Platform Engineering' }],
  robots: {
    index: false,
    follow: false,
  },
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
