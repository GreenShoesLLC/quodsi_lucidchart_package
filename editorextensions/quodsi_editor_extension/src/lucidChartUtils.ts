import { Viewport, ItemProxy, EditorClient, PageProxy } from 'lucid-extension-sdk';
import { LucidChartMessage } from './LucidChartMessage';
import { Model } from './models/model';
import { SimulationObjectType } from './models/enums';
import { PeriodUnit } from './models/enums/PeriodUnit';
import { SimulationTimeType } from './models/enums/simulation_time_type';

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
    static generateSimpleUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    static setPageCustomData(activePage: PageProxy): Model | null {
        // Create a q_data object conforming to the Model type
        const q_data: Model = {
            id: LucidChartUtils.generateSimpleUUID(), // Generate a new UUID-like string
            name: "Model1",
            type: SimulationObjectType.Model,
            reps: 0, // Provide default or example values
            forecastDays: 0, // Provide default or example values
            seed: 12345, // Default value
            oneClockUnit: PeriodUnit.MINUTES, // Default value
            simulationTimeType: SimulationTimeType.Clock, // Default value
            warmupClockPeriod: 0.0, // Default value
            warmupClockPeriodUnit: PeriodUnit.MINUTES, // Default value
            runClockPeriod: 0.0, // Default value
            runClockPeriodUnit: PeriodUnit.MINUTES, // Default value
            warmupDateTime: null, // Default value
            startDateTime: null, // Default value
            finishDateTime: null // Default value
        };

        console.log('Extension: setting Page q_data');
        // Add the q_data property to the page
        activePage.shapeData.set('q_data', JSON.stringify(q_data));
        console.log('Extension: successfully set Page q_data');

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