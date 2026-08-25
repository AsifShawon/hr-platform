import React from 'react';
import { CheckCircle2, AlertCircle, Clock, XCircle, ShieldCheck } from 'lucide-react';

export type StatusType =
  | 'ACTIVE'
  | 'PREBOARDING'
  | 'ON_LEAVE'
  | 'INACTIVE'
  | 'SEPARATED'
  | 'READY'
  | 'NEEDS_ATTENTION'
  | 'BLOCKED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'CONFIRMED_PRINTED'
  | 'REJECTED_DEFECT'
  | 'ISSUED'
  | 'REPLACED'
  | 'REVOKED';

export interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, label, size = 'sm', className = '' }: StatusBadgeProps) {
  const s = String(status).toUpperCase();

  let text = label || s;
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon: React.ComponentType<{ className?: string }> | null = null;

  switch (s) {
    case 'ACTIVE':
    case 'READY':
    case 'COMPLETED':
    case 'CONFIRMED_PRINTED':
    case 'ISSUED':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      Icon = CheckCircle2;
      if (!label) {
        if (s === 'CONFIRMED_PRINTED') text = 'Confirmed Printed';
        else if (s === 'READY') text = 'Ready to Print';
        else if (s === 'ACTIVE') text = 'Active';
        else if (s === 'ISSUED') text = 'Issued';
      }
      break;

    case 'NEEDS_ATTENTION':
    case 'ON_LEAVE':
    case 'PREBOARDING':
    case 'REPLACED':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      Icon = AlertCircle;
      if (!label) {
        if (s === 'NEEDS_ATTENTION') text = 'Needs Attention';
        else if (s === 'ON_LEAVE') text = 'On Leave';
        else if (s === 'PREBOARDING') text = 'Preboarding';
        else if (s === 'REPLACED') text = 'Replaced';
      }
      break;

    case 'SEPARATED':
    case 'INACTIVE':
    case 'BLOCKED':
    case 'FAILED':
    case 'CANCELLED':
    case 'REJECTED_DEFECT':
    case 'REVOKED':
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      Icon = XCircle;
      if (!label) {
        if (s === 'REJECTED_DEFECT') text = 'Defect Reported';
        else if (s === 'SEPARATED') text = 'Separated';
        else if (s === 'REVOKED') text = 'Revoked';
        else if (s === 'BLOCKED') text = 'Blocked';
      }
      break;

    case 'QUEUED':
    case 'PROCESSING':
      bg = 'bg-teal-50 text-[#0F766E] border-teal-200 animate-pulse';
      Icon = Clock;
      if (!label) text = s === 'PROCESSING' ? 'Processing' : 'Queued';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${bg} ${sizeClasses} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{text}</span>
    </span>
  );
}
