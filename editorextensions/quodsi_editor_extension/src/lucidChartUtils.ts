import { Viewport, ItemProxy, EditorClient, PageProxy, ERDBlockProxy, CustomBlockProxy } from 'lucid-extension-sdk';
import { LucidChartMessage } from './LucidChartMessage';
import { Model } from './models/model';
import { SimulationObjectType } from './models/enums';
import { PeriodUnit } from './models/enums/PeriodUnit';
import { SimulationTimeType } from './models/enums/simulation_time_type';
import { DefaultSimulationObjects } from './DefaultSimulationObjects';
import { QuodsiShapeData } from './QuodsiShapeData';

export class LucidChartUtils {
    public static readonly OBJECT_TYPE_KEY = 'q_objecttype';
    public static readonly DATA_KEY = 'q_data';

    /**
     * Gets the value of a specified shape data attribute from an item
     * @param item The ItemProxy to get the attribute from
     * @param attributeKey The key of the shape data attribute
     * @returns The value of the attribute, or undefined if not found or invalid
     */
    public static getShapeDataAttribute(item: ItemProxy, attributeKey: string): string | undefined {
        const attributeValue = item.shapeData.get(attributeKey);
        if (typeof attributeValue === 'string' || attributeValue === undefined) {
            console.log(`${attributeKey} value:`, attributeValue);
            return attributeValue;
        } else {
            console.error(`Invalid type for ${attributeKey}:`, typeof attributeValue);
            return undefined;
        }
    }

    /**
     * Gets the first selected item and its object type
     * @param client The LucidChart client object
     * @param firstSelectedItem Optional: A pre-selected item
     * @returns An object containing the first selected item and its object type
     */
    public static getFirstSelectedItemAndType(client: EditorClient, firstSelectedItem?: ItemProxy): {
        firstSelectedItem: ItemProxy | null,
        objectType: string | undefined
    } {
        let selectedItem = firstSelectedItem || null;

        if (!selectedItem) {
            const viewport = new Viewport(client);
            const selection = viewport.getSelectedItems();
            if (selection.length > 0) {
                selectedItem = selection[0];
            } else {
                console.error("No items selected");
                return { firstSelectedItem: null, objectType: undefined };
            }
        }

        const objectType = selectedItem
            ? LucidChartUtils.getShapeDataAttribute(selectedItem, LucidChartUtils.OBJECT_TYPE_KEY)
            : undefined;

        return { firstSelectedItem: selectedItem, objectType };
    }
    /**
     * Determines the q_objecttype value based on the number of selected items
     * @param items An array of ItemProxy objects
     * @returns The determined q_objecttype value
     */
    public static determineObjectTypeValue(items: ItemProxy[]): string {
        if (items.length === 0) {
            return 'nothing';
        } else if (items.length > 1) {
            return 'MoreThan1';
        } else {
            // There's exactly one item
            const singleItem = items[0];
            return LucidChartUtils.getShapeDataAttribute(singleItem, LucidChartUtils.OBJECT_TYPE_KEY) || 'undefined';
        }
    }

    static convertPage(page: PageProxy): boolean {
        for (const [blockId, block] of page.allBlocks) {
            if (block instanceof CustomBlockProxy) {
                if (block.isFromStencil('quodsi_shape_library', 'activity')) {
                    console.log('Found custom shape "my-shape": ' + block.id);
                }
            }
        }
        return true;
    }

    static generateSimpleUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Deletes the 'q_data' shapeData from the given PageProxy instance.
     * @param activePage - The PageProxy instance from which to delete the 'q_data'.
     * @returns A boolean indicating whether the 'q_data' was successfully deleted.
     */
    static deletePageCustomData(activePage: PageProxy): boolean {
        try {
            // Check if 'q_data' exists before attempting to delete
            if (activePage.shapeData.get('q_data')) {
                // Delete the 'q_data' property from the page
                activePage.shapeData.delete('q_data');
                console.log('Extension: successfully deleted Page q_data');
                return true;
            } else {
                console.log('Extension: q_data not found on the Page');
                return false;
            }
        } catch (error) {
            console.error('Extension: Error deleting Page q_data', error);
            return false;
        }
    }
    
    static setPageCustomData(activePage: PageProxy): Model | null {
        // Use DefaultSimulationObjects to create a default Model object
        const q_data: Model = DefaultSimulationObjects.initialModel();

        console.log('Extension: setting Page q_data');

        // Create an instance of QuodsiShapeData to manage shape data
        const shapeDataHandler = new QuodsiShapeData(activePage);

        // Set the object type and data using QuodsiShapeData
        shapeDataHandler.setObjectTypeAndData(SimulationObjectType.Model, q_data);

        console.log('Extension: successfully set Page q_data using QuodsiShapeData');

        // Return the q_data object
        return q_data;
    }

    static getOrCreatePageModel(viewport: Viewport, create_if_missing: boolean = false): Model | null {
        console.log('getOrCreatePageModel start');

        // 1. Get the active page
        const activePage: PageProxy | undefined = viewport.getCurrentPage();

        // Check if there's an active page
        if (!activePage) {
            console.error('No active page found');
            return null;
        }

        // 2. Get 'q_data' from the active page
        let q_data: Model | null = null;
        let storedData: any = activePage.shapeData.get('q_data');

        if (storedData) {
            // If q_data exists but is a string, parse it
            if (typeof storedData === 'string') {
                try {
                    q_data = JSON.parse(storedData);
                } catch (error) {
                    console.error('Error parsing q_data:', error);
                    return null;
                }
            } else {
                // If q_data is already an object, use it directly
                q_data = storedData as Model;
            }
        } else if (create_if_missing) {
            // If q_data is missing and create_if_missing is true, create new q_data
            q_data = LucidChartUtils.setPageCustomData(activePage);
        }

        // 3. Return the q_data object
        console.log('getOrCreatePageModel finish');
        return q_data;
    }


    // You can add more static methods here as needed
}