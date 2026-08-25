'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Palette,
  Globe,
  Clock,
  MapPin,
  Mail,
  Phone,
  Hash,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Badge } from '@hr/ui';

interface OrganizationData {
  id: string;
  name: string;
  displayName: string | null;
  code: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  locale: string;
  timezone: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  employeeNumberRule?: {
    prefix: string;
    padLength: number;
    nextSequence: number;
  } | null;
}

export default function CompanySettingsPage() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#134E4A');
  const [secondaryColor, setSecondaryColor] = useState('#0F766E');
  const [accentColor, setAccentColor] = useState('#14B8A6');
  const [locale, setLocale] = useState('en-US');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [prefix, setPrefix] = useState('EMP-');
  const [padLength, setPadLength] = useState(4);
  const [nextSequence, setNextSequence] = useState(1001);

  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOrg = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        const firstOrg = data.organizations?.[0];
        if (firstOrg) {
          setOrg(firstOrg);
          setName(firstOrg.name || '');
          setDisplayName(firstOrg.displayName || '');
          setPrimaryColor(firstOrg.primaryColor || '#134E4A');
          setSecondaryColor(firstOrg.secondaryColor || '#0F766E');
          setAccentColor(firstOrg.accentColor || '#14B8A6');
          setLocale(firstOrg.locale || 'en-US');
          setTimezone(firstOrg.timezone || 'Asia/Dhaka');
          setStreet(firstOrg.address?.street || '');
          setCity(firstOrg.address?.city || '');
          setPostalCode(firstOrg.address?.postalCode || '');
          setCountry(firstOrg.address?.country || 'Bangladesh');
          setContactEmail(firstOrg.contactEmail || '');
          setContactPhone(firstOrg.contactPhone || '');
          if (firstOrg.employeeNumberRule) {
            setPrefix(firstOrg.employeeNumberRule.prefix || 'EMP-');
            setPadLength(firstOrg.employeeNumberRule.padLength || 4);
            setNextSequence(firstOrg.employeeNumberRule.nextSequence || 1001);
          }
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: 'error',
          text: data.message || 'Failed to load organization settings.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load organization settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Legal entity name is required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      name: name.trim(),
      displayName: displayName.trim() || null,
      primaryColor,
      secondaryColor,
      accentColor,
      locale,
      timezone,
      address: { street, city, postalCode, country },
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      employeeNumberRule: {
        prefix,
        padLength: Number(padLength),
        nextSequence: Number(nextSequence),
      },
    };

    try {
      let res: Response;
      if (org) {
        res = await fetch(`/api/organizations/${org.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const code =
          name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .slice(0, 20) || 'MAIN_ORG';
        res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, code }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Company profile and branding updated successfully.' });
        loadOrg();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update company settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while saving settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!org) {
      setMessage({
        type: 'error',
        text: 'Please save company settings first to establish organization identity before uploading a logo.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo file size exceeds 2MB limit.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingLogo(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/organizations/${org.id}/logo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Company logo uploaded and sanitized (EXIF stripped) successfully.',
        });
        setLogoTimestamp(Date.now());
        loadOrg();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to upload logo.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error uploading logo.' });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preview formatted employee number
  const sampleEmpNumber = `${prefix}${String(nextSequence).padStart(padLength, '0')}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#134E4A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-[#0F766E]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company Administration
            </h1>
            <p className="text-sm text-slate-500">
              Configure company profile, branding, logo, regional locale, and worker ID number
              formats.
            </p>
          </div>
        </div>
      </div>

      {/* Guided First-Run Banner if unconfigured */}
      {(!org?.displayName || !org?.contactEmail) && (
        <div className="rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2 rounded-xl bg-[#134E4A] text-white">
            <Sparkles className="w-5 h-5 text-[#14B8A6]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Guided First-Run Setup</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Welcome to the HR ID Platform! Complete your company profile, upload your official
              logo, and set brand colors below so your ID card templates and employee records render
              with your exact corporate identity.
            </p>
          </div>
        </div>
      )}

      {/* Status Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Logo & Brand Media Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Company Logo</h2>
            <p className="text-xs text-slate-500">
              Used in the navigation bar and printed on issued ID cards. Strips EXIF metadata
              automatically.
            </p>
          </div>
          <Badge variant="primary" size="sm">
            Max 2MB (PNG, JPG, WebP, SVG)
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {org?.logoPath ? (
              <img
                src={`/api/organizations/${org.id}/logo?t=${logoTimestamp}`}
                alt="Company Logo"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <Building2 className="w-10 h-10 text-slate-300" />
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {isUploadingLogo ? 'Processing Image...' : 'Upload Logo'}
              </Button>
              {org?.logoPath && (
                <Badge variant="success" size="sm">
                  Active Logo Installed
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Files are sanitized and stored in private storage outside public directories.
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Entity Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Entity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Legal Entity Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. London Boy Apparel Ltd."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display / Trade Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. London Boy Apparel"
              />
            </div>
          </div>
        </div>

        {/* Brand Palette */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#0F766E]" />
              <h2 className="text-base font-bold text-slate-900">Brand Palette</h2>
            </div>
            <span className="text-xs text-slate-500">
              Applied to printed cards and dashboard accents
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#134E4A"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#0F766E"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Accent Highlight
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#14B8A6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regional & Timezone */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Locale & Timezone
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary System Locale
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="en-US">English (United States) - en-US</option>
                <option value="bn-BD">Bengali / বাংলা (Bangladesh) - bn-BD</option>
                <option value="en-GB">English (United Kingdom) - en-GB</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Workspace Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <option value="Asia/Dhaka">Asia/Dhaka (UTC+06:00)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (UTC+05:30)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address & Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Address & Official Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Plot 42, Sector 3, Uttara C/A"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Dhaka"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code</label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 1230"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Contact Email
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@londonboyapparel.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Phone Number
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+88028901234"
              />
            </div>
          </div>
        </div>

        {/* Employee Number Rule */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-[#0F766E]" />
              <h2 className="text-base font-bold text-slate-900">Employee Number Format</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Live Preview:</span>
              <Badge variant="primary" size="md">
                {sampleEmpNumber}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prefix</label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="EMP-"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Zero-Padding Length
              </label>
              <Input
                type="number"
                min={2}
                max={10}
                value={padLength}
                onChange={(e) => setPadLength(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Next Sequence Number
              </label>
              <Input
                type="number"
                min={1}
                value={nextSequence}
                onChange={(e) => setNextSequence(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
            {isSaving ? 'Saving Changes...' : 'Save Company Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
