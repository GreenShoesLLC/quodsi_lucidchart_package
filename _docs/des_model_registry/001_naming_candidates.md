# DES Model Registry — Naming Candidates

Potential names for the DES Model Registry website, organized by theme.

## Community / Knowledge-Focused

- **SimVault** — a vault of simulation knowledge
- **SimCommons** — echoes "Creative Commons," signals open/shared
- **ModelForge** — where models are crafted and shaped
- **SimLore** — the collected wisdom/lore of simulation practitioners

## Registry / Catalog-Focused

- **SimIndex** — straightforward, implies comprehensive catalog
- **ModelAtlas** — maps the landscape of DES models
- **SimCatalog** — does what it says

## Discovery / Exploration-Focused

- **SimSeed** — models as starting points that grow (ties to the "stub principle")
- **ModelScout** — find and discover models
- **SimShelf** — the Netflix analogy, browsing a shelf of titles

## Mission-Driven

- **OpenSim Registry** — leads with the open/free philosophy (note: "OpenSim" has existing associations in virtual worlds)
- **SimForAll** — directly echoes the democratization mission
- **EveryModel** — simple, inclusive

## Blueprint-Anchored

Names built around **blueprint** — the word already adopted as the central schema table (`blueprint`) in `database_design/000_overview.md`. A blueprint is a plan for building something, not the thing itself, which matches what a SimVault entry actually is.

- **SimBlueprint** / **SimBlueprints** (plural) — pairs the simulation anchor with a collection framing familiar from Hugging Face
- **BlueprintRegistry** — most literal; inherits the "model registry" framing already in `quodsi_lucidchart_package/_docs/des_model_registry/`
- **BlueprintHub** — community gathering place
- **BlueprintAtlas** — maps the landscape of simulation blueprints
- **BlueprintLibrary** — the librarian metaphor; each blueprint is a catalogued work
- **BlueprintShelf** — Netflix-style browsing metaphor
- **BlueprintCommons** — echoes Creative Commons
- **BlueprintForge** / **BlueprintStudio** / **BlueprintWorks** — craft/workshop framing
- **OpenBlueprint** — leads with the open-access philosophy

## Scaffold-Anchored

Names built around **scaffold** — the strongest synonym to "blueprint" explored so far. A scaffold is a temporary-but-load-bearing structure you build *on*, not the finished building. The metaphor encodes the **stub principle** directly in the name: every SimVault entry is a starting point that users extend in their own modeling technology.

The scaffold metaphor has independent meaning in four different knowledge domains — all of which map onto SimVault's positioning:

1. **Construction** — temporary access structure that lets workers build the real thing
2. **Software** — generated starter code (Rails `scaffold`, Yeoman, `create-react-app`) that developers customize
3. **Education** (Vygotsky / ZPD) — structured support that a learner uses to accomplish what they couldn't alone
4. **Drug discovery** — a molecular scaffold is the fixed core around which variations are tried (this maps especially cleanly onto the blueprint → variants → `model_definition` relationship)

### Sim-anchored variants
- **SimScaffold** / **SimScaffolds** — product name + collection framing; locates in the simulation world
- **ScaffoldSim** — reverse compound; feels more tool/product-shaped than catalog-shaped

### Alternate anchors (non-"sim") paired with scaffold
- **FlowScaffold** — "flow" is the universal unifying abstraction across DES content (patient flow, order flow, passenger flow, perioperative flow). Accessible to OR directors, clinic administrators, and warehouse managers who may not self-identify as "simulation" people. Narrower than "sim" in the right way — excludes agent-based/continuous/SD methods that SimVault is not scoped to.
- **ProcessScaffold** — broadest operational framing; recognizable to Lean/Six Sigma and consulting audiences
- **EventScaffold** — leans hardest into the DES-purity signal (discrete-event, not agent-based or continuous)
- **OpsScaffold** — short and modern; operations-research heritage; minor DevOps collision
- **DESScaffold** — most precise but acronym-heavy and harder to say
- **ModelScaffold** — literal but inherits the overloaded-word problem of "model"
- **LogicScaffold** — technical; frames each entry as executable logic

### Standalone / invented-word variants
- **Scaffoldry** — the -ry suffix invents a place/practice (like "foundry" or "bakery"); no known collisions; brandable
- **Scaffoldworks** — workshop framing that matches Quodsi's aesthetic
- **ScaffoldHub** — community framing; note: `scaffoldhub.io` exists as a React SaaS product, minor collision

### Why scaffold is uniquely strong for SimVault

- **Encodes the stub principle in the name itself.** No other candidate does this — every other name has to explain separately that entries are starting points.
- **Four-domain metaphor coverage.** Construction, software, education, and drug discovery all provide ready-made explanations for different audiences.
- **Drug-discovery sense maps directly onto variants.** A scaffold with varied substituents is exactly what a blueprint with multiple `model_definition` rows is.
- **Schema rename is clean.** `blueprint` → `scaffold` is mechanical: shorter, no collision with "model," and the existing rationale in `database_design/000_overview.md` for rejecting "model" still applies verbatim.
- **Tagline writes itself.** "Start with a scaffold."

### Honest counterarguments

1. **"Temporary" connotation** from the construction sense could undersell reviewed/featured entries. Counter: the drug-discovery and software senses don't carry this implication — the scaffold persists as the core structure.
2. **Software "scaffold" means generated starter code** — a developer might assume SimVault generates simulations. Counter: this may actually prefigure a future Quodsi integration where scaffolds *do* generate runnable models.
3. **Less warm than "recipe" or "commons."** Counter: warmth comes from tagline and visual design; the core noun should be precise.

## Top Recommendations

- **SimBlueprint / SimBlueprints** — aligns directly with the schema word already adopted for the central table
- **SimScaffold** — encodes the stub principle in the name; strongest single-word metaphor and cleanest schema rename path if ever pursued
- **FlowScaffold** — the strongest non-"sim" alternative; accessible to operations audiences who may not identify as simulation people

Earlier top recommendations retained for historical reference:

- **SimVault** — memorable, implies both value and preservation (current working code name)
- **ModelAtlas** — suggests comprehensive coverage and exploration
- **SimCommons** — signals the open, community-driven ethos
