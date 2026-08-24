'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Server,
  Cloud,
  CheckCircle2,
  Lock,
  Printer,
  Camera,
  Users,
  Building2,
  FileCheck,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  Key,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Badge,
  CardPreviewChrome,
  Dialog,
  Accordion,
  Tabs,
  TableShell,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  FormGroup,
} from '@hr/ui';
import { FICTIONAL_WORKERS } from '@hr/fixtures';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('registry');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    organization: '',
    deploymentType: 'on-prem',
    workerCount: '50-250',
  });

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
  };

  const resetRequestModal = () => {
    setIsRequestModalOpen(false);
    setTimeout(() => {
      setRequestSubmitted(false);
      setRequestForm({
        name: '',
        email: '',
        organization: '',
        deploymentType: 'on-prem',
        workerCount: '50-250',
      });
    }, 200);
  };

  const faqItems = [
    {
      id: 'offline',
      question: 'Can the system run 100% offline without an internet connection?',
      answer:
        'Yes. In On-Premises mode, the platform operates entirely within your local network (LAN) or on a single PC. All assets, fonts (Noto Sans & Noto Sans Bengali), database queries, and rendering engines are self-hosted with zero external CDN, telemetry, or cloud calls.',
    },
    {
      id: 'hardware',
      question: 'What printer hardware and physical dimensions are supported?',
      answer:
        'The primary standard is the 60 mm × 90 mm vertical format (English front, Bangla back), generated as exact-scale 300/600 DPI vector PDFs. Standard ISO/IEC 7810 ID-1 (CR80) formats are also built in. You can print directly to dedicated PVC card printers or export multi-card A4/Letter sheets for flatbed printing.',
    },
    {
      id: 'phone-camera',
      question: 'How does mobile phone photo capture work on local servers?',
      answer:
        'When adding a worker, the desktop screen displays a short-lived QR code. An operator scans the QR code with their mobile phone on the company LAN (via secure local HTTPS), captures the photo, and uploads it directly to the local server. The desktop UI updates instantly via Server-Sent Events (SSE).',
    },
    {
      id: 'security',
      question: 'Where is employee personal data and sensitive government ID stored?',
      answer:
        'All data resides in your dedicated PostgreSQL database and local private file volume. Government documents (e.g. NID) are strictly optional, masked by default in all tables, and never printed on standard ID cards or encoded into QR codes without explicit administrative policy.',
    },
    {
      id: 'backups',
      question: 'How are encrypted backups and data exports managed?',
      answer:
        'Administrators can create encrypted ZIP backups containing the database state, normalized photos, and template manifests at any time. Data exports produce portable UTF-8 CSV files alongside organized photo directories with formula-injection sanitization.',
    },
    {
      id: 'signup-policy',
      question: 'Why is there no public self-signup button?',
      answer:
        'To prevent unauthorized access and protect enterprise tenant isolation, all accounts are provisioned deliberately: on-premises systems use a protected loopback-only administrator bootstrap, while hosted SaaS tenants are provisioned by verified platform operators.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-20">
          {/* Logo & Product Title */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#134E4A] text-white shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#14B8A6]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900">
                HR ID Platform
              </span>
              <span className="text-[10px] font-medium tracking-wider text-[#0F766E] uppercase">
                Local-First & SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600"
          >
            <a href="#product" className="hover:text-[#0F766E] transition-colors">
              Product
            </a>
            <a href="#workflow" className="hover:text-[#0F766E] transition-colors">
              How It Works
            </a>
            <a href="#deployment" className="hover:text-[#0F766E] transition-colors">
              Local Installation
            </a>
            <a href="#security" className="hover:text-[#0F766E] transition-colors">
              Security
            </a>
            <a href="#templates" className="hover:text-[#0F766E] transition-colors">
              Templates
            </a>
            <a href="#faq" className="hover:text-[#0F766E] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs (Sign In & Request Access) */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRequestModalOpen(true)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Request Access
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-6 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-700">
              <a
                href="#product"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                Product
              </a>
              <a
                href="#workflow"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                How It Works
              </a>
              <a
                href="#deployment"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                Local Installation
              </a>
              <a
                href="#security"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                Security & Privacy
              </a>
              <a
                href="#templates"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                Templates
              </a>
              <a
                href="#faq"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F766E]"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <Link href="/login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsRequestModalOpen(true);
                }}
              >
                Request Access
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1">
        {/* 2. Hero Section */}
        <section
          id="product"
          className="relative overflow-hidden bg-gradient-to-b from-[#F0FDFA] via-white to-white py-16 sm:py-24 lg:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-100/80 px-3.5 py-1 text-xs font-semibold text-[#134E4A] border border-teal-200">
                  <span className="h-2 w-2 rounded-full bg-[#14B8A6] animate-pulse" />
                  Enterprise Grade • 60 × 90 mm Bilingual Standard
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
                  Professional employee ID cards—
                  <span className="text-[#0F766E] block mt-1">from your server or ours.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                  An international, local-first employee registry and high-precision ID card
                  issuance system. Capture webcam or mobile photos over your LAN, preview bilingual
                  English-front/Bangla-back cards, and produce print-ready vector PDFs with an
                  immutable audit trail.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setIsRequestModalOpen(true)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Request Access
                  </Button>
                  <Link href="/login">
                    <Button variant="outline" size="lg">
                      Sign In to System
                    </Button>
                  </Link>
                </div>

                {/* Key Assurance Highlights */}
                <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <span>100% Offline Capable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <span>Exact-Scale Vector PDF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <span>Zero Vendor Backdoors</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic 60x90mm Card Visuals & Shell */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900/5 border border-slate-200/90 shadow-xl backdrop-blur-sm">
                  <div className="absolute top-3 left-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-mono text-slate-400 ml-2">
                      Card Engine v1
                    </span>
                  </div>
                  <div className="mt-4">
                    <CardPreviewChrome side="both" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Three-Step Workflow Section */}
        <section id="workflow" className="py-20 bg-slate-50 border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-3">
                Issuance Lifecycle
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                A disciplined three-step pipeline for busy HR teams
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Eliminate scattered spreadsheets and uncalibrated print runs with an organized,
                traceable workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100/70 text-[#134E4A] flex items-center justify-center font-bold text-lg mb-6 border border-teal-200">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Register People</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Enter worker employment records with full Unicode support for native Bangla
                    names, organizational units, and optional masked government documents. Import
                    hundreds via dry-run validated CSV.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                  <Users className="w-4 h-4" />
                  <span>Structured & Deduplicated</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100/70 text-[#134E4A] flex items-center justify-center font-bold text-lg mb-6 border border-teal-200">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Capture & Crop Photos</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Snap photos instantly using attached webcams, securely stream from an operator's
                    mobile phone across the local network via QR token, or upload files with
                    automated EXIF removal.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                  <Camera className="w-4 h-4" />
                  <span>Real-Time SSE Sync</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100/70 text-[#134E4A] flex items-center justify-center font-bold text-lg mb-6 border border-teal-200">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Print & Track Cards</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Render pixel-accurate 60×90 mm vector PDFs at 100% physical scale. Maintain
                    immutable historical snapshots of every printed credential with reason-audited
                    reprints.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                  <Printer className="w-4 h-4" />
                  <span>Immutable Issue Log</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive Product Preview */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <Badge variant="primary" className="mb-3">
                Product Experience
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Honest, responsive tools designed for operational speed
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Explore the actual interface components used by HR managers and print operators.
              </p>
            </div>

            {/* Tab Controls */}
            <div className="flex justify-center mb-8">
              <Tabs
                activeTab={activePreviewTab}
                onChange={setActivePreviewTab}
                tabs={[
                  { id: 'registry', label: 'Worker Registry', icon: <Users className="w-4 h-4" /> },
                  {
                    id: 'org',
                    label: 'Organization Tree',
                    icon: <Building2 className="w-4 h-4" />,
                  },
                  {
                    id: 'cardlab',
                    label: 'Bilingual Card Lab',
                    icon: <Printer className="w-4 h-4" />,
                  },
                ]}
              />
            </div>

            {/* Interactive Tab Panels */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-8 shadow-inner">
              {activePreviewTab === 'registry' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        Apex Industrial Group — Worker Registry
                      </h4>
                      <p className="text-xs text-slate-500">
                        Showing 4 fictional employee records ready for card production
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">All Records Validated</Badge>
                    </div>
                  </div>

                  <TableShell>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Display Name (Latin / Native)</TableHead>
                        <TableHead>Title & Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FICTIONAL_WORKERS.map((worker) => (
                        <TableRow key={worker.employeeNumber}>
                          <TableCell className="font-mono font-medium text-slate-900">
                            {worker.employeeNumber}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-900">
                              {worker.displayNameLatin}
                            </div>
                            <div className="text-xs text-[#0F766E]">{worker.displayNameNative}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-medium text-slate-800">{worker.title}</div>
                            <div className="text-[11px] text-slate-500">{worker.department}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" size="sm">
                              {worker.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{worker.joinedDate}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer">
                              Queue Card
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableShell>
                </div>
              )}

              {activePreviewTab === 'org' && (
                <div className="space-y-4">
                  <h4 className="text-base font-bold text-slate-900">
                    Organization Hierarchy & Card Template Inheritance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider mb-1">
                        Site 01
                      </div>
                      <h5 className="font-bold text-slate-900">Dhaka Headquarters</h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Template: Corporate Classic Vertical (60×90mm)
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Active Workers</span>
                        <span className="font-bold text-slate-800">142</span>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider mb-1">
                        Site 02
                      </div>
                      <h5 className="font-bold text-slate-900">Gazipur Manufacturing Plant</h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Template: Industrial High-Visibility Vertical
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Active Workers</span>
                        <span className="font-bold text-slate-800">580</span>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider mb-1">
                        Site 03
                      </div>
                      <h5 className="font-bold text-slate-900">Chittagong Logistics Hub</h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Template: Contractor / Logistics Preset
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Active Workers</span>
                        <span className="font-bold text-slate-800">89</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'cardlab' && (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="mb-4 text-center">
                    <span className="text-xs font-semibold text-slate-500">
                      Live Physical Layout Engine (Calculated in Millimetres)
                    </span>
                  </div>
                  <CardPreviewChrome side="both" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. Deployment Comparison: Local On-Prem vs Hosted SaaS */}
        <section id="deployment" className="py-20 bg-slate-50 border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-3">
                Deployment Flexibility
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Choose the right operational model for your infrastructure
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Same core application, same database schema, and identical print engine.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Local On-Premises Card */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-teal-50 rounded-xl text-[#0F766E]">
                        <Server className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Local On-Premises</h3>
                        <span className="text-xs text-slate-500 font-medium">
                          Self-Hosted on Company Server or PC
                        </span>
                      </div>
                    </div>
                    <Badge variant="primary">Air-Gapped Ready</Badge>
                  </div>

                  <p className="text-sm text-slate-600 mb-6">
                    Designed for factories, government contractors, and security-first enterprises
                    requiring full data sovereignty and offline continuity.
                  </p>

                  <ul className="space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Data resides on your own PostgreSQL & local disk</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Protected loopback bootstrap (no vendor backdoors)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Zero outbound CDN, analytics, or licensing calls</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>One-click encrypted ZIP backups with manifest check</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => setIsRequestModalOpen(true)}
                  >
                    Request On-Prem Installer
                  </Button>
                </div>
              </div>

              {/* Managed Hosted SaaS Card */}
              <div className="bg-white rounded-2xl border-2 border-[#134E4A]/30 p-8 shadow-md flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#134E4A] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  Enterprise Cloud
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-teal-100/60 rounded-xl text-[#134E4A]">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Managed Hosted SaaS</h3>
                        <span className="text-xs text-slate-500 font-medium">
                          Dedicated Multi-Tenant Cloud
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-6">
                    Ideal for multi-site organizations desiring managed infrastructure, automated
                    backups, and remote employee onboarding.
                  </p>

                  <ul className="space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Tenant isolation from day one via scoped keys</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Platform-operator provisioning (no public self-signup)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Automated point-in-time database backups</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                      <span>Multi-region S3-compatible asset storage</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Button
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() => setIsRequestModalOpen(true)}
                  >
                    Request Hosted Access
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Security & Privacy Section */}
        <section id="security" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="primary" className="mb-3">
                Security & Privacy Baseline
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Rigorous data protection with accurate, honest claims
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                We make only verifiable architectural security guarantees—no marketing buzzwords.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#134E4A] flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">Default-Deny Access</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every API mutation and query enforces strict server-side permissions. UI control
                  hiding is never treated as authorization.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#134E4A] flex items-center justify-center mb-4">
                  <Key className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">Argon2id Passwords</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Password hashing using memory-hard Argon2id with unique salts. HTTP-only secure
                  cookies prevent token exfiltration.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#134E4A] flex items-center justify-center mb-4">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">NID / Gov ID Masking</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Government IDs are optional, masked by default, and excluded from print runs and
                  exports unless explicitly requested.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#134E4A] flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">Immutable Audit Log</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every worker reveal, card issue, reprint, revocation, and export is recorded in an
                  immutable audit event stream.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Template Gallery Preview */}
        <section id="templates" className="py-20 bg-slate-50 border-y border-slate-200/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-3">
                Card Layout Presets
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Standardized presets for every workforce tier
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Pre-configured for 60 mm × 90 mm vertical and ISO ID-1 physical geometry.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Classic Vertical (Default)',
                  desc: 'Standard 60×90mm bilingual front/back with clean organizational branding.',
                  badge: 'Bilingual Default',
                },
                {
                  title: 'Modern Stripe',
                  desc: 'High-contrast header accent band optimized for executive & office staff.',
                  badge: 'Corporate',
                },
                {
                  title: 'Photo Focus',
                  desc: 'Prominent portrait framing for field inspection and high-security checkpoints.',
                  badge: 'High Security',
                },
                {
                  title: 'Industrial / Factory',
                  desc: 'Color-coded shift and department blocks with oversized employee numbers.',
                  badge: 'Manufacturing',
                },
                {
                  title: 'Contractor & Vendor',
                  desc: 'Distinctive bordered badge with prominent expiry and sponsoring manager.',
                  badge: 'Contractor',
                },
                {
                  title: 'Visitor Pass',
                  desc: 'Single-day issuance format with serialized QR token verification.',
                  badge: 'Visitor',
                },
              ].map((template) => (
                <div
                  key={template.title}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#0F766E]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="primary" size="sm">
                      {template.badge}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-400">60 × 90 mm</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-1.5">{template.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{template.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FAQ Section */}
        <section id="faq" className="py-20 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="primary" className="mb-3">
                Questions & Answers
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Everything you need to know about offline operation, security, and card production.
              </p>
            </div>

            <Accordion items={faqItems} />
          </div>
        </section>

        {/* 9. Final Call to Action */}
        <section className="py-16 sm:py-24 bg-[#134E4A] text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Ready to modernize your employee ID card workflow?
            </h2>
            <p className="text-teal-100 text-base sm:text-lg max-w-2xl mx-auto">
              Get in touch with our team to request an on-premises pilot installer or provision a
              dedicated enterprise cloud workspace.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsRequestModalOpen(true)}
                className="bg-[#14B8A6] text-[#134E4A] hover:bg-teal-300 font-bold"
              >
                Request Access
              </Button>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-teal-700 bg-teal-900/50 text-white hover:bg-teal-800"
                >
                  Sign In to Platform
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Complete Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-sm text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#134E4A] text-white">
                  <ShieldCheck className="h-4 w-4 text-[#14B8A6]" />
                </div>
                <span className="font-bold text-slate-900">HR ID Platform</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Local-first employee registry and high-precision bilingual card issuance system.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>v0.1.0-mvp</span>
                <span>•</span>
                <span className="text-[#0F766E]">Air-Gapped Ready</span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                Product
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#product" className="hover:text-[#0F766E]">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-[#0F766E]">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-[#0F766E]">
                    Template Presets
                  </a>
                </li>
                <li>
                  <a href="#deployment" className="hover:text-[#0F766E]">
                    On-Prem vs SaaS
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
                  <a href="#faq" className="hover:text-[#0F766E]">
                    60×90mm Geometry
                  </a>
                </li>
                <li>
                  <Link href="/api/health" className="hover:text-[#0F766E]">
                    System Health Check
                  </Link>
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
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className="hover:text-[#0F766E] text-left"
                  >
                    Request Access
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 HR Employee ID Platform. All rights reserved.</p>
            <p className="text-slate-400">
              No third-party analytics • Self-hosted Noto Sans Bengali • Private Storage
            </p>
          </div>
        </div>
      </footer>

      {/* 11. Request Access Dialog Modal */}
      <Dialog
        isOpen={isRequestModalOpen}
        onClose={resetRequestModal}
        title="Request Access to Platform"
        description="Enter your organization details to request an on-premises deployment package or hosted workspace."
      >
        {requestSubmitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Request Received</h4>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Thank you, <span className="font-semibold">{requestForm.name}</span>. An enterprise
              administrator will review your request for{' '}
              <span className="font-semibold">{requestForm.organization}</span> and issue an
              activation package.
            </p>
            <Button variant="primary" className="mt-4" onClick={resetRequestModal}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4 mt-2">
            <FormGroup label="Full Name" htmlFor="req-name" isRequired>
              <Input
                id="req-name"
                required
                placeholder="e.g. Tanvir Ahmed"
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Work Email" htmlFor="req-email" isRequired>
              <Input
                id="req-email"
                type="email"
                required
                placeholder="you@company.com"
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
              />
            </FormGroup>

            <FormGroup label="Organization / Company Name" htmlFor="req-org" isRequired>
              <Input
                id="req-org"
                required
                placeholder="e.g. Apex Industrial Group"
                value={requestForm.organization}
                onChange={(e) => setRequestForm({ ...requestForm, organization: e.target.value })}
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Deployment Mode" htmlFor="req-deploy">
                <select
                  id="req-deploy"
                  value={requestForm.deploymentType}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, deploymentType: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  <option value="on-prem">Local On-Premises</option>
                  <option value="hosted">Managed Cloud SaaS</option>
                </select>
              </FormGroup>

              <FormGroup label="Worker Count" htmlFor="req-count">
                <select
                  id="req-count"
                  value={requestForm.workerCount}
                  onChange={(e) => setRequestForm({ ...requestForm, workerCount: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  <option value="1-50">1 - 50</option>
                  <option value="50-250">50 - 250</option>
                  <option value="250-1000">250 - 1,000</option>
                  <option value="1000+">1,000+</option>
                </select>
              </FormGroup>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" type="button" onClick={resetRequestModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
