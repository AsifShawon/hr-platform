'use client';

import React, { useState } from 'react';
import {
  Camera,
  Smartphone,
  Upload,
  User,
  CheckCircle2,
  Trash2,
  Crop,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { CameraModal } from './CameraModal';
import { PhoneHandoffModal } from './PhoneHandoffModal';
import { ImageCropper } from './ImageCropper';
import { CropCoordinatesInput } from '@hr/schemas';

interface PhotoCaptureStudioProps {
  currentPhotoUrl?: string | null;
  slotId: string;
  onPhotoChanged: (photoDataUrl: string | null, cropParams?: CropCoordinatesInput) => void;
}

export const PhotoCaptureStudio: React.FC<PhotoCaptureStudioProps> = ({
  currentPhotoUrl,
  slotId,
  onPhotoChanged,
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [uploadedRawImage, setUploadedRawImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedRawImage(dataUrl);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string, cropParams: CropCoordinatesInput) => {
    setIsCropperOpen(false);
    setUploadedRawImage(null);
    onPhotoChanged(croppedDataUrl, cropParams);
  };

  const handlePhonePhotoReceived = (mediaAssetId: string, previewUrl?: string) => {
    const photoUrl = previewUrl || `/api/media/assets/${mediaAssetId}`;
    onPhotoChanged(photoUrl);
  };

  return (
    <div className="space-y-4">
      {/* Photo Preview & Controls Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        {/* Photo Box (60x90mm ratio = 2:3) */}
        <div className="relative w-28 h-40 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 shadow-inner group">
          {currentPhotoUrl ? (
            <>
              <img
                src={currentPhotoUrl}
                alt="Worker Portrait"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onPhotoChanged(null)}
                  className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow"
                  title="Remove Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-2 space-y-1">
              <User className="w-8 h-8 text-slate-400 mx-auto" />
              <span className="text-[10px] text-slate-400 font-medium block">
                No Photo Attached
              </span>
            </div>
          )}

          {currentPhotoUrl && (
            <div className="absolute bottom-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Capture Methods Actions */}
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h4 className="text-xs font-bold text-slate-900">ID Card Portrait Photo</h4>
              {currentPhotoUrl && (
                <Badge variant="primary" size="sm">
                  Card Ready (300 DPI)
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Portrait will be normalized to exact 60 × 90 mm physical card dimensions with EXIF
              metadata stripped.
            </p>
          </div>

          {/* Three Option Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsCameraModalOpen(true)}
              className="text-xs"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Use Camera
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPhoneModalOpen(true)}
              className="text-xs"
            >
              <Smartphone className="w-3.5 h-3.5 mr-1.5 text-[#0F766E]" />
              Use Phone
            </Button>

            <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors">
              <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Upload File</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoApproved={(dataUrl, crop) => onPhotoChanged(dataUrl, crop)}
      />

      {/* Phone QR Handoff Modal */}
      <PhoneHandoffModal
        isOpen={isPhoneModalOpen}
        slotId={slotId}
        onClose={() => setIsPhoneModalOpen(false)}
        onPhotoReceived={handlePhonePhotoReceived}
      />

      {/* File Upload Cropper Modal */}
      {isCropperOpen && uploadedRawImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Crop & Frame Uploaded Photo</h3>
            <ImageCropper
              imageSrc={uploadedRawImage}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setIsCropperOpen(false);
                setUploadedRawImage(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
