'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Check,
  HardDrive,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Button, Input, ShowHidePasswordInput, FormGroup, Badge } from '@hr/ui';

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hostedToken = searchParams.get('token');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isHosted, setIsHosted] = useState<boolean>(Boolean(hostedToken));

  // Form states
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [hasCopiedCodes, setHasCopiedCodes] = useState(false);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check system status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          if (data.isActivated && !hostedToken) {
            router.push('/login');
          }
          if (data.deploymentMode === 'hosted' || hostedToken) {
            setIsHosted(true);
          }
        }
      } catch {
        // Fallback silently if disconnected
      }
    }
    checkStatus();
  }, [hostedToken, router]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Advance to Step 2: Recovery Codes
    setStep(2);
  };

  const handleCopyCodes = () => {
    if (recoveryCodes.length > 0) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setHasCopiedCodes(true);
      setTimeout(() => setHasCopiedCodes(false), 3000);
    }
  };

  const handleDownloadCodes = () => {
    if (recoveryCodes.length > 0) {
      const text = `HR ID PLATFORM - EMERGENCY RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once.\n\n${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hr-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const endpoint = isHosted ? '/api/auth/hosted/activate' : '/api/system/activate';
      const payload = isHosted
        ? {
            token: hostedToken,
            newPassword,
            confirmPassword,
            acknowledgedRecoveryCodes: acknowledgedCodes,
          }
        : {
            newUsername: username.trim() || undefined,
            newPassword,
            confirmPassword,
            acknowledgedRecoveryCodes: acknowledgedCodes,
            confirmedBackupResponsibility: confirmedBackup,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Activation failed.');
        setIsLoading(false);
        return;
      }

      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
      }

      setStep(4);
    } catch (err) {
      setErrorMessage('Failed to connect to activation server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-teal-100 selection:text-teal-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#134E4A] text-white shadow-md">
            <ShieldCheck className="h-7 w-7 text-[#14B8A6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">HR ID Platform</h1>
            <p className="text-xs text-slate-500 font-medium">
              Initial System Activation & Key Ceremony
            </p>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 1 ? 'bg-[#134E4A] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span className="text-xs font-semibold text-slate-700">Set Password</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 2 ? 'bg-[#134E4A] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className="text-xs font-semibold text-slate-700">Recovery & Backup</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 4 ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span className="text-xs font-semibold text-slate-700">Ready</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200/80">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Activation Error</span>
                <span className="text-xs text-rose-700">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* STEP 1: Replace Password */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Replace Initial Admin Password
                  </h2>
                  <Badge variant="primary" size="sm">
                    Mandatory
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The temporary credentials will be permanently destroyed. Choose a strong master
                  password to secure the platform.
                </p>
              </div>

              {!isHosted && (
                <FormGroup label="System Owner Username (Optional Rename)" htmlFor="act-username">
                  <Input
                    id="act-username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </FormGroup>
              )}

              <FormGroup label="New Master Password" htmlFor="act-password" isRequired>
                <ShowHidePasswordInput
                  id="act-password"
                  required
                  placeholder="Min 10 characters with letters & numbers"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormGroup>

              <FormGroup label="Confirm Master Password" htmlFor="act-confirm-password" isRequired>
                <ShowHidePasswordInput
                  id="act-confirm-password"
                  required
                  placeholder="Re-enter master password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormGroup>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Security Requirements:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1 text-[11px]">
                  <li>Minimum 10 characters</li>
                  <li>Must contain both letters and numbers</li>
                  <li>Cannot be a common guessable dictionary word</li>
                  <li>Hashed using memory-hard Argon2id (64 MiB, 3 passes)</li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md"
              >
                Continue to Recovery & Responsibilities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* STEP 2: Emergency Recovery Codes & Backup Confirmation */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Emergency Recovery & Responsibilities
                  </h2>
                  <Badge variant="secondary" size="sm">
                    Step 2 of 2
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Review your local operational responsibilities and acknowledge key safeguards
                  before committing activation.
                </p>
              </div>

              {/* Local Backup Responsibility Warning */}
              {!isHosted && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <HardDrive className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Local Air-Gapped Data Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    This system operates entirely on-premises with no cloud telemetry or automated
                    external backups. You are solely responsible for maintaining PostgreSQL database
                    backups and storage snapshots.
                  </p>
                  <label className="flex items-start gap-2.5 pt-2 text-amber-950 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmedBackup}
                      onChange={(e) => setConfirmedBackup(e.target.checked)}
                      className="mt-0.5 rounded border-amber-300 text-[#0F766E] focus:ring-teal-500"
                    />
                    <span>
                      I understand and accept responsibility for local backups and data retention.
                    </span>
                  </label>
                </div>
              )}

              {/* Recovery Code Acknowledgement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <KeyRound className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span>One-Time Emergency Recovery Codes</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Upon completion, 8 emergency recovery codes will be generated and displayed once.
                  These codes allow account recovery if you lose access to your credentials.
                </p>
                <label className="flex items-start gap-2.5 pt-2 text-slate-900 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acknowledgedCodes}
                    onChange={(e) => setAcknowledgedCodes(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#0F766E] focus:ring-teal-500"
                  />
                  <span>I agree to save and store the emergency recovery codes securely.</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex-1 justify-center shadow-md"
                  disabled={!acknowledgedCodes || (!isHosted && !confirmedBackup) || isLoading}
                  isLoading={isLoading}
                  onClick={handleFinalSubmit}
                >
                  Commit System Activation
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Recovery Codes Reveal */}
          {step === 4 && (
            <div className="space-y-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-[#0F766E] mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  System Successfully Activated!
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  The temporary bootstrap hash has been destroyed. Save your 8 recovery codes now.
                </p>
              </div>

              {/* Recovery Codes Grid */}
              {recoveryCodes.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 text-white text-left space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-mono font-semibold">
                      Emergency Recovery Codes (Save Now)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCodes}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        {hasCopiedCodes ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {hasCopiedCodes ? 'Copied' : 'Copy All'}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleDownloadCodes}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-sm tracking-wider text-teal-300">
                    {recoveryCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-800/80 border border-slate-700/60 text-center"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md"
                onClick={() => router.push('/dashboard')}
              >
                Go to Workspace Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading activation...
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
