'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@hr/ui';

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-900/40 bg-[#134E4A]/95 backdrop-blur-md text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-20">
        {/* Logo & Product Title */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-sm border border-teal-700/80">
            <ShieldCheck className="h-6 w-6 text-[#14B8A6]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white leading-tight">
              HR ID Platform
            </span>
            <span className="text-[10px] font-medium tracking-wider text-teal-200 uppercase leading-tight">
              Local-First On-Premises
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-8 text-xs font-semibold text-teal-100/90"
        >
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#preview" className="hover:text-white transition-colors">
            Product Preview
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#accuracy" className="hover:text-white transition-colors">
            Print Accuracy
          </a>
          <a href="#security" className="hover:text-white transition-colors">
            Security & Privacy
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Action CTA (Sign In) */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="secondary"
              size="sm"
              className="bg-[#14B8A6] hover:bg-teal-300 text-[#134E4A] font-bold text-xs shadow-sm border-none"
            >
              <span>Sign In to Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex md:hidden p-2 rounded-xl text-teal-100 hover:bg-teal-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-teal-800/80 bg-[#134E4A] px-4 py-6 space-y-4 animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          <nav className="flex flex-col space-y-3 text-sm font-semibold text-teal-100">
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              How It Works
            </a>
            <a
              href="#preview"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Product Preview
            </a>
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Features
            </a>
            <a
              href="#accuracy"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Print Accuracy
            </a>
            <a
              href="#security"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Security & Privacy
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-4 border-t border-teal-800 flex flex-col gap-2.5">
            <Link href="/login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="secondary"
                className="w-full justify-center bg-[#14B8A6] text-[#134E4A] font-bold"
              >
                Sign In to Workspace
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
