const TOKEN_KEY = 'reseller_auth_token';
const PROJECT_NAME_KEY = 'reseller_project_name';
const RESELLER_ID_KEY = 'current_reseller_id';
const RESELLER_EMAIL_KEY = 'current_reseller_email';

export function saveResellerToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getResellerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveResellerId(id: string): void {
  localStorage.setItem(RESELLER_ID_KEY, id);
}

export function getResellerId(): string | null {
  return localStorage.getItem(RESELLER_ID_KEY);
}

export function saveResellerEmail(email: string): void {
  localStorage.setItem(RESELLER_EMAIL_KEY, email);
}

export function getResellerEmail(): string | null {
  return localStorage.getItem(RESELLER_EMAIL_KEY);
}

export function clearResellerToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROJECT_NAME_KEY);
  localStorage.removeItem(RESELLER_ID_KEY);
  localStorage.removeItem(RESELLER_EMAIL_KEY);
}

export function saveProjectName(projectName: string): void {
  localStorage.setItem(PROJECT_NAME_KEY, projectName);
}

export function getProjectName(): string {
  return localStorage.getItem(PROJECT_NAME_KEY) || 'Plataforma';
}

export function getAuthHeaders(): HeadersInit {
  const token = getResellerToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function resellerFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getResellerToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
