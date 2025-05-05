import { AuthState, SubscriptionState } from './RouterTypes';

/**
 * Manages application state within the router
 */
export class RouterState {
  /**
   * Cached authentication state
   */
  private authState: AuthState = {
    isAuthenticated: false
  };

  /**
   * Cached subscription state
   */
  private subscriptionState: SubscriptionState = {};
  
  /**
   * Get the current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }
  
  /**
   * Update the authentication state
   */
  public updateAuthState(state: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...state };
  }
  
  /**
   * Get the current subscription state
   */
  public getSubscriptionState(): SubscriptionState {
    return { ...this.subscriptionState };
  }
  
  /**
   * Update the subscription state
   */
  public updateSubscriptionState(state: Partial<SubscriptionState>): void {
    this.subscriptionState = { ...this.subscriptionState, ...state };
  }
  
  /**
   * Check if we have sufficient subscription data to send
   */
  public hasSubscriptionData(): boolean {
    return !!(this.subscriptionState.tier && this.subscriptionState.status);
  }
}
