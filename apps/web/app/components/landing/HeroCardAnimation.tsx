'use client';

import React, { useState } from 'react';
import { RefreshCw, QrCode, ShieldCheck } from 'lucide-react';

export function HeroCardAnimation() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* 3D Perspective Container */}
      <div className="w-[280px] sm:w-[310px] h-[420px] sm:h-[460px] [perspective:1000px] relative">
        <div
          className={`w-full h-full relative transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* ================= FRONT SIDE (ENGLISH) ================= */}
          <div className="absolute inset-0 w-full h-full bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/90 flex flex-col justify-between [backface-visibility:hidden] overflow-hidden">
            {/* Top Brand Stripe */}
            <div className="h-4 bg-[#134E4A] -mx-5 -mt-5 mb-3 flex items-center justify-end px-3">
              <span className="text-[9px] font-mono text-teal-200">60 × 90 mm</span>
            </div>

            {/* Company Banner */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#134E4A] shrink-0 font-bold text-xs">
                AIG
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block leading-tight truncate">
                  Apex Industrial Group
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Gazipur Manufacturing Facility
                </span>
              </div>
            </div>

            {/* Worker Portrait & Key Attributes */}
            <div className="flex flex-col items-center text-center my-auto py-2">
              <div className="w-24 h-32 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-300 shadow-inner flex flex-col items-center justify-center relative overflow-hidden mb-3">
                <div className="w-12 h-12 rounded-full bg-slate-300/80 border-2 border-white mb-1" />
                <div className="w-20 h-10 rounded-t-full bg-slate-400/80" />
                <span className="absolute bottom-1 right-1.5 px-1 py-0.5 rounded text-[8px] font-bold bg-[#134E4A] text-white">
                  300 DPI
                </span>
              </div>

              <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                Tanvir Ahmed
              </h4>
              <span className="text-xs font-semibold text-[#0F766E] mt-0.5">
                Senior Production Manager
              </span>
              <span className="text-[11px] font-mono text-slate-500 mt-1">
                ID: EMP-1001 • Shift A
              </span>
            </div>

            {/* Bottom Invariants Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>CARD-2026-004812</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Validated
              </span>
            </div>
          </div>

          {/* ================= BACK SIDE (BANGLA) ================= */}
          <div className="absolute inset-0 w-full h-full bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/90 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden">
            {/* Top Brand Stripe */}
            <div className="h-4 bg-[#0F766E] -mx-5 -mt-5 mb-3 flex items-center justify-end px-3">
              <span className="text-[9px] font-medium text-teal-100">বাংলা বিবরণ ও নির্দেশনা</span>
            </div>

            {/* Bengali Company Banner */}
            <div className="text-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                এপেক্স ইন্ডাস্ট্রিয়াল গ্রুপ
              </h4>
              <span className="text-[10px] text-slate-500">গাজীপুর প্ল্যান্ট, ঢাকা</span>
            </div>

            {/* Bengali Worker Details */}
            <div className="space-y-2.5 my-auto text-xs">
              <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100/80">
                <span className="text-[10px] text-slate-500 block">নাম (বাংলা):</span>
                <span className="text-sm font-bold text-[#134E4A] block">তানভীর আহমেদ</span>
                <span className="text-[11px] text-slate-700 block">সিনিয়র উৎপাদন ব্যবস্থাপক</span>
              </div>

              {/* QR Code Payload Miniature */}
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center p-1">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div className="text-left text-[10px] text-slate-500 space-y-0.5 leading-snug">
                  <span className="font-bold text-slate-800 block">অফিসিয়াল পরিচয়পত্র</span>
                  <span>হারিয়ে গেলে নিকটস্থ থানায় বা মানবসম্পদ বিভাগে জমা দিন।</span>
                </div>
              </div>
            </div>

            {/* Bottom Legal Notice */}
            <div className="pt-2 border-t border-slate-100 text-center text-[9px] text-slate-400">
              <span>জরুরী যোগাযোগ: +৮৮০ ২ ৯৮৭৬৫৪৩ • hr@apex-local.lan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Flip Toggle Button */}
      <button
        type="button"
        onClick={() => setIsFlipped(!isFlipped)}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-900/60 hover:bg-teal-800 text-teal-100 text-xs font-bold border border-teal-700/80 shadow-md backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
        aria-label={isFlipped ? 'Flip to English Front' : 'Flip to Bengali Back'}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-[#14B8A6] transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`}
        />
        <span>{isFlipped ? 'Show Front (English)' : 'Show Back (বাংলা)'}</span>
      </button>
    </div>
  );
}
