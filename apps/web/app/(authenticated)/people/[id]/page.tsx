'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Briefcase,
  ShieldCheck,
  CreditCard,
  Edit2,
  ChevronLeft,
  Calendar,
  Building2,
  MapPin,
  FolderTree,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileBadge,
  Sparkles,
  Camera,
  X,
  Printer,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { EmploymentStatus, JobCategory } from '@hr/domain';
import { PhotoCaptureStudio } from '../../../components/photo-capture/PhotoCaptureStudio';
import { CardOperationsPanel } from '../../../components/cards/CardOperationsPanel';

interface PersonDetail {
  id: string;
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  dateOfBirth?: string | null;
  gender: string;
  bloodGroup?: string | null;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  photoMediaId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  activeEmployment?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    jobCategory: JobCategory;
    joinDate: string;
    endDate?: string | null;
    status: EmploymentStatus;
    organization: { id: string; name: string; displayName?: string | null };
    location?: { id: string; name: string; code: string } | null;
    orgUnit?: { id: string; name: string; nameBangla?: string | null; code: string } | null;
  } | null;
  employments: Array<{
    id: string;
    employeeNumber: string;
    jobTitle: string;
    jobCategory: JobCategory;
    joinDate: string;
    endDate?: string | null;
    status: EmploymentStatus;
    organization: { id: string; name: string; displayName?: string | null };
    location?: { id: string; name: string } | null;
    orgUnit?: { id: string; name: string; nameBangla?: string | null } | null;
  }>;
  identityDocuments: Array<{
    id: string;
    documentType: string;
    country: string;
    documentNumberMasked: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    isVerified: boolean;
  }>;
}

