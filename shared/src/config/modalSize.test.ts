import {
  DEFAULT_MODAL_SIZE,
  MODAL_SIZE_DIMENSIONS,
  MODAL_SIZE_OPTIONS,
} from './modalSize';

describe('modalSize config', () => {
  it('defaults to xlarge', () => {
    expect(DEFAULT_MODAL_SIZE).toBe('xlarge');
  });

  it('has pixel dimensions for the three fixed sizes', () => {
    expect(MODAL_SIZE_DIMENSIONS.medium).toEqual({ width: 1000, height: 700 });
    expect(MODAL_SIZE_DIMENSIONS.large).toEqual({ width: 1400, height: 900 });
    expect(MODAL_SIZE_DIMENSIONS.xlarge).toEqual({ width: 1600, height: 1000 });
  });

  it('offers all four sizes (including fullscreen) as options', () => {
    const values = MODAL_SIZE_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['medium', 'large', 'xlarge', 'fullscreen']);
    MODAL_SIZE_OPTIONS.forEach((o) => expect(o.label).toBeTruthy());
  });
});
