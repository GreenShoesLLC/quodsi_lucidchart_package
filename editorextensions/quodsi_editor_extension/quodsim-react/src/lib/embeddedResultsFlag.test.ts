import { isEmbeddedResultsEnabled } from './embeddedResultsFlag';

describe('isEmbeddedResultsEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to true when localStorage key is unset', () => {
    expect(isEmbeddedResultsEnabled()).toBe(true);
  });

  it("returns false only when key is exactly 'false'", () => {
    localStorage.setItem('quodsi_embedded_results', 'false');
    expect(isEmbeddedResultsEnabled()).toBe(false);
  });

  it("returns true when key is 'true'", () => {
    localStorage.setItem('quodsi_embedded_results', 'true');
    expect(isEmbeddedResultsEnabled()).toBe(true);
  });
});
