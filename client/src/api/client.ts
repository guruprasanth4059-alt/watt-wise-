const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('wattwise_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, delete Content-Type so the browser sets the boundary automatically
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If not already on login or public page, redirect
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup') && window.location.pathname !== '/') {
      localStorage.removeItem('wattwise_token');
      localStorage.removeItem('wattwise_user');
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'An unexpected error occurred. Please try again.', response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData
    })
};
