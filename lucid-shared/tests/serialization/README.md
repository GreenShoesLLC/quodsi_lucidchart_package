# Serialization tests

`ModelSerializer.snapshot.test.ts` serializes each fixture model from
`../__fixtures__/models/valid` and compares the result with
`__fixtures__/expectedJson/<name>.json`. Timestamps and generated action ids
are normalized away before comparing (see `normalizeForComparison`).

The fixture models are listed twice: in `generateFixtures.ts` (what gets
written) and in the snapshot test's `TEST_CASES` (what gets compared). Add a
new model to both.

```bash
npm run test:verify-snapshots                                  # compare all
npm run test:update-snapshots                                  # rewrite all
npm run test:update-single-snapshot -- model_def_e1_a2_r2_g1   # rewrite one or more
```

Regenerate only for an intentional serialization change, and review the
fixture diff: every changed line should be explained by that change.
