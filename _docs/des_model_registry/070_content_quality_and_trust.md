# Content Quality & Community Trust

## Quality Signals

- Every entry displays its status badge prominently: **AI Discovered**, **Stub**, **Draft**, **Reviewed**, **Featured**.
- Users can quickly gauge how much trust to place in an entry's content.
- **AI Discovered** entries are visually separated from the human-curated catalog. They are visible to users who want to explore the frontier but clearly carry lower quality expectations.
- Revision count and contributor count visible — an entry edited by 12 people carries more implicit trust than one touched by 1.
- Per-content-record AI labeling — any raw context record, summary section, or model definition produced by an AI service is labeled as such until a human has reviewed and accepted it.
- The [DES criteria check](047_ai_services_catalog.md#3-des-criteria-check) runs automatically and displays the entry's current qualification status.

## AI-Generated Content Trust

SimVault is AI-native, which means a significant portion of the content is produced or enriched by AI agents. Trust signals specific to AI content:

- **Clear labeling** — all AI-generated content is visibly marked until accepted by a human
- **Grounded in source** — AI outputs cite the specific raw context records they draw from, so readers can audit
- **Human-in-the-loop writes** — AI services propose changes; they do not silently modify published content
- **Provenance tracking** — every AI action is logged and attributed to the service that produced it
- **Feedback loop** — users can flag incorrect or misleading AI output, which informs service improvements

## Community Moderation

- Flagging system — any user (even without an account) can flag an entry or implementation link for: inaccuracy, spam, broken link, or quality concern.
- Flags are reviewed by editors (initially the Quodsi co-founders, eventually trusted community members).
- Trusted Contributor role — earned through consistent quality contributions, unlocks abilities like reviewing entries to move them from Draft to Reviewed status.

## Editorial Governance

- Initially lightweight — the Quodsi co-founders are the sole editors with Featured/curation privileges.
- As the community grows, governance scales: trusted contributors gain review privileges, eventually a small editorial board.
- Guiding principle: low barrier to contribute, progressively higher bar to reach Reviewed and Featured status.
- No entry is ever "locked" — even Featured entries can be edited, with changes tracked in revision history.

## Handling Disputes

- If contributors disagree on an entry's content, revision history preserves both versions.
- Editors can mediate — similar to Wikipedia's "talk page" concept, though the exact mechanism can be simple at first (a comments/discussion thread on each entry).
