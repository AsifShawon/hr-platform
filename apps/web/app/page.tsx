import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Camera,
  Printer,
  Users,
  Lock,
  Database,
  Sliders,
  Server,
  Building2,
  FileCheck2,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge, Button } from '@hr/ui';
import { LandingHeader } from './components/landing/LandingHeader';
import { HeroCardAnimation } from './components/landing/HeroCardAnimation';
import { ProductPreviewTabs } from './components/landing/ProductPreviewTabs';
import { LandingFaqAccordion } from './components/landing/LandingFaqAccordion';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-teal-100 selection:text-teal-900 overflow-x-clip">
      {/* 1. Header Navigation */}
      <LandingHeader />

      <main id="main-content" className="flex-1">
        {/* 2. Dark Editorial Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#134E4A] via-[#0F766E] to-[#134E4A] text-white py-16 sm:py-24 lg:py-28">
          {/* Subtle Glow & Wave Divider */}
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#14B8A6]/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Headline & Local-First CTAs */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-800/80 px-3.5 py-1 text-xs font-semibold text-teal-200 border border-teal-600/80 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-[#14B8A6] animate-pulse" />
                  <span>Local-First • On-Premises Card Engine</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Create accurate employee ID cards in minutes—
                  <span className="text-[#14B8A6] block mt-1">on your own computer.</span>
                </h1>

                <p className="text-base sm:text-lg text-teal-100/90 max-w-2xl leading-relaxed">
                  A dedicated, privacy-focused employee registry and high-precision ID card issuance
                  system. Capture portraits over your factory Wi-Fi, preview bilingual English-front
                  and Bangla-back cards, and produce 100% vector PDF masters locally.
                </p>

                {/* Hero Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/login">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-[#14B8A6] hover:bg-teal-300 text-[#134E4A] font-bold shadow-lg border-none"
                    >
                      <span>Sign In to Local Workspace</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>

                  <Link href="/cards/calibration">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-teal-400/60 text-white hover:bg-teal-800/60"
                    >
                      <Sliders className="w-4 h-4 mr-2 text-teal-300" />
                      <span>Printer Calibration</span>
                    </Button>
                  </Link>
                </div>

                {/* Three Core Guarantees */}
                <div className="pt-6 border-t border-teal-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-teal-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
                    <span>100% Offline Capable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
                    <span>Exact 60 × 90 mm Master</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
                    <span>Zero Cloud Dependencies</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real Animated 60x90mm Card Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <HeroCardAnimation />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Three-Step Workflow Strip */}
        <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="primary" size="sm" className="mb-3">
                Issuance Workflow
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                A disciplined three-step pipeline for busy HR teams
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Eliminate manual spreadsheets and uncalibrated print runs with an organized,
                traceable workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#134E4A] flex items-center justify-center font-extrabold text-base mb-6 border border-teal-200">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#0F766E] transition-colors">
                    Add or Select Worker
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Enter worker records with full Unicode support for native Bangla names,
                    organizational units, and masked government identity documents.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-[#0F766E]">
                  <Users className="w-4 h-4" />
                  <span>Structured & Deduplicated</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#134E4A] flex items-center justify-center font-extrabold text-base mb-6 border border-teal-200">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#0F766E] transition-colors">
                    Capture Photo & Preview
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Snap portraits instantly using webcams or stream directly from a factory
                    smartphone via zero-PII QR code. Live dual-sided preflight diagnostics run in
                    real time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-[#0F766E]">
                  <Camera className="w-4 h-4" />
                  <span>Real-Time SSE Sync</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#134E4A] flex items-center justify-center font-extrabold text-base mb-6 border border-teal-200">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#0F766E] transition-colors">
                    Print & Record Issue
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Render exact 60 × 90 mm vector PDFs at 100% physical scale. Physical operator
                    confirmation records defect items and tracks immutable credential history.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-[#0F766E]">
                  <Printer className="w-4 h-4" />
                  <span>Immutable Issue Lineage</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Product Preview Section */}
        <section id="preview" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="primary" size="sm" className="mb-3">
                Product Interface
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Honest, responsive tools built for operational speed
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Explore the actual interface components used by HR managers and print operators.
              </p>
            </div>

            <ProductPreviewTabs />
          </div>
        </section>

        {/* 5. Verified Feature Bento Grid */}
        <section id="features" className="py-20 bg-slate-50 border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="primary" size="sm" className="mb-3">
                Core Capabilities
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Verified features engineered for high-volume ID production
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Every feature is verified in code and tested for on-premises operational
                reliability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  In-Browser Camera & QR Handoff
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Capture portraits directly via webcam or scan a QR code to hand off capture to a
                  mobile phone over local Wi-Fi with automated EXIF stripping and 300 DPI scaling.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Bilingual Typography Engine</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  English front and native Bengali back with self-hosted Noto fonts, complex
                  conjunct shaping, defensive line-clamping, and missing script fallback warnings.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Exact 60 × 90 mm Geometry</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vector PDF print master generated at 100% scale (170.08 × 255.12 pt) with
                  high-resolution PNG generation at 150, 300, and 600 DPI (709 × 1063 px).
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Persistent Batch Print Queue</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Create multi-card batch print jobs, monitor rendering progress, report defect
                  cards, and atomically activate approved badges through physical operator QA
                  sign-off.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Government ID Privacy & Masking
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Government IDs (Smart NID, Passport) are AES-256 encrypted, masked by default, and
                  excluded from print runs and QR codes without explicit administrative policy.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0F766E] border border-teal-200/60 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Local Encrypted Backups & RBAC
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Self-verifying AES-256-GCM encrypted `.hrbackup` bundles, strict default-deny
                  authorization on all API routes, and offline CLI disaster recovery.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Print Accuracy & Calibration Section */}
        <section id="accuracy" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <Badge variant="primary" size="sm">
                  Physical Print Engineering
                </Badge>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  Precision alignment engineered for physical PVC and flatbed printers
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Card printing requires exact dimensional fidelity. The system bypasses arbitrary
                  browser print dialog scaling with deterministic PDF MediaBoxes, duplex long-edge
                  imposition, and built-in caliper verification.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        100% Actual Scale Invariant
                      </span>
                      <span className="text-xs text-slate-500">
                        Explicit operator instructions prevent accidental &ldquo;Fit to page&rdquo;
                        shrinkage that distorts physical card dimensions.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        Duplex Long-Edge Mirroring
                      </span>
                      <span className="text-xs text-slate-500">
                        Back-side column reversal guarantees exact front-to-back card alignment
                        without drift on multi-card sheet imposition.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        50.00 mm Ruler Calibration Sheet
                      </span>
                      <span className="text-xs text-slate-500">
                        Printable calibration test pages allow caliper measurements and offset
                        adjustments before executing bulk print batches.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/cards/calibration">
                    <Button
                      variant="outline"
                      size="md"
                      className="border-teal-300 text-[#0F766E] hover:bg-teal-50 font-bold"
                    >
                      <Sliders className="w-4 h-4 mr-2" />
                      <span>Open Printer Calibration Studio</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Calibration Graphic Callout */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm text-center space-y-4 max-w-sm w-full">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-[#134E4A] flex items-center justify-center mx-auto">
                    <Sliders className="w-8 h-8 text-[#0F766E]" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Calibration Spec</h4>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left font-mono text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <span className="font-bold">60.00 mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <span className="font-bold">90.00 mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>300 DPI Pixel Size:</span>
                      <span className="font-bold">709 × 1063 px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tolerance:</span>
                      <span className="font-bold text-emerald-700">± 0.50 mm</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Derived deterministically from physical millimetres.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Privacy & Local Ownership Section */}
        <section id="security" className="py-20 bg-slate-50 border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="primary" size="sm" className="mb-3">
                Data Ownership & Topology
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Transparent local deployment with zero third-party leakage
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Your employee database and photographs never leave your physical facility.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Single-PC Workstation */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 rounded-2xl text-[#0F766E] border border-teal-200/60">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Single-PC Workstation</h3>
                      <span className="text-xs font-mono text-slate-500">Loopback 127.0.0.1</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Operates in complete physical isolation on a single desktop or laptop computer.
                    Ideal for standalone HR desks and air-gapped printing rooms.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Zero network interface exposure beyond localhost</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Direct USB webcam and card printer support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Encrypted `.hrbackup` export to local external storage</span>
                    </li>
                  </ul>
                </div>
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full justify-center text-xs font-bold">
                    Launch Workstation Mode
                  </Button>
                </Link>
              </div>

              {/* Private Factory LAN */}
              <div className="bg-white p-8 rounded-3xl border-2 border-[#134E4A]/30 shadow-md space-y-6 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-100 text-[#134E4A] rounded-2xl border border-teal-200">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Private Factory LAN</h3>
                      <span className="text-xs font-mono text-slate-500">
                        Internal Wi-Fi / Local Subnet
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Allows multiple authorized operators to register workers across desktop PCs
                    while mobile phones capture portraits over internal factory Wi-Fi.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Secure LAN TLS via internal Caddy Certificate Authority</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Real-time smartphone photo capture via short-lived QR tokens</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                      <span>Strict role-based access control and tenant isolation</span>
                    </li>
                  </ul>
                </div>
                <Link href="/login" className="w-full">
                  <Button
                    variant="primary"
                    className="w-full justify-center bg-[#134E4A] text-white text-xs font-bold"
                  >
                    Launch Factory LAN Mode
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Compact FAQ Section */}
        <section id="faq" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="primary" size="sm" className="mb-3">
                Questions & Answers
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Clear, transparent answers about local operation, security, and card production.
              </p>
            </div>

            <LandingFaqAccordion />
          </div>
        </section>

        {/* 9. Final Call to Action */}
        <section className="py-16 sm:py-24 bg-gradient-to-r from-[#134E4A] via-[#0F766E] to-[#134E4A] text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Ready to produce accurate employee ID cards on your local system?
            </h2>
            <p className="text-teal-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Access your local installation to manage workers, capture portraits, and print
              exact-scale physical ID cards.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-[#14B8A6] text-[#134E4A] hover:bg-teal-300 font-bold shadow-lg border-none"
                >
                  <span>Sign In to Local Workspace</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/cards/calibration">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-teal-400 text-white hover:bg-teal-800/60"
                >
                  <Sliders className="w-4 h-4 mr-2" />
                  <span>Printer Calibration</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#134E4A] text-white">
                  <ShieldCheck className="h-5 w-5 text-[#14B8A6]" />
                </div>
                <span className="font-bold text-slate-900">HR ID Platform</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Local-first employee registry and high-precision bilingual card issuance system.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>v0.1.0-mvp</span>
                <span>•</span>
                <span className="text-[#0F766E]">On-Premises</span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Product
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#how-it-works" className="hover:text-[#0F766E]">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#preview" className="hover:text-[#0F766E]">
                    Product Preview
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-[#0F766E]">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#accuracy" className="hover:text-[#0F766E]">
                    Print Accuracy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Security & Specs
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#security" className="hover:text-[#0F766E]">
                    Default-Deny Model
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-[#0F766E]">
                    Argon2id Hashing
                  </a>
                </li>
                <li>
                  <a href="#accuracy" className="hover:text-[#0F766E]">
                    60 × 90 mm Geometry
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Access
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/login" className="hover:text-[#0F766E]">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/cards/calibration" className="hover:text-[#0F766E]">
                    Printer Calibration
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 HR Employee ID Platform. All rights reserved.</p>
            <p className="text-slate-400">
              No external telemetry • Self-hosted Noto fonts • Private PostgreSQL Storage
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
