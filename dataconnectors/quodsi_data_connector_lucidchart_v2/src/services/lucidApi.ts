// src/services/lucidApi.ts
import axios from 'axios';

export class LucidApiService {
    private baseURL: string;

    constructor(baseUrl: string) {
        if (!baseUrl) {
            throw new Error('baseUrl is required for LucidApiService');
        }
        this.baseURL = baseUrl;
    }

    async simulateDocument(documentId: string, pageId: string, userId: string, authToken?: string): Promise<boolean> {
        try {
            const url = `${this.baseURL}Lucid/simulate/${documentId}?pageId=${pageId}&userId=${userId}`;
            const headers: Record<string, string> = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await axios({
                method: 'POST',
                url,
                headers
            });

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error in simulateDocument:', error);
            throw error;
        }
    }

    async getActivityUtilization(documentId: string, userId: string): Promise<string> {
        try {
            const blobName = `${userId}/activity_utilization.csv`;
            const url = `${this.baseURL}Lucid/files/${documentId}/${blobName}`;

            const response = await axios({
                method: 'GET',
                url,
                responseType: 'text'
            });

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error in getActivityUtilization:', error);
            throw error;
        }
    }

    async getSimulationStatus(documentId: string): Promise<any> {
        try {
            const url = `${this.baseURL}Lucid/status/${documentId}`;
            const response = await axios({
                method: 'GET',
                url,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error in getSimulationStatus:', error);
            throw error;
        }
    }
}

export function createLucidApiService(baseUrl: string): LucidApiService {
    return new LucidApiService(baseUrl);
}