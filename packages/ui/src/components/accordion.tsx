import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../index.js';
import { FOCUS_RING_CLASSES } from '../tokens.js';

export interface AccordionItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  className,
  allowMultiple = false,
}) => {
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn('divide-y divide-slate-200 border-y border-slate-200', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const buttonId = `accordion-btn-${item.id}`;
        const contentId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id} className="py-4">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => toggleItem(item.id)}
                className={cn(
                  'flex w-full items-center justify-between text-left font-semibold text-slate-900 hover:text-[#0F766E] transition-colors rounded-lg py-1',
                  FOCUS_RING_CLASSES,
                )}
              >
                <span className="text-base sm:text-lg pr-4">{item.question}</span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180 text-[#0F766E]',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            {isOpen && (
              <div
                id={contentId}
                role="region"
                aria-labelledby={buttonId}
                className="mt-3 text-sm leading-relaxed text-slate-600 animate-in fade-in-50 duration-150"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
