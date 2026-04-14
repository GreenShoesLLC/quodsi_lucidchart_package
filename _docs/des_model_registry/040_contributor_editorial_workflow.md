# Contributor & Editorial Workflow

## Account System

- Browsing is fully public, no account needed.
- Account required to: create entries, edit entries, submit implementation links, participate in review.
- Contributor profiles show their edit history and contributions (Wikipedia-style).

## Creating a New Entry

- Any logged-in user can create a new entry.
- Minimum required: title, at least one domain tag, summary. Stubs are welcome.
- Ability to add a visual diagram — either by uploading an image or creating one within the site.
- Optional: fill in any of the deeper fields (write-up, variations, complexity, videos, implementation links).

## AI-Assisted Services for Contributors

Contributors have access to the full [AI services catalog](047_ai_services_catalog.md) while working on an entry:

- **Narrative Drafting** — propose draft content for the eight summary sections based on the entry's raw context
- **Context Q&A** — explore an entry's accumulated context through natural-language questions
- **DES Criteria Check** — confirm the entry still satisfies the DES qualification rubric
- **Enrichment Suggestions** — surface what the entry is missing and where to look for it

All AI-generated content is clearly labeled as such until a human reviews and accepts it. The contributor remains in control of what actually enters the public summary.

## Editorial Review (Wikipedia-Inspired)

- Any logged-in user can edit any entry (changes tracked in revision history).
- Status progression: **AI Discovered** → **Stub** → **Draft** → **Reviewed** → **Featured**.
- **AI Discovered** — entries created by the [AI Agent Seeder](045_ai_agent_seeder.md) that have not yet been reviewed by a human. These live in a clearly separated area of the site with lower quality expectations. Promotion from AI Discovered to Stub requires a human editor to review and accept.
- Moving from Draft to Reviewed requires at least one review from a different contributor than the author.
- Featured status is reserved for entries curated/promoted by registry editors (initially the Quodsi co-founders).
- Edit conflicts handled by revision history — later edits win, but previous versions are always recoverable.
- Flagging mechanism — users can flag entries for inaccuracies, spam, or quality concerns.

## AI Agent Seeder Integration

The [AI Agent Seeder](045_ai_agent_seeder.md) continuously discovers new model candidates and creates entries at the AI Discovered tier. These entries are visible to users but clearly separated from the human-curated catalog. Human editors review AI Discovered entries and promote the valuable ones to Stub, where they join the main editorial flow.

The Seeder also attaches raw context to existing entries when it finds new sources that describe an already-cataloged model. This enrichment happens continuously without requiring human action.

See [045_ai_agent_seeder.md](045_ai_agent_seeder.md) for details on Seeder behavior, sources, and governance.

## Thin Entries Are Legitimate

A **thin entry** — one with only a small amount of raw context, perhaps from adjacent or second-party sources, and no polished summary yet — is a legitimate contribution under SimVault's raw-first principle. Human reviewers should not reject thin entries for being thin.

This matters because:

- **Thin entries unblock future growth.** Even a minimal entry gives the Seeder a concrete target to enrich on its next pass. Without the entry, the topic has nowhere to accumulate context.
- **Thin entries serve users immediately.** A user searching for a topic finds *something* rather than nothing, and can see what the platform knows so far.
- **Thin entries make gaps visible.** An entry marked as thin with a clear [human follow-up queue](045_ai_agent_seeder.md#human-follow-up-queue) tells editors exactly what content is missing and where to look for it.
- **Thin entries are demand signals.** A thin entry at AI Discovered status is an implicit request for attention — contributors with relevant expertise can find it and enrich it.

Reviewers should evaluate thin entries on **direction, not completeness**. The question is "is this heading somewhere useful?" not "is this finished?" An entry with one first-party direct source and three second-party references is ready to be promoted to Stub if the direction is sound, even if the body is small.

The opposite also holds: an entry that is large in volume but misaligned (wrong domain, wrong model, duplicated content, low-quality sources) should not be promoted even if it looks superficially complete.

## Implementation Links

- Any logged-in user can submit an implementation link for any model entry.
- Each link specifies: software name, URL, brief description, contributor attribution.
- Implementation links are moderated — flaggable if broken or misrepresented.
