import React, { HTMLAttributes } from 'react';
import { cn } from '../index.js';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect', ...props }) => {
  const variantStyles = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-slate-200/80', variantStyles[variant], className)}
      {...props}
    />
  );
};
