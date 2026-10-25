// The page's own model settings were listed by hand in three places, and two
// of them (Convert's parked-record overlay and the Advisor/tour page builder)
// had no `levers`, so a model-level lever was silently dropped there. All
// three now read one list built from the shared Model field roster.
import { readFileSync } from 'fs';
import { join } from 'path';
import { MODEL_FIELD_KEYS } from '@quodsi/lucid-shared';
import { MODEL_SETTINGS_KEYS } from '../../src/core/modelSettingsKeys';

const src = (rel: string) => readFileSync(join(__dirname, '../../src', rel), 'utf8');

describe('MODEL_SETTINGS_KEYS', () => {
  it('is every Model field except id, levers and every date included', () => {
    expect([...MODEL_SETTINGS_KEYS]).toEqual(MODEL_FIELD_KEYS.filter((k) => k !== 'id'));
    expect(MODEL_SETTINGS_KEYS).toEqual(expect.arrayContaining(['levers', 'warmupDateTime', 'finishDateTime']));
  });

  it.each(['core/ModelManager.ts', 'core/ModelPageBuilder.ts', 'services/conversion/LucidPageConversionService.ts'])(
    '%s reads the one list instead of keeping its own',
    (file) => {
      expect(src(file)).toMatch(/import \{[^}]*MODEL_SETTINGS_KEYS[^}]*\} from '[./]+(core\/)?modelSettingsKeys'/);
      expect(src(file)).not.toMatch(/const (RUN_SETTINGS_KEYS|PENDING_MODEL_KEYS|MODEL_SETTINGS_KEYS)\b/);
    },
  );
});
