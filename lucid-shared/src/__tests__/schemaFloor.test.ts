import { MODEL_SCHEMA_VERSION } from '@quodsi/shared';
import {
  LUCID_MIN_MODEL_SCHEMA_VERSION,
  assertPackagedSchemaVersion,
} from '../constants/schemaFloor';

describe('schema floor', () => {
  it('the @quodsi/shared this build resolved clears the floor', () => {
    expect(() => assertPackagedSchemaVersion(MODEL_SCHEMA_VERSION)).not.toThrow();
  });

  it('throws on a version below the floor, naming both versions', () => {
    expect(() => assertPackagedSchemaVersion('2026.08.10')).toThrow(
      /2026\.08\.10.*2026\.08\.20/s
    );
  });

  it('accepts a version exactly at the floor', () => {
    expect(() =>
      assertPackagedSchemaVersion(LUCID_MIN_MODEL_SCHEMA_VERSION)
    ).not.toThrow();
  });

  it('rejects a malformed version rather than silently passing it', () => {
    expect(() => assertPackagedSchemaVersion('not-a-version')).toThrow(/not a valid/i);
  });
});

import * as fs from 'fs';
import * as path from 'path';

describe('build-bundle.ps1 floor duplication', () => {
  it('matches LUCID_MIN_MODEL_SCHEMA_VERSION', () => {
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../../deploy/lucid-package/build-bundle.ps1'),
      'utf8'
    );
    const match = script.match(/const FLOOR = '([\d.]+)';/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(LUCID_MIN_MODEL_SCHEMA_VERSION);
  });
});
