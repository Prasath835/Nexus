const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const TOKEN_STORAGE_KEY = 'aethelgard_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export interface ApiEnvelope<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  let payload: ApiEnvelope<T>;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Network or server parsing error occurred.');
  }

  if (!response.ok || !payload.success) {
    const errMsg = payload.message || (payload.errors && payload.errors[0]) || 'Request failed';
    throw new Error(errMsg);
  }

  return payload;
}
