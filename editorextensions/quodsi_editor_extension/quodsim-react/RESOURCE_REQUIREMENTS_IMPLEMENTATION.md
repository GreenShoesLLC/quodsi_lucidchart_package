# Resource Requirements UI

LucidChart renders quodsi_studio's shared requirement editor, compiled into
this bundle from source (see adapters/useReferenceDataAccessor.ts for how the
panel's referenceData and RESOURCE_REQUIREMENTS_UPDATE route feed it).

- UX and component design: `docs/superpowers/specs/2026-08-22-resource-requirement-editor-design.md` (monorepo)
- Lucid adoption: `docs/superpowers/specs/2026-08-22-lucid-requirement-editor-adoption-design.md` (monorepo)

Storage is unchanged: `q_res_requirements` holds custom requirements only;
the extension mints auto-requirements (id === resource id) on load.
