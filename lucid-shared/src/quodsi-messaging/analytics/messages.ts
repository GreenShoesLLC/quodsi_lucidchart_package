/** Event names fired from clients (React / extension). Must match the API allowlist. */
export type ClientAnalyticsEvent =
  | 'model_opened'
  | 'first_model_created'
  | 'results_viewed'
  | 'first_results_viewed';
