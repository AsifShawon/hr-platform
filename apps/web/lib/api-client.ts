/**
 * Normalized API Client for Fastify Backend
 * Provides typed requests, consistent error normalization, and session handling.
 */

export class ApiError extends Error {
  statusCode: number;
  errors?: Record<string, any>;

  constructor(message: string, statusCode = 500, errors?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method: customConfig.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized, redirect to login unless on public / activate route
    if (response.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname !== '/login' && pathname !== '/activate' && pathname !== '/') {
        window.location.href = '/login';
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.message || errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData.errors,
        );
      } else {
        const text = await response.text();
        throw new ApiError(
          text || `Request failed with status ${response.status}`,
          response.status,
        );
      }
    }

    return isJson ? ((await response.json()) as T) : ({} as unknown as T);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network communication error.', 0);
  }
}
