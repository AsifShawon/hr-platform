import React from 'react';
import { cn } from '../index.js';
import { FOCUS_RING_CLASSES } from '../tokens.js';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      role="tablist"
      aria-label="Navigation Tabs"
      className={cn(
        'inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 max-w-full overflow-x-auto',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'bg-white text-[#134E4A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
              FOCUS_RING_CLASSES,
            )}
          >
            {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
