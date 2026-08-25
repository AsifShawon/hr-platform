'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Server,
  ArrowLeft,
  Lock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input, ShowHidePasswordInput, FormGroup, Badge, CardPreviewChrome } from '@hr/ui';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'The username or password entered is incorrect.');
        return;
      }

      // Success: check if activation is required
      if (data.system?.requiresActivation) {
        setInfoMessage(
          'Temporary bootstrap verified. Redirecting to mandatory system activation...',
        );
        setTimeout(() => {
          router.push('/activate');
        }, 600);
      } else {
        setInfoMessage('Authentication successful. Redirecting to workspace...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 400);
      }
    } catch (err) {
      setErrorMessage(
        'Unable to connect to authentication service. Please ensure the server is running.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-white text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Left Column (Desktop 5-col / Mobile top banner) */}
      <div className="lg:col-span-5 bg-[#134E4A] text-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-[#0F766E]/30 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-teal-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Public Homepage</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm border border-teal-700">
              <ShieldCheck className="h-6 w-6 text-[#14B8A6]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">HR ID Platform</h1>
              <p className="text-xs text-teal-200">Local-First Employee Registry</p>
            </div>
          </div>
        </div>

        {/* Middle Card Visual Showcase (Desktop) */}
        <div className="hidden lg:flex flex-col items-center my-8">
          <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-800/60 shadow-2xl backdrop-blur-sm">
            <div className="mb-2 text-center">
              <span className="text-[11px] font-mono text-teal-200/80">
                Official Credential Standard (60×90mm)
              </span>
            </div>
            <CardPreviewChrome side="front" allowFlip={false} />
          </div>
        </div>

        {/* Bottom Privacy Statement */}
        <div className="pt-6 border-t border-teal-800/80 text-xs text-teal-200/90 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 text-teal-100 font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Strict Privacy & Tenant Isolation</span>
          </div>
          <p>
            Employee records, photos, and identity documents are managed under default-deny
            authorization. All sign-in attempts and credential reveals are recorded in immutable
            audit logs.
          </p>
        </div>
      </div>

      {/* Right Column: Sign-In Presentation Form */}
      <div className="lg:col-span-7 flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12 max-w-xl mx-auto w-full">
        {/* System Mode Indicator */}
        <div className="mb-8 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#0F766E]" />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Local On-Premises System
              </span>
              <span className="text-[11px] text-slate-500">
                Air-Gapped LAN Node: 127.0.0.1 / Private Network
              </span>
            </div>
          </div>
          <Badge variant="primary" size="sm">
            Local Node
          </Badge>
        </div>

        {/* Main Sign-In Card */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Sign in to your organization
              </h2>
              <Badge variant="primary" size="sm">
                Local System
              </Badge>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Enter your local operator credentials to access the on-premises employee registry and
              ID card system.
            </p>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Authentication Failed</span>
                <span className="text-xs text-rose-700">{errorMessage}</span>
              </div>
            </div>
          )}

          {infoMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">System Notification</span>
                <span className="text-xs text-teal-800">{infoMessage}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormGroup label="Username or Work Email" htmlFor="auth-username" isRequired>
              <Input
                id="auth-username"
                type="text"
                autoComplete="username"
                required
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Password" htmlFor="auth-password" isRequired>
              <ShowHidePasswordInput
                id="auth-password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormGroup>

            {/* Local Recovery Helper Link */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="w-full flex items-center justify-between text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  On-Premises recovery:
                </span>
                <span className="font-semibold text-slate-700">Contact your System Owner</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center mt-2 shadow-md"
              isLoading={isLoading}
            >
              Sign In to Platform
            </Button>
          </form>

          {/* Strict Security Invariant Notice */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            <span>Protected by Argon2id & default-deny authorization.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