export default function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'cards' ? 'CARDS' : 'OVERVIEW';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CARDS'>(initialTab);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audited Identity Reveal Modal State
  const [revealingDocId, setRevealingDocId] = useState<string | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<string | null>(null);
  const [revealCountdown, setRevealCountdown] = useState<number>(0);
  const [isRevealing, setIsRevealing] = useState(false);

  // Photo Update Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());

  useEffect(() => {
    async function loadPerson() {
      try {
        const res = await fetch(`/api/people/${personId}`);
        if (res.ok) {
          const data = await res.json();
          setPerson(data.person);
        } else {
          setErrorMessage('Worker record not found.');
        }
      } catch {
        setErrorMessage('Failed to load worker profile.');
      } finally {
        setIsLoading(false);
      }
    }
    loadPerson();
  }, [personId]);

  const handlePhotoChanged = async (photoDataUrl: string | null, crop?: any) => {
    if (!photoDataUrl) {
      // Remove photo
      try {
        const res = await fetch(`/api/people/${personId}/photo`, { method: 'DELETE' });
        if (res.ok) {
          setPerson((prev) => (prev ? { ...prev, photoMediaId: null } : null));
        } else {
          setErrorMessage('Failed to remove photo.');
        }
      } catch {
        setErrorMessage('Failed to remove photo.');
      }
      return;
    }

    // Upload & process photo
    try {
      const res = await fetch(`/api/people/${personId}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoBase64: photoDataUrl, crop }),
      });

      if (res.ok) {
        const data = await res.json();
        setPerson((prev) => (prev ? { ...prev, photoMediaId: data.mediaAssetId } : null));
        setPhotoTimestamp(Date.now());
        setIsPhotoModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || 'Failed to update photo.');
      }
    } catch {
      setErrorMessage('Network error while updating photo.');
    }
  };

  // Countdown timer for unmasked identity reveal
  useEffect(() => {
    if (revealCountdown <= 0) {
      setRevealedNumber(null);
      setRevealingDocId(null);
      return;
    }

    const timer = setInterval(() => {
      setRevealCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [revealCountdown]);

  const handleRevealDocument = async (docId: string) => {
    setIsRevealing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/people/${personId}/identity-documents/${docId}/reveal`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setRevealingDocId(docId);
        setRevealedNumber(data.documentNumber);
        setRevealCountdown(data.expiresInSeconds || 30);
      } else {
        setErrorMessage('Permission denied or unable to reveal sensitive government document.');
      }
    } catch {
      setErrorMessage('Network error while requesting document unmasking.');
    } finally {
      setIsRevealing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#134E4A] border-t-transparent mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading worker profile...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Worker Record Not Found</h2>
        <p className="text-xs text-slate-500">
          {errorMessage || 'The requested worker could not be found.'}
        </p>
        <Link href="/people">
          <Button type="button" variant="primary" size="md">
            Return to Registry
          </Button>
        </Link>
      </div>
    );
  }

  const activeEmp = person.activeEmployment;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to People Registry
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPhotoModalOpen(true)}
          >
            <Camera className="w-3.5 h-3.5 mr-1" />
            Photo Studio
          </Button>
          <Link href={`/people/${person.id}/edit`}>
            <Button type="button" variant="outline" size="sm">
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit Profile
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('CARDS')}
            className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Issue / Manage Card
          </Button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Photo Avatar with Update trigger */}
            <div className="relative group shrink-0">
              <div className="w-20 h-28 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center text-2xl font-bold text-[#0F766E] shadow-sm overflow-hidden">
                {person.photoMediaId ? (
                  <img
                    src={`/api/people/${person.id}/photo?t=${photoTimestamp}`}
                    alt={person.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  person.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute bottom-0 right-0 p-1.5 rounded-xl bg-[#0F766E] text-white shadow-md hover:bg-teal-700 transition-colors"
                title="Update Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {person.displayName}
                </h1>
                {activeEmp && (
                  <Badge variant="success" size="sm">
                    {activeEmp.status}
                  </Badge>
                )}
              </div>

              {person.displayNameNative && (
                <p className="text-sm font-semibold text-[#0F766E]">{person.displayNameNative}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                {activeEmp && (
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {activeEmp.employeeNumber}
                  </span>
                )}
                <span>{activeEmp?.jobTitle || 'No active assignment'}</span>
                {activeEmp?.orgUnit?.name && (
                  <span className="flex items-center gap-1">
                    <FolderTree className="w-3 h-3 text-slate-400" />
                    {activeEmp.orgUnit.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 sm:self-start">
            <div>Registered: {new Date(person.createdAt).toLocaleDateString()}</div>
            <div className="text-[11px] font-mono">Record Version: v{person.version}</div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-[#134E4A] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Worker Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CARDS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CARDS'
              ? 'bg-[#134E4A] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Card Operations & Credentials</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'CARDS' ? (
        <CardOperationsPanel
          personId={person.id}
          employmentId={activeEmp?.id}
          workerName={person.displayName}
          employeeNumber={activeEmp?.employeeNumber || ''}
        />
      ) : (
        /* Two-Column Details Layout */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Personal & Contact Information */}
          <div className="space-y-6 md:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <User className="w-4 h-4 text-[#0F766E]" />
                Personal Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Gender
                  </span>
                  <span className="text-slate-800 font-medium">{person.gender}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Date of Birth
                  </span>
                  <span className="text-slate-800 font-medium">
                    {person.dateOfBirth ? person.dateOfBirth.split('T')[0] : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Blood Group
                  </span>
                  <span className="text-slate-800 font-medium">{person.bloodGroup || '—'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Primary Phone
                  </span>
                  <span className="text-slate-800 font-medium">{person.primaryPhone || '—'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Primary Email
                  </span>
                  <span className="text-slate-800 font-medium">{person.primaryEmail || '—'}</span>
                </div>
              </div>
            </div>

            {/* Card Readiness Widget */}
            <div className="bg-gradient-to-br from-teal-900 to-[#134E4A] rounded-2xl p-5 text-white shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-200">
                  Card Readiness
                </h4>
              </div>
              <p className="text-xs text-teal-100">
                Worker record meets all schema standards for high-resolution 300 DPI bilingual card
                printing.
              </p>
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex items-center gap-2 text-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>Bilingual script names complete</span>
                </div>
                <div className="flex items-center gap-2 text-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>Immutable Employee ID assigned</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Employment History & Sensitive Documents */}
          <div className="space-y-6 md:col-span-2">
            {/* Employment Assignments */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <Briefcase className="w-4 h-4 text-[#0F766E]" />
                Employment History & Assignments
              </h3>

              <div className="space-y-3">
                {person.employments.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{emp.jobTitle}</span>
                        <Badge variant="neutral" size="sm">
                          {emp.jobCategory}
                        </Badge>
                        <Badge variant="success" size="sm">
                          {emp.status}
                        </Badge>
                      </div>
                      <div className="text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Org: {emp.organization.displayName || emp.organization.name}</span>
                        {emp.location && <span>Site: {emp.location.name}</span>}
                        {emp.orgUnit && <span>Unit: {emp.orgUnit.name}</span>}
                      </div>
                    </div>

                    <div className="text-right text-slate-500 font-medium shrink-0">
                      <div>Joined: {emp.joinDate ? emp.joinDate.split('T')[0] : '—'}</div>
                      {emp.endDate && (
                        <div className="text-rose-600">Ended: {emp.endDate.split('T')[0]}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensitive Identity Documents */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  Sensitive Identity Documents (AES-256-GCM)
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">Masked by default</span>
              </div>

              {person.identityDocuments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No government identity documents registered.
                </p>
              ) : (
                <div className="space-y-3">
                  {person.identityDocuments.map((doc) => {
                    const isRevealed = revealingDocId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{doc.documentType}</span>
                            <Badge variant="neutral" size="sm">
                              {doc.country}
                            </Badge>
                            {doc.isVerified && (
                              <Badge variant="success" size="sm">
                                Verified
                              </Badge>
                            )}
                          </div>

                          <div className="font-mono font-bold text-sm">
                            {isRevealed ? (
                              <span className="text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {revealedNumber}
                              </span>
                            ) : (
                              <span className="text-slate-700">{doc.documentNumberMasked}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isRevealed ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>Auto-masks in {revealCountdown}s</span>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isRevealing}
                              onClick={() => handleRevealDocument(doc.id)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Reveal (Audited)
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Studio Modal */}

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-base font-bold text-slate-900">Manage Employee Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PhotoCaptureStudio
              slotId={activeEmp?.employeeNumber || person.id}
              currentPhotoUrl={
                person.photoMediaId ? `/api/people/${person.id}/photo?t=${photoTimestamp}` : null
              }
              onPhotoChanged={handlePhotoChanged}
            />
          </div>
        </div>
      )}
    </div>
  );
}
