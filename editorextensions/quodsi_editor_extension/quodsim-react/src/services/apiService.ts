// src/services/apiService.ts
import { coreApiConfig } from '../config';

/**
 * Service for making authenticated API requests to the Quodsi backend
 */
export class ApiService {
    private static instance: ApiService;
    private getAccessTokenCallback: () => Promise<string | null>;

    private constructor(getAccessToken: () => Promise<string | null>) {
        this.getAccessTokenCallback = getAccessToken;
    }

    /**
     * Get the singleton instance of ApiService
     */
    public static getInstance(getAccessToken?: () => Promise<string | null>): ApiService {
        if (!ApiService.instance && getAccessToken) {
            ApiService.instance = new ApiService(getAccessToken);
        }

        if (!ApiService.instance) {
            throw new Error('ApiService not initialized. Call with getAccessToken first.');
        }

        return ApiService.instance;
    }

    /**
     * Set a new token callback (useful after re-authentication)
     */
    public setAccessTokenCallback(getAccessToken: () => Promise<string | null>): void {
        this.getAccessTokenCallback = getAccessToken;
    }

    /**
     * Make an authenticated API request
     */
    private async fetchWithAuth(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const token = await this.getAccessTokenCallback();

        if (!token) {
            throw new Error('No authentication token available');
        }

        const url = `${coreApiConfig.baseUrl}${endpoint}`;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        return fetch(url, {
            ...options,
            headers,
        });
    }

    /**
     * Generic API request with error handling
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        try {
            const response = await this.fetchWithAuth(endpoint, options);

            if (!response.ok) {
                // Try to get error details from the response
                let errorDetail = '';
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
     * GET request
     */
    public async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    public async post<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    public async put<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    public async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    /**
     * Check server connection and authentication
     */
    public async checkConnection(): Promise<{ status: string }> {
        return this.get<{ status: string }>('/api/status');
    }

    /**
     * Get user profile from API
     */
    public async getUserProfile(): Promise<{ id: string; name: string; email: string }> {
        return this.get<{ id: string; name: string; email: string }>('/api/profile');
    }
}