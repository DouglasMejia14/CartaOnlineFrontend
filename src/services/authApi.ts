import type { AuthUser } from '../lib/auth';
import { authHeaders } from '../lib/auth';

const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface AuthResponse {
  token: string;
  usuario: AuthUser;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export const authApi = {
  login: (email: string, password: string) =>
    post<AuthResponse>('/api/auth/login', { email, password }),

  register: (nombre: string, apellido: string, email: string, password: string) =>
    post<AuthResponse>('/api/auth/register', { nombre, apellido, email, password }),

  completeOnboarding: async (): Promise<void> => {
    const res = await fetch(`${BASE}/api/users/me/onboarding`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? `Error ${res.status}`);
    }
  },
};
