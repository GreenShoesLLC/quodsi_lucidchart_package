import { resolveModelName, formatStamp } from '../resolveModelName';

describe('resolveModelName', () => {
  const now = new Date(2026, 5, 14, 14, 30); // Jun 14 2026 2:30 PM (month is 0-based)

  it('replaces generic / empty titles with a timestamp name', () => {
    for (const t of ['', '   ', 'Blank diagram', 'blank', 'Default', 'Untitled', 'Untitled Document', 'untitled diagram', '  BLANK DIAGRAM  ']) {
      expect(resolveModelName(t, now)).toBe('Model — Jun 14, 2026 2:30 PM');
    }
    expect(resolveModelName(null, now)).toBe('Model — Jun 14, 2026 2:30 PM');
    expect(resolveModelName(undefined, now)).toBe('Model — Jun 14, 2026 2:30 PM');
  });

  it('respects a real user title (trimmed)', () => {
    expect(resolveModelName('Triage Clinic', now)).toBe('Triage Clinic');
    expect(resolveModelName('  Triage Clinic  ', now)).toBe('Triage Clinic');
  });

  it('formats 12-hour clock with AM/PM edges', () => {
    expect(formatStamp(new Date(2026, 5, 14, 0, 0))).toBe('Jun 14, 2026 12:00 AM');
    expect(formatStamp(new Date(2026, 5, 14, 12, 0))).toBe('Jun 14, 2026 12:00 PM');
    expect(formatStamp(new Date(2026, 11, 1, 9, 5))).toBe('Dec 1, 2026 9:05 AM');
  });
});
