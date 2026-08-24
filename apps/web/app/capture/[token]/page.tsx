'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { ImageCropper } from '../../components/photo-capture/ImageCropper';
import { CropCoordinatesInput } from '@hr/schemas';

interface CapturePageProps {
  params: Promise<{ token: string }>;
}

export default function MobileCapturePage({ params }: CapturePageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string>('');

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      setIsValidating(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/media/handoff/verify/${token}`);
        const data = await res.json();

        if (res.ok && data.isValid) {
          setTokenValid(true);
          setSlotId(data.slotId);
        } else {
          setErrorMessage(data.message || 'This QR session is invalid or has expired.');
        }
      } catch {
        setErrorMessage('Failed to connect to the local server.');
      } finally {
        setIsValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedDataUrl: string, cropParams: CropCoordinatesInput) => {
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/media/handoff/${token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64: croppedDataUrl,
          crop: cropParams,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setIsCropping(false);
      } else {
        setErrorMessage(data.message || 'Failed to transfer photo to desktop.');
      }
    } catch {
      setErrorMessage('Network error while uploading photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 rounded-3xl border border-slate-700/80 shadow-2xl p-6 space-y-6 backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 block">HR ID Platform</span>
              <span className="text-[10px] text-teal-400 block font-medium">
                Mobile Photo Studio
              </span>
            </div>
          </div>
          <Badge variant="primary" size="sm">
            Local Handoff
          </Badge>
        </div>

        {/* Validating State */}
        {isValidating && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent" />
            <span className="text-xs text-slate-400">Verifying secure token...</span>
          </div>
        )}

        {/* Error State */}
        {!isValidating && errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Session Inactive</span>
            </div>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Ready to Capture */}
        {!isValidating && tokenValid && !isCropping && !isSuccess && (
          <div className="space-y-6 text-center py-4">
            <div className="space-y-2">
              <div className="h-16 w-16 rounded-3xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-300">
                <Camera className="w-8 h-8" />
              </div>
              <h1 className="text-lg font-bold text-white">Capture Employee Portrait</h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Take a portrait photo using your phone camera. It will automatically transfer to the
                desktop workspace.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <label className="block w-full">
                <div className="w-full h-12 rounded-xl bg-gradient-to-r from-[#134E4A] to-[#0F766E] hover:from-[#0F766E] hover:to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 cursor-pointer active:scale-98 transition-all">
                  <Camera className="w-5 h-5" />
                  <span>Open Camera</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </label>

              <label className="block w-full">
                <div className="w-full h-10 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose from Gallery</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-700/60 text-[10px] text-slate-500">
              Zero PII is stored on this phone. Image metadata and EXIF are stripped automatically.
            </div>
          </div>
        )}

        {/* Cropping Screen */}
        {isCropping && capturedImage && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-200">Adjust & Crop Portrait</h3>
            <ImageCropper
              imageSrc={capturedImage}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setIsCropping(false);
                setCapturedImage(null);
              }}
            />
            {isUploading && (
              <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-800 text-teal-200 text-xs flex items-center justify-center gap-2 animate-pulse">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-400 border-t-transparent" />
                <span>Transferring to desktop...</span>
              </div>
            )}
          </div>
        )}

        {/* Success Screen */}
        {isSuccess && (
          <div className="py-8 text-center space-y-4 animate-in fade-in">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Photo Transferred!</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                The cropped portrait has been safely received on your desktop workspace. You may
                close this tab.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
