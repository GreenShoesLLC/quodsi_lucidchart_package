import { getLogger } from '@quodsi/lucid-shared';
import { AuthHandler } from '../core/messaging/handlers/authHandler';

/**
 * LucidDataActionUtility
 *
 * This utility handles the OAuth workaround needed for performDataAction calls.
 * It ensures the OAuth workaround is triggered only once during the application lifecycle.
 */

const log = getLogger('LucidDataActionUtility');

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
    /** The in-flight OAuth workaround, shared so concurrent data actions
     *  (e.g. the Studies open's upsert + snapshot push) trigger it once. */
    private static oauthInFlight: Promise<void> | null = null;

    /**
     * Run the Lucid-provider OAuth workaround once per session, before any
     * data action.
     *
     * Lucid support (see _docs/Lucid Questions.md): oauthXhr must be called
     * once before performDataAction works. The first call is what raises
     * Lucid's "authorize Quodsi" consent dialog, and Lucid does not stack
     * dialogs -- so a caller about to open a modal awaits this FIRST
     * (SimulationRunHandler.handleOpenStudiesModal), rather than letting the
     * consent prompt collide with its own modal.
     *
     * Only once Kinde auth is established, though -- before that the
     * lucid-provider flow competes with the sign-in dialog and, for a local
     * package, fails and makes Lucid suppress the Kinde prompt (2026-08-27).
     * A failure is logged and not remembered, so the next call tries again.
     */
    public static ensureLucidOauth(client: any): Promise<void> {
        if (this.hasTriggeredOauth || !AuthHandler.getIsAuthenticated()) {
            return Promise.resolve();
        }
        if (!this.oauthInFlight) {
            this.oauthInFlight = (async () => {
                try {
                    await client.oauthXhr("lucid", {
                        url: "https://api.lucid.co/folders/search",
                        headers: {
                            "Lucid-Api-Version": "1",
                            "Content-Type": "application/json",
                        },
                        data: "{}",
                        method: "POST",
                    });
                    this.hasTriggeredOauth = true;
                } catch (error) {
                    log.error("Error triggering OAuth workaround:", error);
                    // The data action still runs; the next one retries this.
                } finally {
                    this.oauthInFlight = null;
                }
            })();
        }
        return this.oauthInFlight;
    }

    /**
     * Performs a data action after the OAuth workaround (see ensureLucidOauth).
     *
     * @param client The Lucid client instance
     * @param params Parameters for the data action
     * @returns The result of the data action
     */
    public static async performDataAction(
        client: any,
        params: DataActionParams
    ): Promise<any> {
        await this.ensureLucidOauth(client);
        return await client.performDataAction(params);
    }

    /**
     * Resets the OAuth trigger status
     * This can be useful for testing or if the session needs to be refreshed
     */
    public static resetOauthTriggerStatus(): void {
        this.hasTriggeredOauth = false;
        this.oauthInFlight = null;
    }
}
