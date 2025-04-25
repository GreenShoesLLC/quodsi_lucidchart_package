/**
 * LucidDataActionUtility
 * 
 * This utility handles the OAuth workaround needed for performDataAction calls.
 * It ensures the OAuth workaround is triggered only once during the application lifecycle.
 */

/**
 * Interface for data action parameters
 */
export interface DataActionParams {
    dataConnectorName: string;
    actionName: string;
    actionData: any;
    asynchronous: boolean;
}

/**
 * Utility class for performing data actions with the Lucid API
 */
export class LucidDataActionUtility {
    private static hasTriggeredOauth: boolean = false;

    /**
     * Performs a data action with the necessary OAuth workaround
     * 
     * @param client The Lucid client instance
     * @param params Parameters for the data action
     * @returns The result of the data action
     */
    public static async performDataAction(
        client: any,
        params: DataActionParams
    ): Promise<any> {
        // Check if we need to trigger OAuth first
        if (!this.hasTriggeredOauth) {
            try {
                console.log("Triggering OAuth workaround before performDataAction");
                await client.oauthXhr("lucid", {
                    url: "https://api.lucid.co/folders/search",
                    headers: {
                        "Lucid-Api-Version": "1",
                        "Content-Type": "application/json",
                    },
                    data: "{}",
                    method: "POST",
                });
                
                // Mark that we've triggered OAuth
                this.hasTriggeredOauth = true;
                console.log("Successfully triggered OAuth workaround");
            } catch (error) {
                console.error("Error triggering OAuth workaround:", error);
                // We'll still try to continue with the data action
            }
        }

        // Now perform the actual data action
        return await client.performDataAction(params);
    }

    /**
     * Resets the OAuth trigger status
     * This can be useful for testing or if the session needs to be refreshed
     */
    public static resetOauthTriggerStatus(): void {
        this.hasTriggeredOauth = false;
        console.log("OAuth trigger status has been reset");
    }
}
