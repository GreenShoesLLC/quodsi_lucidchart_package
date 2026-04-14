# AI Services Catalog

SimVault offers a catalog of AI-powered services that contributors, readers, and the [AI Agent Seeder](045_ai_agent_seeder.md) use throughout the platform. These services operate on the [three-tier content model](022_three_tier_content_model.md) and are central to the [AI-native vision](015_ai_native_vision.md).

## v1 Services

Four services are in scope for v1:

1. **Narrative Drafting**
2. **Context Q&A**
3. **DES Criteria Check**
4. **Enrichment Suggestions**

Each is described below.

---

## 1. Narrative Drafting

**Purpose:** Propose draft content for the eight summary sections of an entry based on its raw context.

**Inputs:** All raw context records associated with an entry.

**Outputs:** Draft content for each of the eight summary sections (Entities, Resources, Activities, Generators, Queues, Routing, Metrics, Assumptions).

**Behavior:**
- Reads everything in the raw context for the entry
- Produces draft narratives for each section, marked as AI-generated
- Drafts are **proposed**, not saved automatically — a human reviews, edits, and accepts before they become part of the published summary
- Sections where the raw context has nothing useful to say are left blank or marked "Not described in available context" rather than fabricated
- Re-runnable: when new raw context is added, narrative drafting can be re-invoked to propose updates

**Why it matters:** This is the primary way SimVault bridges raw context and structured summary. It turns a messy pile of notes into a readable narrative with minimal human effort.

---

## 2. Context Q&A

**Purpose:** Let readers explore a model by asking questions in natural language, rather than reading everything.

**Inputs:** All raw context records for an entry, plus the summary if present. A user's question.

**Outputs:** An answer grounded in the entry's content, with citations back to specific context records.

**Behavior:**
- A chat-style interface on each model entry page
- Questions like "what assumptions does this model make about arrival patterns?" or "how are resources scheduled?" get answered using the entry's context
- Answers cite specific raw context records or summary sections as evidence
- Answers clearly distinguish what the content says from what the agent is inferring
- If the content doesn't contain the answer, the service says so rather than hallucinating

**Why it matters:** Context Q&A is arguably the highest-value reader experience. It lets someone understand a model in minutes by asking the questions they care about, rather than reading everything to find those answers themselves. It also makes the value of rich raw context visible — the more context an entry has, the better the Q&A becomes.

---

## 3. DES Criteria Check

**Purpose:** Evaluate whether an entry's content still satisfies the [DES criteria rubric](018_des_criteria.md).

**Inputs:** The entry's raw context and summary.

**Outputs:** A qualification assessment against each of the three required criteria (and the two typical criteria), with a brief explanation.

**Behavior:**
- Runs automatically when new content is added to an entry
- Runs on-demand when a human requests an evaluation
- Used by the AI Agent Seeder to decide whether a candidate source qualifies
- Used by human editors as a sanity check before promoting an entry's status
- Flags entries that have drifted into non-DES territory

**Why it matters:** The DES criteria check is how SimVault stays focused on actual discrete event simulation. Without it, the catalog would gradually accumulate adjacent content that dilutes its authority.

---

## 4. Enrichment Suggestions

**Purpose:** Proactively identify what an entry is missing and prompt humans or agents to add it.

**Inputs:** The entry's current raw context and summary.

**Outputs:** A list of suggested enrichments, each with a brief explanation of why it would be valuable.

**Behavior:**
- Runs periodically on each entry (and on-demand)
- Compares the entry against similar entries to identify gaps
- Identifies missing sections of the summary
- Flags questions the context doesn't answer (e.g., "no information about arrival patterns")
- Suggests specific sources that might provide missing information (e.g., "the related paper X at URL Y mentions this model type")
- Surfaces suggestions as "Open Enrichments" that contributors can tackle

**Why it matters:** Enrichment suggestions turn content gaps into opportunities. Instead of entries silently decaying because no one knows what's missing, the platform actively surfaces what needs attention. This creates a productive flow for contributors who want to help but don't know where to start.

---

## Services Deferred from v1

The following were discussed but intentionally deferred:

- **Voice transcription** — users can transcribe externally; integrating transcription is a low priority
- **Pure summarization as a standalone service** — Context Q&A effectively covers this; a dedicated summarization service is unnecessary

---

## How Services Interact with the Content Model

Each service operates on specific tiers of the content model:

| Service | Reads | Writes |
|---------|-------|--------|
| Narrative Drafting | Raw Context | Summary (proposed) |
| Context Q&A | Raw Context + Summary | — (read-only, ephemeral answers) |
| DES Criteria Check | Raw Context + Summary | — (assessment only) |
| Enrichment Suggestions | Raw Context + Summary | — (suggestions only) |

**Translators** (see [028_model_definitions_and_translators.md](028_model_definitions_and_translators.md)) are a separate family of services that read the Summary and raw context and write Model Definitions. They are described in their own document because they are more involved than the four services here.

## Design Principles for AI Services

Several principles apply to every AI service in SimVault:

1. **Grounded in content** — every output is traceable to specific context records or summary sections. No fabrication.
2. **Transparent labeling** — AI-generated output is always clearly marked as such until a human accepts it.
3. **Human in the loop for writes** — services never silently modify the public summary or published content; they propose, humans approve.
4. **Re-runnable** — every service can be re-invoked when upstream content changes, keeping derived outputs fresh.
5. **Evaluable** — each service should have a way to measure quality (e.g., "percentage of drafting outputs accepted by humans") so improvements can be tracked.
