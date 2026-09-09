'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'offline',
    question: 'Can the system run 100% offline without an internet connection?',
    answer:
      'Yes. The platform is engineered strictly for on-premises operation on a single PC (127.0.0.1 loopback) or across your factory local network (LAN). All database queries, image processing, self-hosted Noto fonts, and vector PDF rendering run locally with zero external origin calls or cloud telemetry.',
  },
  {
    id: 'dimensions',
    question: 'What physical dimensions and printer hardware are supported?',
    answer:
      'The primary standard format is the 60 mm × 90 mm vertical format (English front, Bangla back), generated as exact-scale 300/600 DPI vector PDFs. Standard ISO/IEC 7810 ID-1 (CR80) formats are also built-in. You can print single cards to dedicated PVC printers or export multi-card A4/Letter sheets for flatbed printing.',
  },
  {
    id: 'phone-camera',
    question: 'How does mobile phone photo capture work on local factory servers?',
    answer:
      'When enrolling a worker, the desktop screen displays a short-lived, zero-PII QR code. An operator scans the QR code with their mobile phone over the internal factory Wi-Fi, captures the portrait, and uploads it directly to the local server. The desktop UI updates instantly via Server-Sent Events (SSE).',
  },
  {
    id: 'security-nid',
    question: 'Where is employee personal data and sensitive government ID stored?',
    answer:
      'All records reside in your local PostgreSQL database and private filesystem volume. Government documents (e.g., Smart NID, Birth Certificate) are optional, AES-256 encrypted, masked by default in all tables, and never printed on standard ID cards without explicit administrative policy.',
  },
  {
    id: 'backups',
    question: 'How are encrypted backups and disaster recovery managed?',
    answer:
      'System Owners can generate self-verifying, AES-256-GCM encrypted `.hrbackup` bundles containing the database state, normalized photos, and template version history at any time. An offline CLI tool is provided for bare-metal disaster recovery if the web UI is unreachable.',
  },
  {
    id: 'signup-policy',
    question: 'Why is there no public self-signup button?',
    answer:
      'To ensure strict tenant isolation and protect employee data from unauthorized network registration, account creation is restricted to verified System Owners during initial installation bootstrap or via administrator user management.',
  },
];

export function LandingFaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-colors"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              data-testid={`faq-btn-${item.id}`}
              className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-[#0F766E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[#0F766E]' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div
                data-testid={`faq-answer-${item.id}`}
                className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-150"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
