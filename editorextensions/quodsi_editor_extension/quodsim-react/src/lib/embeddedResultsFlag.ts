/**
 * Whether "View Results" opens the embedded Studio viewer (Path 1) vs the
 * legacy quodsim-react ModalResultsView. Default ON. Manual fallback:
 * set localStorage quodsi_embedded_results = 'false'.
 */
export function isEmbeddedResultsEnabled(): boolean {
  try {
    return localStorage.getItem('quodsi_embedded_results') !== 'false';
  } catch {
    return true;
  }
}
