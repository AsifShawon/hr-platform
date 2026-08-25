'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, QrCode, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@hr/ui';

interface PhotoStudioQuickBentoPanelProps {
  missingPhotoCount?: number;
}

export function PhotoStudioQuickBentoPanel({
  missingPhotoCount = 0,
}: PhotoStudioQuickBentoPanelProps) {
  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Photo Studio & Mobile Capture</h3>
            <span className="text-[11px] text-slate-500">
              2:3 aspect framing & QR smartphone handoff
            </span>
          </div>
        </div>

        <span className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
          <QrCode className="w-4 h-4" />
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100/80 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span>
              {missingPhotoCount > 0
                ? `${missingPhotoCount} Workers Missing Photos`
                : 'All Active Workers Photographed'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            {missingPhotoCount > 0
              ? 'Capture portraits via attached webcam or send zero-PII QR code to factory floor smartphone.'
              : 'All active workers have approved 300 DPI portrait photos ready for ID card rendering.'}
          </p>
        </div>

        <Link href={missingPhotoCount > 0 ? '/people?hasPhoto=false' : '/people'}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold text-xs shrink-0 shadow-sm"
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            <span>{missingPhotoCount > 0 ? 'Capture Photos' : 'Open Registry'}</span>
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>Automatic EXIF stripping & 300 DPI scaling</span>
        <Link href="/cards/calibration" className="text-[#0F766E] hover:underline font-bold">
          Printer Calibration
        </Link>
      </div>
    </div>
  );
}
