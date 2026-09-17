import { getLogger } from '@quodsi/lucid-shared';
import { AuthHandler } from '../core/messaging/handlers/authHandler';

/**
 * LucidDataActionUtility
 *
 * The single entry point for data-connector calls (performDataAction).
 *
 * The data connector authenticates with the `kinde` OAuth provider
 * (manifest `oauthProviderName`), and Lucid attaches the signed-in user's
 * Kinde token to each request. That token comes from sign-in
 * (AuthHandler: getOAuthToken('kinde')).
 *
 * History: until 2026-04-17 the connector used a `lucid` provider, and Lucid
 * support's "temporary workaround" was to call oauthXhr('lucid', ...) once
 * before performDataAction so that provider had a token. Once the connector
 * moved to `kinde` that call primed a provider nothing used, and its consent
 * dialog collided with other dialogs (sign-in, the Studies modal). Removed
 * 2026-09-17, with the `lucid` provider itself, on Lucid's own answer
 * (community.lucid.co thread 14017): the workaround is obsolete, and
 * performDataAction authorizes a custom provider by itself. Their other
 * standing rule: never trigger an auth dialog while a modal is open.
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
    /**
     * Performs a data action. Before Kinde sign-in there is no token for the
     * connector to carry, so such a call is logged; callers that need a token
     * wait for auth-ready (RightDockPanel, AnalyticsHandler).
     *
     * @param client The Lucid client instance
     * @param params Parameters for the data action
     * @returns The result of the data action
     */
    public static async performDataAction(
        client: any,
        params: DataActionParams
    ): Promise<any> {
        if (!AuthHandler.getIsAuthenticated()) {
            log.warn(`Data action ${params.actionName} before Kinde sign-in; the request carries no token`);
        }
        return await client.performDataAction(params);
    }
}
