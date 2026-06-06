export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  onboardingCompleted?: boolean;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'usuario';
const ONBOARDING_KEY = 'onboarding_done';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, usuario: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function updateUser(updates: Partial<AuthUser>): void {
  const current = getUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...updates }));
}

/** Devuelve true si el usuario ya vio/saltó el tour (independiente del backend) */
export function hasSeenOnboarding(): boolean {
  const user = getUser();
  if (!user) return true;
  if (user.onboardingCompleted) return true;
  return localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`) === '1';
}

/** Marca el onboarding como visto en localStorage (clave permanente) y actualiza el usuario en sesión */
export function markOnboardingDone(): void {
  const user = getUser();
  if (user) localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, '1');
  updateUser({ onboardingCompleted: true });
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
