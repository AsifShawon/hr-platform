import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, QrCode } from 'lucide-react';
import { cn } from '../index.js';
import { FICTIONAL_WORKERS } from '@hr/fixtures';

export interface CardPreviewProps {
  workerIndex?: number;
  showBleed?: boolean;
  side?: 'front' | 'back' | 'both';
  className?: string;
  allowFlip?: boolean;
}

export const CardPreviewChrome: React.FC<CardPreviewProps> = ({
  workerIndex = 0,
  showBleed = false,
  side: initialSide = 'both',
  className,
  allowFlip = true,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>(
    initialSide === 'back' ? 'back' : 'front',
  );
  const isBoth = initialSide === 'both';
  const worker = FICTIONAL_WORKERS[workerIndex] || FICTIONAL_WORKERS[0]!;

  const renderFrontCard = () => (
    <div
      className={cn(
        'relative bg-white text-slate-900 shadow-md border border-slate-200/90 rounded-md overflow-hidden flex flex-col justify-between select-none',
        'w-[240px] h-[360px] sm:w-[260px] sm:h-[390px]', // Exact 60:90 (2:3) aspect ratio
        showBleed && 'ring-2 ring-dashed ring-rose-400',
      )}
      style={{ aspectRatio: '60/90' }}
    >
      {/* Top Brand Banner */}
      <div className="bg-[#134E4A] text-white px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-[#14B8A6] flex items-center justify-center font-bold text-[9px] text-[#134E4A]">
            A
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase">Apex Industrial</span>
        </div>
        <span className="text-[9px] bg-teal-800/80 px-1.5 py-0.5 rounded text-teal-100 font-mono">
          ID-2026
        </span>
      </div>

      {/* Main Body */}
      <div className="p-3 flex-1 flex flex-col items-center text-center">
        {/* Photo Container */}
        <div className="relative mt-1 mb-2.5">
          <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-md bg-slate-100 border-2 border-[#0F766E]/20 overflow-hidden shadow-inner flex items-center justify-center">
            {/* SVG Fictional Professional Avatar */}
            <svg
              className="w-full h-full text-slate-400 bg-slate-100"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
        </div>

        {/* Worker Info */}
        <h4 className="text-sm font-bold text-slate-900 leading-tight">
          {worker.displayNameLatin}
        </h4>
        <p className="text-[11px] font-medium text-[#0F766E] leading-snug mt-0.5">{worker.title}</p>
        <span className="text-[10px] text-slate-500 mt-0.5">{worker.department}</span>

        {/* Metadata Grid */}
        <div className="w-full grid grid-cols-2 gap-1.5 mt-2.5 p-1.5 bg-slate-50 rounded border border-slate-100 text-left">
          <div>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
              ID Number
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-800">
              {worker.employeeNumber}
            </span>
          </div>
          <div>
            <span className="text-[8px] uppercase tracking-wider text-slate-400 block">
              Blood Group
            </span>
            <span className="text-[10px] font-semibold text-rose-600">
              {worker.bloodGroup || 'O+'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Signature Area */}
      <div className="px-3 pb-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500">
        <div>
          <span className="block text-slate-400">Issued</span>
          <span className="font-mono text-slate-700">{worker.joinedDate}</span>
        </div>
        <div className="text-right">
          <div className="w-16 border-b border-slate-400 mb-0.5" />
          <span className="text-[7px] text-slate-400">Authorized Sign</span>
        </div>
      </div>
    </div>
  );

  const renderBackCard = () => (
    <div
      className={cn(
        'relative bg-white text-slate-900 shadow-md border border-slate-200/90 rounded-md overflow-hidden flex flex-col justify-between select-none font-sans',
        'w-[240px] h-[360px] sm:w-[260px] sm:h-[390px]', // Exact 60:90 aspect ratio
        showBleed && 'ring-2 ring-dashed ring-rose-400',
      )}
      style={{ aspectRatio: '60/90' }}
    >
      {/* Top Banner (Bangla) */}
      <div className="bg-[#134E4A] text-white px-3 py-2 text-center">
        <span className="text-[12px] font-bold tracking-wide">এপেক্স ইন্ডাস্ট্রিয়াল গ্রুপ</span>
      </div>

      {/* Bangla Details */}
      <div className="p-3 flex-1 flex flex-col justify-between text-left">
        <div>
          <div className="border-b border-slate-100 pb-2 mb-2">
            <span className="text-[9px] text-slate-400 block">নাম:</span>
            <span className="text-sm font-bold text-slate-900 leading-tight">
              {worker.displayNameNative}
            </span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div>
              <span className="text-slate-400 text-[8px] block">জরুরি যোগাযোগ:</span>
              <span className="font-mono font-medium text-slate-800">
                {worker.emergencyContact || '+8801700000001'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[8px] block">রক্তের গ্রুপ:</span>
              <span className="font-bold text-rose-600">{worker.bloodGroup || 'O+'}</span>
            </div>
          </div>
        </div>

        {/* QR Code Verification Section */}
        <div className="my-1.5 flex items-center gap-2 p-1.5 bg-teal-50/60 rounded border border-teal-100">
          <div className="w-10 h-10 bg-white p-1 rounded border border-teal-200 flex items-center justify-center shrink-0">
            <QrCode className="w-8 h-8 text-[#134E4A]" />
          </div>
          <div className="text-[8px] text-slate-600 leading-tight">
            <span className="font-semibold text-[#134E4A] block">ডিজিটাল ভেরিফিকেশন</span>
            <span className="font-mono text-[7px] text-slate-500">
              SN: {worker.employeeNumber}-SEC
            </span>
          </div>
        </div>

        {/* Legal Statement (Bangla) */}
        <p className="text-[8px] text-slate-500 leading-relaxed border-t border-slate-100 pt-1.5">
          এই পরিচয়পত্রটি প্রতিষ্ঠানের সম্পত্তি। কার্ডটি পাওয়া গেলে নিকটস্থ সিকিউরিটি অফিসে জমা
          দিন।
        </p>
      </div>

      {/* Footer / Cardholder Signature */}
      <div className="px-3 pb-2 pt-1 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500">
        <span className="text-[8px] font-medium text-slate-600">কার্ডধারীর স্বাক্ষর</span>
        <div className="w-16 border-b border-slate-400" />
      </div>
    </div>
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {isBoth ? (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">English Front (60×90mm)</span>
            {renderFrontCard()}
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Bangla Back (বাংলা)</span>
            {renderBackCard()}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {allowFlip && (
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:text-[#134E4A] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flip to {activeSide === 'front' ? 'Bangla Back' : 'English Front'}
              </button>
            </div>
          )}
          {activeSide === 'front' ? renderFrontCard() : renderBackCard()}
        </div>
      )}

      {/* Geometry Badge */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200">
        <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
        <span>Standard: 60 mm × 90 mm • 300 DPI Master</span>
      </div>
    </div>
  );
};
