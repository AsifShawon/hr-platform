import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStepIndex, onStepClick, className = '' }: StepperProps) {
  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

          return (
            <li
              key={step.id}
              className="relative flex-1 flex items-center gap-3 group"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick!(idx)}
                className={`flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] rounded-xl p-1 -m-1 transition-colors ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-[#134E4A] text-white'
                      : isCurrent
                        ? 'bg-teal-100 text-[#0F766E] border-2 border-[#0F766E]'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>

                {/* Step Title & Description */}
                <div className="hidden sm:block">
                  <span
                    className={`text-xs font-bold block leading-tight ${
                      isCurrent
                        ? 'text-[#0F766E]'
                        : isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  className={`hidden md:block flex-1 h-0.5 mx-3 transition-colors ${
                    idx < currentStepIndex ? 'bg-[#134E4A]' : 'bg-slate-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
