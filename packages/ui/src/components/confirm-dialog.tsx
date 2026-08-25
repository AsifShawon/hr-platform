import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Dialog } from './dialog.js';
import { Button } from './button.js';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  intent = 'primary',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  let iconBg = 'bg-teal-50 text-[#0F766E] border-teal-200';
  let Icon = Info;
  let confirmVariant: 'primary' | 'destructive' | 'outline' = 'primary';

  if (intent === 'danger') {
    iconBg = 'bg-rose-50 text-rose-600 border-rose-200';
    Icon = AlertCircle;
    confirmVariant = 'destructive';
  } else if (intent === 'warning') {
    iconBg = 'bg-amber-50 text-amber-600 border-amber-200';
    Icon = AlertTriangle;
    confirmVariant = 'primary';
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-2xl border ${iconBg} shrink-0 mt-0.5`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-0.5">{description}</p>
        </div>

        {children}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            className={
              intent === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                : 'bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold'
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
