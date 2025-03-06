// services/simulationData/csvParser.ts
import { parse } from 'papaparse';
import { getStorageService, conditionalLog, conditionalInfo, conditionalError, conditionalWarn } from './storageService';

/**
 * Fetches CSV data from Azure Blob Storage and parses it
 * @param containerName Azure container name
 * @param blobName Path to the CSV file in the container
 * @param documentId Document ID (for logging)
 * @param requiredColumns Array of column names that must be present in the CSV
 * @returns Parsed data as an array of objects
 */
export async function fetchCsvData<T>(
    containerName: string,
    blobName: string,
    documentId: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    try {
        // We don't need to prefix paths with documentId anymore
        const fullBlobPath = blobName;

        conditionalLog(`Fetching ${blobName} data for container ${containerName}...`);
        conditionalLog(`Full blob path: ${containerName}/${fullBlobPath}`);

        // Get storage service
        const storage = getStorageService();

        // Fetch CSV content from Azure Blob Storage
        const csvText = await storage.getBlobContent(containerName, fullBlobPath);

        if (!csvText) {
            conditionalWarn(`CSV data not found for ${fullBlobPath}`);
            // Try alternative paths based on naming conventions
            const alternativeBlobPath = `results/${blobName}`;
            conditionalLog(`Trying alternative path: ${containerName}/${alternativeBlobPath}`);

            const alternativeCSVText = await storage.getBlobContent(containerName, alternativeBlobPath);
            if (!alternativeCSVText) {
                conditionalWarn(`CSV data also not found at alternative path ${alternativeBlobPath}`);
                return [];
            }

            conditionalLog(`Found CSV at alternative path! Length: ${alternativeCSVText.length} characters`);
            conditionalLog(`CSV content preview: ${alternativeCSVText.substring(0, 100)}...`);

            // Use the alternative CSV text
            return parseAndValidateCsv(alternativeCSVText, blobName, requiredColumns);
        }

        conditionalLog(`Found CSV! Length: ${csvText.length} characters`);
        conditionalLog(`CSV content preview: ${csvText.substring(0, 100)}...`);

        return parseAndValidateCsv(csvText, blobName, requiredColumns);
    } catch (error) {
        conditionalError(`Error fetching ${blobName} data:`, error);
        throw error;
    }
}

/**
 * Helper function to parse and validate CSV data with duplicate header handling
 * @param csvText The CSV text to parse
 * @param blobName The name of the blob (for logging)
 * @param requiredColumns Array of column names that must be present in the CSV
 * @returns Parsed data as an array of objects
 */
function parseAndValidateCsv<T>(
    csvText: string,
    blobName: string,
    requiredColumns: string[] = []
): Promise<T[]> {
    return new Promise((resolve) => {
        // First check for duplicate headers
        const firstLineEnd = csvText.indexOf('\n');
        const headerLine = csvText.substring(0, firstLineEnd > 0 ? firstLineEnd : csvText.length);
        const headers = headerLine.split(',');

        // Check for and fix duplicate headers in the CSV content
        const headerCount = new Map<string, number>();
        let fixedCsvText = csvText;
        let duplicatesFound = false;

        // Count occurrences of each header
        headers.forEach(header => {
            const trimmedHeader = header.trim();
            headerCount.set(trimmedHeader, (headerCount.get(trimmedHeader) || 0) + 1);
        });

        // If we found duplicates, replace the header line
        const duplicateHeaders = Array.from(headerCount.entries())
            .filter(([_, count]) => count > 1);

        if (duplicateHeaders.length > 0) {
            duplicatesFound = true;
            conditionalWarn(`CSV ${blobName} has duplicate headers: ${duplicateHeaders.map(([header]) => header).join(', ')}`);

            // Create a new header line with renamed duplicates
            const newHeaders = headers.map((header, index) => {
                const trimmedHeader = header.trim();
                if (headerCount.get(trimmedHeader) > 1) {
                    // Find how many of this header we've seen so far
                    let count = 0;
                    for (let i = 0; i < index; i++) {
                        if (headers[i].trim() === trimmedHeader) {
                            count++;
                        }
                    }

                    // If this is not the first occurrence, add a suffix
                    if (count > 0) {
                        return `${trimmedHeader}_${count}`;
                    }
                }
                return trimmedHeader;
            });

            // Replace the header line in the CSV content
            fixedCsvText = `${newHeaders.join(',')}\n${csvText.substring(firstLineEnd + 1)}`;
            conditionalLog(`Fixed CSV headers: ${newHeaders.join(', ')}`);
        }

        // Now parse the CSV
        parse(fixedCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (duplicatesFound) {
                    conditionalLog(`Duplicate headers found and renamed.`);
                }

                const availableColumns = results.meta.fields || [];

                conditionalLog(`CSV ${blobName} parsed with ${results.data.length} rows`);
                conditionalLog(`CSV columns: ${availableColumns.join(', ')}`);

                // Validate that all required columns are present
                if (requiredColumns.length > 0) {
                    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));

                    if (missingColumns.length > 0) {
                        conditionalError(`CSV ${blobName} is missing required columns: ${missingColumns.join(', ')}`);
                        conditionalError(`Available columns: ${availableColumns.join(', ')}`);
                        throw new Error(`CSV ${blobName} is missing required columns: ${missingColumns.join(', ')}`);
                    }

                    // Log any extra columns as information
                    const extraColumns = availableColumns.filter(col => !requiredColumns.includes(col));
                    if (extraColumns.length > 0) {
                        conditionalInfo(`CSV ${blobName} contains extra columns not in interface: ${extraColumns.join(', ')}`);
                    }
                }

                resolve(results.data as T[]);
            },
            error: (error) => {
                conditionalError(`Error parsing CSV ${blobName}:`, error);
                throw error;
            }
        });
    });
}

/**
 * Helper function to get required columns from a type
 * @param requiredProps Array of property names that are required
 * @returns Array of column names
 */
export function getRequiredColumnsFromType<T>(requiredProps: Array<keyof T> = []): string[] {
    return requiredProps.map(prop => String(prop));
}
