# Model fixtures

Domain `ModelDefinition` builders used by the serialization snapshot tests.

- `valid/` — models that should validate and serialize. The
  `model_def_e<entities>_a<activities>_r<resources>_g<generators>.ts` files
  are thin calls into `generators/template_generator.ts`
  (`createModelDefinition(config, index)`); `sequential_flow.ts`,
  `non_sequential_flow.ts` and `model_def_mixed_distributions.ts` are
  hand-built. `valid/index.ts` re-exports the generated ones.

To add a model: add a builder under `valid/`, export it, then register it in
`tests/serialization/generateFixtures.ts` and in the snapshot test's
`TEST_CASES`, and generate its snapshot (see `tests/serialization/README.md`).
