'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface OrganizationSummary {
  id: string;
  name: string;
  displayName: string | null;
  code: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  isDefault: boolean;
}

interface ActiveOrgContextType {
  organizations: OrganizationSummary[];
  activeOrg: OrganizationSummary | null;
  activeOrgId: string | null;
  setActiveOrgId: (id: string) => void;
  isLoading: boolean;
}

const ActiveOrgContext = createContext<ActiveOrgContextType>({
  organizations: [],
  activeOrg: null,
  activeOrgId: null,
  setActiveOrgId: () => {},
  isLoading: true,
});

const ACTIVE_ORG_STORAGE_KEY = 'hr_active_org_id';

export function ActiveOrgProvider({
  children,
  initialOrganizations = [],
}: {
  children: React.ReactNode;
  initialOrganizations?: OrganizationSummary[];
}) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(initialOrganizations);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          const orgList: OrganizationSummary[] = data.organizations || [];
          setOrganizations(orgList);

          // Restore saved preference or fallback to default
          let savedOrgId = null;
          try {
            savedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
          } catch {
            // Ignore storage errors
          }

          const matchedSaved = orgList.find((o) => o.id === savedOrgId);
          if (matchedSaved) {
            setActiveOrgIdState(matchedSaved.id);
          } else if (orgList.length > 0) {
            const def = orgList.find((o) => o.isDefault) || orgList[0];
            if (def) {
              setActiveOrgIdState(def.id);
            }
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadOrgs();
  }, []);

  const setActiveOrgId = useCallback((id: string) => {
    setActiveOrgIdState(id);
    try {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, id);
      document.cookie = `hr_org_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore storage errors
    }
  }, []);

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || organizations[0] || null;

  return (
    <ActiveOrgContext.Provider
      value={{
        organizations,
        activeOrg,
        activeOrgId,
        setActiveOrgId,
        isLoading,
      }}
    >
      {children}
    </ActiveOrgContext.Provider>
  );
}

export function useActiveOrg() {
  return useContext(ActiveOrgContext);
}
