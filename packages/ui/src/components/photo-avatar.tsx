"use client";

import React, { useState } from 'react';
import { User } from 'lucide-react';

export interface PhotoAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  aspectRatio?: 'square' | 'portrait';
  className?: string;
  showStatusDot?: boolean;
  statusDotColor?: 'emerald' | 'amber' | 'rose';
}

export function PhotoAvatar({
  src,
  name,
  size = 'md',
  aspectRatio = 'square',
  className = '',
  showStatusDot = false,
  statusDotColor = 'emerald',
}: PhotoAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  };

  let sizeClasses = 'w-10 h-10 text-xs';
  if (size === 'sm') {
    sizeClasses = aspectRatio === 'portrait' ? 'w-8 h-11 text-[10px]' : 'w-8 h-8 text-[10px]';
  } else if (size === 'md') {
    sizeClasses = aspectRatio === 'portrait' ? 'w-10 h-14 text-xs' : 'w-10 h-10 text-xs';
  } else if (size === 'lg') {
    sizeClasses = aspectRatio === 'portrait' ? 'w-16 h-22 text-base' : 'w-16 h-16 text-base';
  } else if (size === 'xl') {
    sizeClasses = aspectRatio === 'portrait' ? 'w-24 h-32 text-xl' : 'w-24 h-24 text-xl';
  }

  const dotColors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  const isPhotoValid = Boolean(src) && !hasError;

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 shadow-sm`}
      >
        {isPhotoValid ? (
          <img
            src={src!}
            alt={name}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dotColors[statusDotColor]}`}
        />
      )}
    </div>
  );
}
