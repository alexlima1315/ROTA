import { readSessionToken } from './session';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!API_BASE_URL) throw new Error('Configure EXPO_PUBLIC_API_URL com a URL HTTPS da API.');
  const token = await readSessionToken();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
