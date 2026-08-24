'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  FlipHorizontal,
  Layers,
  Upload,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { ImageCropper } from './ImageCropper';
import { CropCoordinatesInput } from '@hr/schemas';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoApproved: (photoDataUrl: string, cropParams?: CropCoordinatesInput) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onPhotoApproved }) => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Capture State
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [capturedShots, setCapturedShots] = useState<string[]>([]);
  const [selectedShotIndex, setSelectedShotIndex] = useState<number | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks cleanly
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on close / unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  const startCamera = async (deviceId?: string, facing: 'user' | 'environment' = 'user') => {
    setPermissionError(null);
    stopCameraTracks();

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setPermissionError('Camera access requires a Secure Context (HTTPS or localhost).');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionGranted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Enumerate available video inputs
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (!selectedDeviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0]!.deviceId);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(
          'Camera permission was denied. Please allow camera access in your browser settings.',
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera device detected on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionError('Camera is currently in use by another application.');
      } else {
        setPermissionError(`Failed to access camera: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const handleTriggerCapture = () => {
    setIsCountingDown(true);
    setCountdownSeconds(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdownSeconds(count);

      if (count === 0) {
        clearInterval(interval);
        captureBurstShots();
      }
    }, 1000);
  };

  const captureBurstShots = () => {
    const video = videoRef.current;
    if (!video) return;

    const shots: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Shot 1
    ctx.drawImage(video, 0, 0);
    shots.push(canvas.toDataURL('image/jpeg', 0.95));

    // Shot 2 (after 200ms)
    setTimeout(() => {
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0);
        shots.push(canvas.toDataURL('image/jpeg', 0.95));
      }
    }, 200);

    // Shot 3 (after 400ms)
    setTimeout(() => {
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0);
        shots.push(canvas.toDataURL('image/jpeg', 0.95));
        setCapturedShots(shots);
        setSelectedShotIndex(0);
        setIsCountingDown(false);
        stopCameraTracks();
      }
    }, 400);
  };

  const handleRetake = () => {
    setCapturedShots([]);
    setSelectedShotIndex(null);
    setIsCropping(false);
    startCamera(selectedDeviceId, facingMode);
  };

  const handleProceedToCrop = () => {
    if (selectedShotIndex !== null && capturedShots[selectedShotIndex]) {
      setIsCropping(true);
    }
  };

  const handleCropComplete = (croppedDataUrl: string, cropParams: CropCoordinatesInput) => {
    stopCameraTracks();
    onPhotoApproved(croppedDataUrl, cropParams);
    onClose();
  };

  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedShots([dataUrl]);
      setSelectedShotIndex(0);
      setIsCropping(true);
      stopCameraTracks();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">In-Browser Camera Studio</h3>
              <p className="text-xs text-slate-500">Live portrait framing & 3-shot burst capture</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraTracks();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="mt-5 space-y-5">
          {/* Pre-permission / Request Screen */}
          {!permissionGranted && !permissionError && (
            <div className="text-center py-6 px-4 space-y-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="h-12 w-12 rounded-2xl bg-teal-100/60 text-[#0F766E] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Camera Permission Required</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your browser will request permission to access your camera. Video streams are
                  processed entirely inside your browser and private local server. No cloud
                  telemetry or external recording is performed.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => startCamera(selectedDeviceId, facingMode)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Enable Camera
                </Button>
                <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors">
                  <Upload className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Upload File Instead</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUploadFallback}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Permission Error State */}
          {permissionError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <VideoOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Camera Unavailable</span>
                  <p className="mt-0.5 leading-relaxed">{permissionError}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startCamera(selectedDeviceId, facingMode)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Try Again
                </Button>
                <label className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  <span>Upload Photo File</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUploadFallback}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Live Camera View */}
          {permissionGranted && capturedShots.length === 0 && !isCropping && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="flex items-center justify-between text-xs">
                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCamera(e.target.value, facingMode);
                    }}
                    className="h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newFacing = facingMode === 'user' ? 'environment' : 'user';
                    setFacingMode(newFacing);
                    startCamera(selectedDeviceId, newFacing);
                  }}
                  className="text-xs ml-auto"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 mr-1.5" />
                  Switch Front/Back
                </Button>
              </div>

              {/* Video Feed Box */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Portrait Framing Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-72 border-2 border-dashed border-teal-400/80 rounded-2xl shadow-lg relative">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-32 border border-dashed border-white/50 rounded-full" />
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-teal-200">
                      Align Head & Shoulders
                    </span>
                  </div>
                </div>

                {/* Countdown Splash */}
                {isCountingDown && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center animate-in fade-in">
                    <span className="text-6xl font-black text-white animate-ping">
                      {countdownSeconds}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Trigger */}
              <div className="flex items-center justify-center pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isCountingDown}
                  onClick={handleTriggerCapture}
                  className="px-8 shadow-lg shadow-teal-900/20"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isCountingDown
                    ? `Capturing in ${countdownSeconds}...`
                    : 'Take Snapshot (3 Burst)'}
                </Button>
              </div>
            </div>
          )}

          {/* 3-Shot Selection Screen */}
          {capturedShots.length > 0 && !isCropping && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0F766E]" />
                  Select Best Shot from 3-Frame Burst
                </h4>
                <Badge variant="primary" size="sm">
                  Frame {selectedShotIndex! + 1} of {capturedShots.length}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {capturedShots.map((shot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedShotIndex(idx)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-3/4 group ${
                      selectedShotIndex === idx
                        ? 'border-[#0F766E] ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={shot}
                      alt={`Shot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedShotIndex === idx && (
                      <div className="absolute top-2 right-2 bg-[#0F766E] text-white p-1 rounded-full shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" size="md" onClick={handleRetake}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Retake Shots
                </Button>
                <Button type="button" variant="primary" size="md" onClick={handleProceedToCrop}>
                  Next: Crop & Frame
                </Button>
              </div>
            </div>
          )}

          {/* Interactive Crop Studio */}
          {isCropping && selectedShotIndex !== null && capturedShots[selectedShotIndex] && (
            <ImageCropper
              imageSrc={capturedShots[selectedShotIndex]!}
              onCropComplete={handleCropComplete}
              onCancel={() => setIsCropping(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
