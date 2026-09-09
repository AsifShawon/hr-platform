'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  User,
  ShieldCheck,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { useCardCreationState } from './useCardCreationState';
import { Step1WorkerEssentials } from './Step1WorkerEssentials';
import { Step2PreflightPreview } from './Step2PreflightPreview';
import { Step3PrintDispatch } from './Step3PrintDispatch';
import { Step4Completion } from './Step4Completion';
import { CardRenderer, CardWorkerData } from '../../../components/cards/CardRenderer';

export default function CreateCardWizardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading wizard...</div>}>
      <CreateCardWizardContent />
    </Suspense>
  );
}

function CreateCardWizardContent() {
  const searchParams = useSearchParams();
  const initialEmploymentId = searchParams.get('employmentId');

  const {
    currentStep,
    setCurrentStep,
    workerMode,
    setWorkerMode,
    selectedWorker,
    setSelectedWorker,
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    isSubmitting,
    toastMessage,
    setToastMessage,
    organizations,
    locations,
    orgUnits,
    templates,
    handleOrganizationChange,
    handleLocationChange,
    handleOrgUnitChange,
    handleTemplateChange,
    handleJobCategoryChange,
    activeEmploymentId,
    preflightResult,
    isLoadingPreflight,
    activeTemplateLayout,
    printOptions,
    setPrintOptions,
    completionData,
    submitStep1,
    executePrintSubmission,
    resetForNextCard,
    runPreflightCheck,
  } = useCardCreationState(initialEmploymentId);

  // Mobile Drawer Preview State
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  // Derive live preview worker data
  const currentOrg = organizations.find((o) => o.id === formData.organizationId);
  const currentUnit = orgUnits.find((u) => u.id === formData.orgUnitId);

  const liveWorkerData: CardWorkerData = {
    displayName:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.displayName || 'Worker Name'
        : formData.displayName || 'Worker Name',
    displayNameLatin:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.displayNameLatin || selectedWorker?.displayName
        : formData.displayNameLatin || formData.displayName,
    displayNameNative:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.displayNameNative
        : formData.displayNameNative,
    jobTitle:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.jobTitle || 'Job Title'
        : formData.jobTitle || 'Job Title',
    department:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.orgUnitName || 'Department'
        : currentUnit?.name || 'Department',
    employeeNumber:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.employeeNumber || 'EMP-0000'
        : formData.employeeNumber || 'EMP-0000',
    bloodGroup:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.bloodGroup || 'B+'
        : formData.bloodGroup || 'B+',
    joinDate: workerMode === 'EXISTING_WORKER' ? '2026-01-01' : formData.joinDate || '2026-01-01',
    emergencyContact:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.emergencyContact || '+880 1700-000000'
        : formData.emergencyContact || '+880 1700-000000',
    photoUrl:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.photoUrl || null
        : formData.photoDataUrl || null,
    orgName:
      workerMode === 'EXISTING_WORKER'
        ? selectedWorker?.organizationName || 'Company Name'
        : currentOrg?.displayName || currentOrg?.name || 'Company Name',
    orgNameBangla:
      workerMode === 'EXISTING_WORKER' ? selectedWorker?.organizationName : currentOrg?.name,
    serialNumber: 'CARD-2026-PREVIEW',
  };

  const steps = [
    { number: 1, label: 'Worker & Photo' },
    { number: 2, label: 'Preview & Preflight' },
    { number: 3, label: 'Print Output' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16 overflow-x-clip">
      {/* 1. Header & Step Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-[#0F766E]">Create ID Card</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0F766E]" />
            <span>Fast ID Card Creation Flow</span>
          </h1>
        </div>

        {/* 3-Step Indicator */}
        {currentStep < 4 && (
          <nav aria-label="Creation Progress" className="flex items-center gap-2 sm:gap-3">
            {steps.map((s, idx) => {
              const isCurrent = currentStep === s.number;
              const isCompleted = currentStep > s.number;

              return (
                <React.Fragment key={s.number}>
                  {idx > 0 && (
                    <div
                      className={`h-0.5 w-4 sm:w-8 transition-colors ${
                        isCompleted ? 'bg-[#0F766E]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                      isCurrent
                        ? 'bg-teal-50 text-[#0F766E] border border-teal-200 ring-2 ring-teal-600/20'
                        : isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-slate-400 bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-[#0F766E] text-white'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {isCompleted ? '✓' : s.number}
                    </span>
                    <span className="hidden md:inline">{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </nav>
        )}
      </div>

      {/* 2. Accessible Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-teal-50 border border-teal-200 text-teal-950'
              : toastMessage.type === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-900'
                : 'bg-sky-50 border border-sky-200 text-sky-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>

          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Main Step Routing Grid */}
      {currentStep === 4 ? (
        <Step4Completion
          completionData={completionData}
          workerName={liveWorkerData.displayName}
          employeeNumber={liveWorkerData.employeeNumber}
          onResetForAnother={resetForNextCard}
          onConfirmPhysicalPrint={async () => {
            if (completionData?.printJobId) {
              await fetch(`/api/cards/print-jobs/${completionData.printJobId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'CONFIRMED_PRINTED',
                  notes: 'Directly verified by operator on creation flow.',
                  autoActivateIssues: true,
                }),
              });
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Focused Interactive Form (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            {currentStep === 1 && (
              <Step1WorkerEssentials
                workerMode={workerMode}
                setWorkerMode={setWorkerMode}
                selectedWorker={selectedWorker}
                onSelectWorker={(w) => {
                  setSelectedWorker(w);
                  setFormData((prev: any) => ({
                    ...prev,
                    displayName: w.displayName,
                    displayNameLatin: w.displayNameLatin || w.displayName,
                    displayNameNative: w.displayNameNative || '',
                    employeeNumber: w.employeeNumber,
                    jobTitle: w.jobTitle,
                    organizationId: w.organizationId,
                    bloodGroup: w.bloodGroup || 'B+',
                  }));
                }}
                onClearWorker={() => setSelectedWorker(null)}
                formData={formData}
                setFormData={setFormData}
                fieldErrors={fieldErrors}
                organizations={organizations}
                locations={locations}
                orgUnits={orgUnits}
                templates={templates}
                onOrganizationChange={handleOrganizationChange}
                onLocationChange={handleLocationChange}
                onOrgUnitChange={handleOrgUnitChange}
                onTemplateChange={handleTemplateChange}
                onJobCategoryChange={handleJobCategoryChange}
                onSubmit={submitStep1}
                isSubmitting={isSubmitting}
              />
            )}

            {currentStep === 2 && (
              <Step2PreflightPreview
                preflightResult={preflightResult}
                isLoadingPreflight={isLoadingPreflight}
                activeTemplateLayout={activeTemplateLayout}
                workerData={liveWorkerData}
                templates={templates}
                currentTemplateId={formData.templateId}
                onTemplateChange={handleTemplateChange}
                onBack={() => setCurrentStep(1)}
                onContinue={() => setCurrentStep(3)}
                onFixField={() => setCurrentStep(1)}
              />
            )}

            {currentStep === 3 && (
              <Step3PrintDispatch
                printOptions={printOptions}
                setPrintOptions={setPrintOptions}
                summary={{
                  workerName: liveWorkerData.displayName,
                  employeeNumber: liveWorkerData.employeeNumber,
                  organizationName: liveWorkerData.orgName || 'Company',
                  orgUnitName: liveWorkerData.department,
                  templateName:
                    templates.find((t) => t.id === formData.templateId)?.name || 'Classic Vertical',
                  photoAttached: Boolean(liveWorkerData.photoUrl),
                }}
                onBack={() => setCurrentStep(2)}
                onSubmit={executePrintSubmission}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          {/* Right Column (Desktop 1280px+): Sticky Live Card Preview (5 Columns) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-20 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-100 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[460px]">
              <div className="flex items-center justify-between w-full mb-3 px-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Real-Time Card Preview</span>
                </span>
                <Badge variant="primary" size="sm">
                  60 × 90 mm
                </Badge>
              </div>

              {activeTemplateLayout ? (
                <CardRenderer
                  layout={activeTemplateLayout}
                  worker={liveWorkerData}
                  side="front"
                  allowFlip={true}
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Select a template to view card preview.
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-[11px] text-teal-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span>
                Front displays in English (Latin). Back displays in Bangla (বাংলা) with emergency
                contact.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Preview Button for Mobile & Tablet */}
      {currentStep === 1 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setIsMobilePreviewOpen(true)}
            className="bg-[#134E4A] hover:bg-[#0F766E] text-white shadow-xl rounded-full px-4 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Card</span>
          </Button>
        </div>
      )}

      {/* Mobile Drawer / Modal for Preview */}
      {isMobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-2 animate-in fade-in">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0F766E]" />
                <span>Live Card Preview</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMobilePreviewOpen(false)}
                className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center p-4 bg-slate-50 rounded-2xl">
              {activeTemplateLayout ? (
                <CardRenderer
                  layout={activeTemplateLayout}
                  worker={liveWorkerData}
                  side="front"
                  allowFlip={true}
                />
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsMobilePreviewOpen(false)}
              className="w-full font-bold"
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
