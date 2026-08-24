'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { CropCoordinatesInput, PhotoQualityReportDTO } from '@hr/schemas';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string, cropParams: CropCoordinatesInput) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [qualityReport, setQualityReport] = useState<PhotoQualityReportDTO | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Card Aspect Ratio: 60mm x 90mm = 2:3 = 0.667
  const CROP_WIDTH = 260;
  const CROP_HEIGHT = 390;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      analyzeQuality(img);
      renderPreview(img, zoom, rotation, offset);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (imageRef.current) {
      renderPreview(imageRef.current, zoom, rotation, offset);
    }
  }, [zoom, rotation, offset]);

  const analyzeQuality = (img: HTMLImageElement) => {
    const warnings: string[] = [];
    if (img.naturalWidth < 400 || img.naturalHeight < 600) {
      warnings.push('Image resolution is lower than recommended 600x900px.');
    }

    // Client-side quick luminance estimation using temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 50;
    tempCanvas.height = 50;
    const ctx = tempCanvas.getContext('2d');
    let avgLuminance = 128;
    if (ctx) {
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let totalL = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalL += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
      }
      avgLuminance = Math.round(totalL / (data.length / 4));

      if (avgLuminance < 35) {
        warnings.push('Photo appears significantly dark (underexposed).');
      } else if (avgLuminance > 235) {
        warnings.push('Photo appears overexposed.');
      }
    }

    setQualityReport({
      isAcceptable: warnings.length === 0,
      warnings,
      width: img.naturalWidth,
      height: img.naturalHeight,
      luminance: avgLuminance,
    });
  };

  const renderPreview = (
    img: HTMLImageElement,
    currentZoom: number,
    currentRot: number,
    currentOffset: { x: number; y: number },
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
    ctx.save();

    // Center transform
    ctx.translate(CROP_WIDTH / 2 + currentOffset.x, CROP_HEIGHT / 2 + currentOffset.y);
    ctx.rotate((currentRot * Math.PI) / 180);
    ctx.scale(currentZoom, currentZoom);

    const aspect = img.naturalWidth / img.naturalHeight;
    let drawWidth = CROP_WIDTH;
    let drawHeight = CROP_WIDTH / aspect;

    if (drawHeight < CROP_HEIGHT) {
      drawHeight = CROP_HEIGHT;
      drawWidth = CROP_HEIGHT * aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const handleConfirmCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const croppedDataUrl = canvas.toDataURL('image/webp', 0.95);
    const cropParams: CropCoordinatesInput = {
      x: Math.max(0, -offset.x),
      y: Math.max(0, -offset.y),
      width: CROP_WIDTH,
      height: CROP_HEIGHT,
      rotation,
    };

    onCropComplete(croppedDataUrl, cropParams);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        {/* Quality Banner if any */}
        {qualityReport && qualityReport.warnings.length > 0 && (
          <div className="w-full max-w-sm mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Advisory Warnings (Non-blocking):</span>
              {qualityReport.warnings.map((w, idx) => (
                <span key={idx} className="block text-[11px] text-amber-800">
                  • {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 60x90mm Framing Viewport */}
        <div className="relative border-4 border-[#0F766E] rounded-2xl shadow-xl overflow-hidden bg-slate-900 cursor-grab active:cursor-grabbing select-none">
          <canvas
            ref={canvasRef}
            width={CROP_WIDTH}
            height={CROP_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block"
          />

          {/* Guidelines Overlay (Head / Shoulder alignment) */}
          <div className="absolute inset-0 pointer-events-none border border-white/30 rounded-xl">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-28 h-36 border-2 border-dashed border-white/40 rounded-full" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-44 h-12 border-t-2 border-dashed border-white/40 rounded-t-full" />
          </div>

          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90">
            60 × 90 mm Card Ratio
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-2">
          Drag image to reposition face inside guidelines
        </p>
      </div>

      {/* Interactive Controls */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 max-w-sm mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ZoomOut className="w-4 h-4 text-slate-400" />
            <span>Zoom</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-48 accent-[#0F766E]"
          />
          <ZoomIn className="w-4 h-4 text-slate-400" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="text-xs"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            Rotate 90°
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
              setRotation(0);
            }}
            className="text-xs"
          >
            Reset Framing
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" size="md" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retake / Back
        </Button>

        <Button type="button" variant="primary" size="md" onClick={handleConfirmCrop}>
          <Check className="w-4 h-4 mr-1.5" />
          Approve & Attach Photo
        </Button>
      </div>
    </div>
  );
};
