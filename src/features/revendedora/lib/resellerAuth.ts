const TOKEN_KEY = 'reseller_auth_token';

export function saveResellerToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getResellerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearResellerToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
