'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Edit2,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  User,
  Briefcase,
  FolderTree,
  MapPin,
  X,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';
import { Gender, EmploymentStatus, JobCategory } from '@hr/domain';

export default function EditWorkerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);

  // Form fields
  const [personVersion, setPersonVersion] = useState<number>(1);
  const [employmentId, setEmploymentId] = useState<string | null>(null);
  const [employmentVersion, setEmploymentVersion] = useState<number>(1);

  const [displayName, setDisplayName] = useState('');
  const [displayNameLatin, setDisplayNameLatin] = useState('');
  const [displayNameNative, setDisplayNameNative] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.UNDISCLOSED);
  const [bloodGroup, setBloodGroup] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

  // Employment fields
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState<JobCategory>(JobCategory.STAFF);
  const [status, setStatus] = useState<EmploymentStatus>(EmploymentStatus.ACTIVE);
  const [joinDate, setJoinDate] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');

  const loadWorkerData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setConcurrencyConflict(false);
    try {
      const res = await fetch(`/api/people/${personId}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.person;
        setPersonVersion(p.version);
        setDisplayName(p.displayName || '');
        setDisplayNameLatin(p.displayNameLatin || '');
        setDisplayNameNative(p.displayNameNative || '');
        setGivenName(p.givenName || '');
        setFamilyName(p.familyName || '');
        setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '');
        setGender(p.gender || Gender.UNDISCLOSED);
        setBloodGroup(p.bloodGroup || '');
        setPrimaryPhone(p.primaryPhone || '');
        setPrimaryEmail(p.primaryEmail || '');

        if (p.activeEmployment) {
          setEmploymentId(p.activeEmployment.id);
          setEmploymentVersion(p.activeEmployment.version);
          setEmployeeNumber(p.activeEmployment.employeeNumber);
          setJobTitle(p.activeEmployment.jobTitle || '');
          setJobCategory(p.activeEmployment.jobCategory || JobCategory.STAFF);
          setStatus(p.activeEmployment.status || EmploymentStatus.ACTIVE);
          setJoinDate(p.activeEmployment.joinDate ? p.activeEmployment.joinDate.split('T')[0] : '');
        }
      } else {
        setErrorMessage('Worker record not found.');
      }
    } catch {
      setErrorMessage('Failed to load worker details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerData();
  }, [personId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConcurrencyConflict(false);

    try {
      // 1. Update Person record with optimistic concurrency check
      const personRes = await fetch(`/api/people/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          displayNameLatin: displayNameLatin.trim() || undefined,
          displayNameNative: displayNameNative.trim() || undefined,
          givenName: givenName.trim() || undefined,
          familyName: familyName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender,
          bloodGroup: bloodGroup.trim() || undefined,
          primaryPhone: primaryPhone.trim() || undefined,
          primaryEmail: primaryEmail.trim() || undefined,
          expectedVersion: personVersion,
        }),
      });

      if (personRes.status === 409) {
        setConcurrencyConflict(true);
        setErrorMessage(
          'This record was modified by another operator. Please refresh to load the latest changes.',
        );
        setIsSubmitting(false);
        return;
      }

      if (!personRes.ok) {
        const errorData = await personRes.json();
        setErrorMessage(errorData.message || 'Failed to update person details.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update Employment record if present
      if (employmentId) {
        const empRes = await fetch(`/api/employments/${employmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: jobTitle.trim(),
            jobCategory,
            status,
            joinDate: joinDate || undefined,
            expectedVersion: employmentVersion,
          }),
        });

        if (empRes.status === 409) {
          setConcurrencyConflict(true);
          setErrorMessage('Employment assignment was updated concurrently.');
          setIsSubmitting(false);
          return;
        }

        if (!empRes.ok) {
          const empErr = await empRes.json();
          setErrorMessage(empErr.message || 'Failed to update employment details.');
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMessage('Worker details updated successfully!');
      setTimeout(() => {
        router.push(`/people/${personId}`);
      }, 1000);
    } catch {
      setErrorMessage('Network error occurred during update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#134E4A] border-t-transparent mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading worker...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <Edit2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Edit Worker Profile
            </h1>
            <p className="text-sm text-slate-500">
              Update worker identity, contact information, and current employment role.
            </p>
          </div>
        </div>

        <Link href={`/people/${personId}`}>
          <Button type="button" variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profile
          </Button>
        </Link>
      </div>

      {/* Concurrency Conflict / Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs font-bold text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {concurrencyConflict && (
            <Button type="button" variant="outline" size="sm" onClick={loadWorkerData}>
              Reload Latest
            </Button>
          )}
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Person Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-[#0F766E]" />
            Personal & Bilingual Details (v{personVersion})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display Name (English / Latin) *
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Native Script Name (বাংলা নাম)
              </label>
              <Input
                value={displayNameNative}
                onChange={(e) => setDisplayNameNative(e.target.value)}
                placeholder="বাংলা নাম"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Given Name</label>
              <Input value={givenName} onChange={(e) => setGivenName(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Family Name</label>
              <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value={Gender.UNDISCLOSED}>Undisclosed</option>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone</label>
              <Input
                type="tel"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Email</label>
              <Input
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Employment Information */}
        {employmentId && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Briefcase className="w-4 h-4 text-[#0F766E]" />
              Employment Details ({employeeNumber})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Job Category</label>
                <select
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value as JobCategory)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={JobCategory.MANAGEMENT}>Management</option>
                  <option value={JobCategory.STAFF}>Staff</option>
                  <option value={JobCategory.OPERATOR}>Operator</option>
                  <option value={JobCategory.WORKER}>Worker</option>
                  <option value={JobCategory.CONTRACTOR}>Contractor</option>
                  <option value={JobCategory.EXECUTIVE}>Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmploymentStatus)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value={EmploymentStatus.ACTIVE}>Active</option>
                  <option value={EmploymentStatus.PREBOARDING}>Preboarding</option>
                  <option value={EmploymentStatus.ON_LEAVE}>On Leave</option>
                  <option value={EmploymentStatus.SEPARATED}>Separated</option>
                  <option value={EmploymentStatus.INACTIVE}>Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Join Date</label>
                <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/people/${personId}`}>
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-1.5" />
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
