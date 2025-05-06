// src/utils/authFetch.ts
import { apiConfig } from './authConfig';

/**
 * Utility function for making authenticated API requests
 * 
 * @param getAccessToken Function to get a valid access token
 * @param endpoint API endpoint to call (will be appended to baseUrl)
 * @param options Fetch options
 * @returns Promise with the response data
 */
export async function authFetch<T>(
  getAccessToken: () => Promise<string | null>,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No authentication token available. Please sign in again.');
  }

  const url = `${apiConfig.baseUrl}${endpoint}`;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to get error details from the response
      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {
        errorDetail = await response.text() || `HTTP ${response.status}`;
      }

      throw new Error(`API request failed: ${errorDetail}`);
    }

    // For 204 No Content responses, return an empty object
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    console.error(`API error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Create a utility with bound access token function for easier reuse
 */
export function createAuthFetch(getAccessToken: () => Promise<string | null>) {
  return <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    return authFetch<T>(getAccessToken, endpoint, options);
  };
}

/**
 * Helper for GET requests
 */
export function createAuthGet(getAccessToken: () => Promise<string | null>) {
  const fetch = createAuthFetch(getAccessToken);
  return <T>(endpoint: string): Promise<T> => {
    return fetch<T>(endpoint, { method: 'GET' });
  };
}

/**
 * Helper for POST requests
 */
export function createAuthPost(getAccessToken: () => Promise<string | null>) {
  const fetch = createAuthFetch(getAccessToken);
  return <T>(endpoint: string, data: any): Promise<T> => {
    return fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}

/**
 * Helper for PUT requests
 */
export function createAuthPut(getAccessToken: () => Promise<string | null>) {
  const fetch = createAuthFetch(getAccessToken);
  return <T>(endpoint: string, data: any): Promise<T> => {
    return fetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };
}

/**
 * Helper for DELETE requests
 */
export function createAuthDelete(getAccessToken: () => Promise<string | null>) {
  const fetch = createAuthFetch(getAccessToken);
  return <T>(endpoint: string): Promise<T> => {
    return fetch<T>(endpoint, { method: 'DELETE' });
  };
}