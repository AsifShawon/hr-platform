/**
 * Centralized Query Keys Factory for TanStack Query
 * Ensures predictable cache keys and granular cache invalidation across the app.
 */

export const queryKeys = {
  // Authentication & Session
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },

  // People & Workers Registry
  people: {
    all: ['people'] as const,
    list: (filters: Record<string, any>) => ['people', 'list', filters] as const,
    detail: (id: string) => ['people', 'detail', id] as const,
    photo: (id: string) => ['people', 'photo', id] as const,
    readiness: (employmentId: string) => ['people', 'readiness', employmentId] as const,
  },

  // Cards, Templates & Print Jobs
  cards: {
    all: ['cards'] as const,
    stats: ['cards', 'stats'] as const,
    templates: {
      all: ['cards', 'templates'] as const,
      list: (filters?: Record<string, any>) => ['cards', 'templates', 'list', filters] as const,
      detail: (id: string) => ['cards', 'templates', 'detail', id] as const,
      assignments: ['cards', 'templates', 'assignments'] as const,
    },
    issues: {
      all: ['cards', 'issues'] as const,
      list: (filters?: Record<string, any>) => ['cards', 'issues', 'list', filters] as const,
      detail: (id: string) => ['cards', 'issues', 'detail', id] as const,
      lineage: (workerId: string) => ['cards', 'issues', 'lineage', workerId] as const,
    },
    printJobs: {
      all: ['cards', 'print-jobs'] as const,
      list: (filters?: Record<string, any>) => ['cards', 'print-jobs', 'list', filters] as const,
      detail: (id: string) => ['cards', 'print-jobs', 'detail', id] as const,
    },
    batchReadiness: (ids: string[]) => ['cards', 'readiness', 'batch', ids] as const,
  },

  // Organizations & Hierarchy
  organizations: {
    all: ['organizations'] as const,
    list: ['organizations', 'list'] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
    tree: (orgId?: string) => ['organizations', 'tree', orgId] as const,
    locations: (orgId?: string) => ['organizations', 'locations', orgId] as const,
    roles: ['organizations', 'roles'] as const,
    users: ['organizations', 'users'] as const,
  },

  // System & Health
  system: {
    status: ['system', 'status'] as const,
    health: ['system', 'health'] as const,
    diagnostics: ['system', 'diagnostics'] as const,
    backups: ['system', 'backups'] as const,
  },

  // Audit Logs
  audit: {
    all: ['audit'] as const,
    list: (filters?: Record<string, any>) => ['audit', 'list', filters] as const,
  },
} as const;
