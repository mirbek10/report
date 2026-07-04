import axios, { type AxiosInstance } from 'axios';

const STORAGE_KEY = 'onchet_api_url';

export function getStoredApiUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function saveApiUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/$/, ''));
}

export function clearApiUrl() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Creates an Axios instance pointing at the user's personal MockAPI base URL.
 * Called once at app startup and re-created if the user changes their URL.
 */
export function createApiClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL: baseURL.trim().replace(/\/$/, ''),
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
}

// Singleton — replaced when the user changes their API URL
let _client: AxiosInstance = createApiClient(getStoredApiUrl() || 'http://localhost');

export function getApiClient(): AxiosInstance {
  return _client;
}

export function setApiClient(baseURL: string) {
  saveApiUrl(baseURL);
  _client = createApiClient(baseURL);
}
