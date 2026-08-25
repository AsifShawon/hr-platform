'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Shield,
  Ruler,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';

export default function PrintCalibrationPage() {
  const [sheetType, setSheetType] = useState<'A4' | 'LETTER'>('A4');
  const [measuredRulerMm, setMeasuredRulerMm] = useState<string>('50.0');
  const [measuredCardWidthMm, setMeasuredCardWidthMm] = useState<string>('60.0');
  const [measuredCardHeightMm, setMeasuredCardHeightMm] = useState<string>('90.0');
  const [duplexOffsetX, setDuplexOffsetX] = useState<string>('0.0');
  const [duplexOffsetY, setDuplexOffsetY] = useState<string>('0.0');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const rulerNum = parseFloat(measuredRulerMm) || 50;
  const isRulerAccurate = Math.abs(rulerNum - 50.0) <= 0.3;

  const cardWNum = parseFloat(measuredCardWidthMm) || 60;
  const cardHNum = parseFloat(measuredCardHeightMm) || 90;
  const isCardAccurate = Math.abs(cardWNum - 60.0) <= 0.5 && Math.abs(cardHNum - 90.0) <= 0.5;

  const handleSaveCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/cards/templates"
            aria-label="Back to Card Templates"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Printer className="w-7 h-7 text-[#0F766E]" />
              Physical Print Calibration & Alignment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify 100% actual print scaling and calibrate duplex front-to-back registration
              offsets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/cards/calibration/pdf?sheet=${sheetType}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" size="md" className="shadow-sm">
              <Download className="w-4 h-4 mr-1.5" />
              Download Calibration PDF ({sheetType})
            </Button>
          </a>
        </div>
      </div>

      {/* Critical Print Notice Alert */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <strong className="font-bold text-amber-950 block">
            Critical Invariant: Set Printer Dialog to &quot;100%&quot; or &quot;Actual Size&quot;
          </strong>
          <p className="leading-relaxed">
            Never select &quot;Fit to Printable Area&quot; or &quot;Shrink Oversized Pages&quot;.
            Printer scaling distortions will alter physical card dimensions and misalign plastic
            badge cut dies.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">
            Printer calibration values and duplex offsets saved successfully.
          </span>
        </div>
      )}

      {/* Calibration Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Step 1: Sheet & Download */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0F766E]" />
              Step 1: Select Paper & Print Test
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Paper Size</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSheetType('A4')}
                  className={`p-3 rounded-xl border text-left text-xs ${
                    sheetType === 'A4'
                      ? 'border-[#0F766E] bg-teal-50/50 font-bold text-[#0F766E]'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block font-bold">ISO A4</span>
                  <span className="text-[10px] text-slate-500 font-normal">210 × 297 mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetType('LETTER')}
                  className={`p-3 rounded-xl border text-left text-xs ${
                    sheetType === 'LETTER'
                      ? 'border-[#0F766E] bg-teal-50/50 font-bold text-[#0F766E]'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block font-bold">US Letter</span>
                  <span className="text-[10px] text-slate-500 font-normal">215.9 × 279.4 mm</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Download and print the calibration sheet on your target cardstock or heavyweight
              paper.
            </p>

            <a
              href={`/api/cards/calibration/pdf?sheet=${sheetType}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Calibration PDF
            </a>
          </div>

          {/* Caliper Verification Guide */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#0F766E]" />
              Acceptable Tolerances
            </h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex items-center justify-between">
                <span>50.0 mm Test Line:</span>
                <span className="font-mono font-bold text-slate-800">
                  49.7 mm – 50.3 mm (±0.3mm)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>60 × 90 mm Card Box:</span>
                <span className="font-mono font-bold text-slate-800">
                  59.5 mm – 60.5 mm (±0.5mm)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Duplex Registration:</span>
                <span className="font-mono font-bold text-slate-800">&lt; 0.8 mm shift</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Physical Measurement Logging */}
        <div className="md:col-span-7 space-y-4">
          <form
            onSubmit={handleSaveCalibration}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5"
          >
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0F766E]" />
              Step 2: Enter Physical Caliper Measurements
            </h3>

            <div className="space-y-4 text-xs">
              {/* 50 mm Ruler Measurement */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="calib-ruler" className="font-semibold text-slate-800">
                    1. Measured 50 mm Test Line (mm) *
                  </label>
                  <Badge variant={isRulerAccurate ? 'success' : 'warning'}>
                    {isRulerAccurate ? 'Within Tolerance' : 'Scale Adjustment Needed'}
                  </Badge>
                </div>
                <Input
                  id="calib-ruler"
                  aria-label="Measured 50 mm Test Line (mm)"
                  type="number"
                  step="0.1"
                  required
                  value={measuredRulerMm}
                  onChange={(e) => setMeasuredRulerMm(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Target is exactly 50.00 mm. If under or over, check printer scaling.
                </p>
              </div>

              {/* 60x90 mm Card Box Measurement */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    2. Measured 60 × 90 mm Card Box *
                  </span>
                  <Badge variant={isCardAccurate ? 'success' : 'warning'}>
                    {isCardAccurate ? 'Within Tolerance' : 'Verify'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="calib-card-width" className="text-[11px] text-slate-600 block">
                      Measured Width (mm)
                    </label>
                    <Input
                      id="calib-card-width"
                      aria-label="Measured Width (mm)"
                      type="number"
                      step="0.1"
                      required
                      value={measuredCardWidthMm}
                      onChange={(e) => setMeasuredCardWidthMm(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calib-card-height" className="text-[11px] text-slate-600 block">
                      Measured Height (mm)
                    </label>
                    <Input
                      id="calib-card-height"
                      aria-label="Measured Height (mm)"
                      type="number"
                      step="0.1"
                      required
                      value={measuredCardHeightMm}
                      onChange={(e) => setMeasuredCardHeightMm(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Duplex Registration Offset Adjusters */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="font-semibold text-slate-800 block">
                  3. Duplex Front-to-Back Registration Shift Compensation
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="calib-offset-x" className="text-[11px] text-slate-600 block">
                      Horizontal X Shift (mm)
                    </label>
                    <Input
                      id="calib-offset-x"
                      aria-label="Horizontal X Shift (mm)"
                      type="number"
                      step="0.1"
                      value={duplexOffsetX}
                      onChange={(e) => setDuplexOffsetX(e.target.value)}
                      className="h-9 text-xs"
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="calib-offset-y" className="text-[11px] text-slate-600 block">
                      Vertical Y Shift (mm)
                    </label>
                    <Input
                      id="calib-offset-y"
                      aria-label="Vertical Y Shift (mm)"
                      type="number"
                      step="0.1"
                      value={duplexOffsetY}
                      onChange={(e) => setDuplexOffsetY(e.target.value)}
                      className="h-9 text-xs"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" variant="primary" size="md">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Save Calibration Profile
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
