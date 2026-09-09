'use client';

import React, { useState } from 'react';
import {
  CardLayoutSpecification,
  TemplatePresetId,
  BarcodeType,
  LocaleFallbackPolicy,
  CardOrientation,
} from '@hr/domain';
import { calculateAdaptiveFontSizePt } from '@hr/card-kit/typography';
import { QrCode, RefreshCw, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { cn } from '@hr/ui';

export interface CardWorkerData {
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employeeNumber: string;
  bloodGroup?: string | null;
  joinDate?: string | null;
  emergencyContact?: string | null;
  photoUrl?: string | null;
  orgName?: string | null;
  orgNameBangla?: string | null;
  logoUrl?: string | null;
  serialNumber?: string | null;
}

export interface CardRendererProps {
  layout: CardLayoutSpecification;
  worker?: CardWorkerData;
  side?: 'front' | 'back' | 'both';
  showBleed?: boolean;
  showSafeArea?: boolean;
  allowFlip?: boolean;
  className?: string;
}

export const SAMPLE_WORKER: CardWorkerData = {
  displayName: 'Tanvir Ahmed',
  displayNameLatin: 'Tanvir Ahmed',
  displayNameNative: 'তানভীর আহমেদ',
  jobTitle: 'Senior Quality Auditor',
  department: 'Quality Assurance Dept.',
  employeeNumber: 'EMP-1001',
  bloodGroup: 'O+',
  joinDate: '2022-03-15',
  emergencyContact: '+880 1711-000000',
  orgName: 'London Boy Apparel Ltd.',
  orgNameBangla: 'লন্ডন বয় অ্যাপারেল লি.',
  serialNumber: 'LBA-CARD-883921-SEC',
};

export const CardRenderer: React.FC<CardRendererProps> = ({
  layout,
  worker = SAMPLE_WORKER,
  side: initialSide = 'both',
  showBleed = false,
  showSafeArea = false,
  allowFlip = true,
  className,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>(
    initialSide === 'back' ? 'back' : 'front',
  );
  const isBoth = initialSide === 'both';

  const { theme, dimensions, front, back, localeConfig } = layout;
  const isHorizontal = dimensions.orientation === CardOrientation.HORIZONTAL;

  // Derive aspect ratio CSS
  const aspectRatio = isHorizontal
    ? `${dimensions.widthMm}/${dimensions.heightMm}`
    : `${dimensions.widthMm}/${dimensions.heightMm}`;

  // Fallback calculations for Bangla name
  const hasNativeName = Boolean(worker.displayNameNative?.trim());
  const banglaDisplayName = hasNativeName
    ? worker.displayNameNative!
    : localeConfig.fallbackPolicy === LocaleFallbackPolicy.LATIN_FALLBACK
      ? worker.displayNameLatin || worker.displayName
      : '';

  // Adaptive font size calculation for long names
  const frontName = worker.displayNameLatin || worker.displayName;
  const frontNameSizePt = calculateAdaptiveFontSizePt(frontName, 12, 8, 20);
  const backNameSizePt = calculateAdaptiveFontSizePt(banglaDisplayName, 12, 8, 18);

  // Render Front Side
  const renderFront = () => (
    <div
      className={cn(
        'relative shadow-md border rounded-md overflow-hidden flex flex-col justify-between select-none transition-all',
        'w-[240px] h-[360px] sm:w-[260px] sm:h-[390px]', // Standard card geometry container
        showBleed && 'ring-2 ring-dashed ring-rose-400',
      )}
      style={{
        aspectRatio,
        backgroundColor: theme.backgroundColor || '#FFFFFF',
        color: theme.textColor || '#0F172A',
        borderColor: `${theme.primaryColor}30`,
        fontFamily: theme.fontFamilyLatin || 'Noto Sans, system-ui',
      }}
    >
      {/* Safe Area Guide Overlay */}
      {showSafeArea && (
        <div className="absolute inset-[8px] border border-dashed border-emerald-400 pointer-events-none z-30" />
      )}

      {/* Front Header */}
      <div
        className="px-3 py-2 flex items-center justify-between text-white"
        style={{
          backgroundColor: theme.primaryColor,
          minHeight: `${Math.max(28, (front.header.heightMm / 90) * 360)}px`,
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {front.header.showLogo && (
            <div
              className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0"
              style={{ backgroundColor: theme.accentColor, color: theme.primaryColor }}
            >
              {worker.orgName ? worker.orgName.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          {front.header.showOrgName && (
            <span className="text-[11px] font-bold tracking-wider uppercase truncate">
              {worker.orgName || 'Company Name'}
            </span>
          )}
        </div>
        {front.header.customTitle && (
          <span
            className="text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold"
            style={{ backgroundColor: `${theme.secondaryColor}D0`, color: '#FFFFFF' }}
          >
            {front.header.customTitle}
          </span>
        )}
      </div>

      {/* Front Body */}
      <div className="p-3 flex-1 flex flex-col items-center text-center justify-center">
        {/* Photo Container */}
        {front.photo && (
          <div className="relative mb-2">
            <div
              className="rounded overflow-hidden flex items-center justify-center shadow-inner"
              style={{
                width: `${(front.photo.widthMm / 60) * 220}px`,
                height: `${(front.photo.heightMm / 90) * 330}px`,
                borderRadius: `${front.photo.borderRadiusMm * 2}px`,
                borderColor: front.photo.borderColor || theme.secondaryColor,
                borderWidth: `${Math.max(1, front.photo.borderWidthMm * 2)}px`,
                borderStyle: 'solid',
                backgroundColor: '#F1F5F9',
              }}
            >
              {worker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worker.photoUrl} alt={frontName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                  <User className="w-10 h-10" />
                </div>
              )}
            </div>
            {/* Active Status Dot */}
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: theme.accentColor }}
            />
          </div>
        )}

        {/* Worker Info */}
        <h4
          className="font-bold text-slate-900 leading-tight break-words max-w-full px-1"
          style={{ fontSize: `${frontNameSizePt}pt` }}
        >
          {frontName}
        </h4>

        {front.details?.enabledFields?.includes('jobTitle') && worker.jobTitle && (
          <p
            className="text-[11px] font-semibold leading-snug mt-0.5"
            style={{ color: theme.secondaryColor }}
          >
            {worker.jobTitle}
          </p>
        )}

        {front.details?.enabledFields?.includes('department') && worker.department && (
          <span className="text-[10px] text-slate-500 mt-0.5">{worker.department}</span>
        )}

        {/* Key Details Grid */}
        <div className="w-full grid grid-cols-2 gap-1.5 mt-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-left">
          {front.details?.enabledFields?.includes('employeeNumber') && (
            <div>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-medium">
                {front.details?.customLabels?.employeeNumber || 'ID No'}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-800">
                {worker.employeeNumber}
              </span>
            </div>
          )}
          {front.details?.enabledFields?.includes('bloodGroup') && (
            <div>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-medium">
                {front.details?.customLabels?.bloodGroup || 'Blood'}
              </span>
              <span className="text-[10px] font-bold text-rose-600">
                {worker.bloodGroup || 'O+'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Front Footer */}
      {front.footer && (
        <div className="px-3 pb-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500 bg-slate-50/50">
          <div>
            <span className="block text-slate-400 text-[7px] uppercase">Issued</span>
            <span className="font-mono text-slate-700">{worker.joinDate || '2026-01-01'}</span>
          </div>
          {front.footer.showSignatureLine && (
            <div className="text-right">
              <div className="w-14 border-b border-slate-400 mb-0.5" />
              <span className="text-[7px] text-slate-400">
                {front.footer.signatureLabel || 'Authorized Sign'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Back Side
  const renderBack = () => (
    <div
      className={cn(
        'relative shadow-md border rounded-md overflow-hidden flex flex-col justify-between select-none font-sans transition-all',
        'w-[240px] h-[360px] sm:w-[260px] sm:h-[390px]',
        showBleed && 'ring-2 ring-dashed ring-rose-400',
      )}
      style={{
        aspectRatio,
        backgroundColor: theme.backgroundColor || '#FFFFFF',
        color: theme.textColor || '#0F172A',
        borderColor: `${theme.primaryColor}30`,
        fontFamily: theme.fontFamilyBengali || 'Noto Sans Bengali, sans-serif',
      }}
    >
      {/* Safe Area Guide Overlay */}
      {showSafeArea && (
        <div className="absolute inset-[8px] border border-dashed border-emerald-400 pointer-events-none z-30" />
      )}

      {/* Back Top Banner (Bangla) */}
      <div
        className="px-3 py-2 text-center text-white"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <span className="text-[12px] font-bold tracking-wide">
          {worker.orgNameBangla || worker.orgName || 'প্রতিষ্ঠানের নাম'}
        </span>
      </div>

      {/* Back Body (Bangla details) */}
      <div className="p-3 flex-1 flex flex-col justify-between text-left">
        <div>
          {/* Bengali Name Block */}
          <div className="border-b border-slate-100 pb-2 mb-2">
            <span className="text-[9px] text-slate-400 block font-medium">
              {back.details?.customLabels?.displayName || 'নাম'}:
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="font-bold text-slate-900 leading-tight"
                style={{ fontSize: `${backNameSizePt}pt` }}
              >
                {banglaDisplayName || '—'}
              </span>
              {!hasNativeName && (
                <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-mono font-normal">
                  Latin Fallback
                </span>
              )}
            </div>
          </div>

          {/* Bengali Details List */}
          <div className="space-y-1.5 text-[10px]">
            {back.details?.enabledFields?.includes('emergencyContact') && (
              <div>
                <span className="text-slate-400 text-[8px] block font-medium">
                  {back.details?.customLabels?.emergencyContact || 'জরুরি যোগাযোগ'}:
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {worker.emergencyContact || '+880 1700-000000'}
                </span>
              </div>
            )}
            {back.details?.enabledFields?.includes('bloodGroup') && (
              <div>
                <span className="text-slate-400 text-[8px] block font-medium">
                  {back.details?.customLabels?.bloodGroup || 'রক্তের গ্রুপ'}:
                </span>
                <span className="font-bold text-rose-600">{worker.bloodGroup || 'O+'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Barcode / QR Code Zone (Opaque Random Serial) */}
        {back.barcode && back.barcode.type !== BarcodeType.NONE && (
          <div
            className="my-1.5 flex items-center gap-2 p-1.5 rounded border"
            style={{
              backgroundColor: `${theme.primaryColor}0A`,
              borderColor: `${theme.primaryColor}25`,
            }}
          >
            <div
              className="w-10 h-10 bg-white p-1 rounded border flex items-center justify-center shrink-0"
              style={{ borderColor: `${theme.primaryColor}30` }}
            >
              <QrCode className="w-8 h-8" style={{ color: theme.primaryColor }} />
            </div>
            <div className="text-[8px] text-slate-600 leading-tight overflow-hidden">
              <span className="font-bold block" style={{ color: theme.primaryColor }}>
                ডিজিটাল যাচাইকরণ
              </span>
              <span className="font-mono text-[7px] text-slate-500 truncate block">
                {worker.serialNumber || `${worker.employeeNumber}-SEC`}
              </span>
            </div>
          </div>
        )}

        {/* Back Legal Terms / Return Instructions */}
        {back.footer.instructionsText && (
          <p className="text-[8px] text-slate-500 leading-relaxed border-t border-slate-100 pt-1.5">
            {back.footer.instructionsText}
          </p>
        )}
      </div>

      {/* Back Footer / Signature Line */}
      {back.footer.showSignatureLine && (
        <div className="px-3 pb-2 pt-1 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-500">
          <span className="text-[8px] font-medium text-slate-600">
            {back.footer.signatureLabel || 'কার্ডধারীর স্বাক্ষর'}
          </span>
          <div className="w-16 border-b border-slate-400" />
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {isBoth ? (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">
              English Front ({dimensions.widthMm}×{dimensions.heightMm}mm)
            </span>
            {renderFront()}
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Bangla Back (বাংলা)</span>
            {renderBack()}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {allowFlip && (
            <button
              type="button"
              onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:text-[#134E4A] bg-teal-50 px-3 py-1 rounded-full border border-teal-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Flip to {activeSide === 'front' ? 'Bangla Back (বাংলা)' : 'English Front'}
            </button>
          )}
          {activeSide === 'front' ? renderFront() : renderBack()}
        </div>
      )}

      {/* Geometry Badge */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200">
        <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
        <span>
          Format: {dimensions.widthMm} mm × {dimensions.heightMm} mm (
          {dimensions.orientation.toLowerCase()}) • 300 DPI Master
        </span>
      </div>
    </div>
  );
};
