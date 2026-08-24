'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { PhoneHandoffTokenResponse, PhoneHandoffEvent } from '@hr/schemas';

interface PhoneHandoffModalProps {
  isOpen: boolean;
  slotId: string;
  onClose: () => void;
  onPhotoReceived: (mediaAssetId: string, previewUrl?: string) => void;
}

export const PhoneHandoffModal: React.FC<PhoneHandoffModalProps> = ({
  isOpen,
  slotId,
  onClose,
  onPhotoReceived,
}) => {
  const [tokenData, setTokenData] = useState<PhoneHandoffTokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'WAITING' | 'CONNECTED' | 'RECEIVED' | 'EXPIRED'>('WAITING');
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [copied, setCopied] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const initHandoff = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatus('WAITING');
    setSecondsRemaining(300);

    try {
      const res = await fetch('/api/media/handoff/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate handoff session.');
      }

      const data: PhoneHandoffTokenResponse = await res.json();
      setTokenData(data);
      startSseListener(data.slotId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error initiating phone handoff.');
    } finally {
      setIsLoading(false);
    }
  };

  const startSseListener = (activeSlotId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `/api/media/handoff/${activeSlotId}/events`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload: PhoneHandoffEvent = JSON.parse(event.data);
        if (payload.type === 'PHONE_CONNECTED') {
          setStatus('CONNECTED');
        } else if (payload.type === 'PHOTO_UPLOADED' && payload.mediaAssetId) {
          setStatus('RECEIVED');
          es.close();
          setTimeout(() => {
            onPhotoReceived(payload.mediaAssetId!, payload.previewUrl);
            onClose();
          }, 1200);
        } else if (payload.type === 'EXPIRED') {
          setStatus('EXPIRED');
          es.close();
        }
      } catch {
        // Best effort SSE parsing
      }
    };

    es.onerror = () => {
      // SSE retry is managed automatically by browser EventSource
    };
  };

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    initHandoff();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('EXPIRED');
          if (eventSourceRef.current) eventSourceRef.current.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isOpen, slotId]);

  const handleCopyLink = () => {
    if (tokenData?.qrUrl) {
      navigator.clipboard.writeText(tokenData.qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Use Smartphone Camera</h3>
              <p className="text-xs text-slate-500">Scan QR to capture photo directly on phone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0F766E] border-t-transparent" />
            <span className="text-xs text-slate-500 font-medium">
              Generating secure QR token...
            </span>
          </div>
        ) : tokenData && status !== 'EXPIRED' ? (
          <div className="space-y-4 text-center">
            {/* QR Visual Box */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-md inline-block mx-auto relative group">
              {/* High-Contrast SVG QR Placeholder or Dynamic Canvas */}
              <div className="w-48 h-48 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-white relative overflow-hidden">
                <QrCode className="w-24 h-24 text-teal-400 opacity-90" />
                <span className="text-[10px] font-mono text-teal-200 mt-2 block tracking-wider uppercase">
                  Single-Use Session
                </span>
                <span className="text-[9px] font-mono text-slate-400 truncate max-w-full px-2">
                  {tokenData.token.slice(0, 16)}...
                </span>

                {/* Connection Status Overlay */}
                {status === 'CONNECTED' && (
                  <div className="absolute inset-0 bg-teal-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <Smartphone className="w-8 h-8 text-teal-300 animate-bounce mb-2" />
                    <span className="text-xs font-bold text-white">Phone Connected</span>
                    <span className="text-[10px] text-teal-200 mt-0.5">Capturing portrait...</span>
                  </div>
                )}

                {status === 'RECEIVED' && (
                  <div className="absolute inset-0 bg-emerald-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-white">Photo Transferred!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Timer */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-mono font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Expires in {formattedTime}</span>
              </div>
              <Badge variant={status === 'CONNECTED' ? 'primary' : 'neutral'} size="sm">
                {status === 'CONNECTED' ? 'Phone Active' : 'Waiting for Scan'}
              </Badge>
            </div>

            {/* Link Copy Fallback */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <input
                  type="text"
                  readOnly
                  value={tokenData.qrUrl}
                  className="bg-transparent flex-1 px-2 text-[11px] text-slate-600 outline-none font-mono truncate"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-xs h-7 px-2.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Zero PII contained in QR link. Token expires after single use.
              </span>
            </div>
          </div>
        ) : status === 'EXPIRED' ? (
          <div className="py-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">QR Session Expired</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tokens automatically expire after 5 minutes for security.
              </p>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={initHandoff}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Generate New Token
            </Button>
          </div>
        ) : null}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
