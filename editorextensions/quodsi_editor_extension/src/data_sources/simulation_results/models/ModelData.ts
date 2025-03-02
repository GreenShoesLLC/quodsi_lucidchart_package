import { MapProxy } from 'lucid-extension-sdk';

/**
 * Interface representing data from the Models collection
 */
export interface ModelData {
  documentId: string;
  userId: string;
  pageId: string;
}

/**
 * Converts raw collection item data to a strongly typed ModelData object
 * @param itemFields MapProxy of field name to field value from the collection item
 * @returns Strongly typed ModelData object
 */
export function mapToModelData(itemFields: MapProxy<string, any>): ModelData {
  return {
    documentId: itemFields.get('documentId') as string,
    userId: itemFields.get('userId') as string,
    pageId: itemFields.get('pageId') as string
  };
}