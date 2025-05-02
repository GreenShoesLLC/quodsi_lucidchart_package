# Simulation‑Run Messages

This document defines the message flow used to kick off, track, and retrieve results for long‑running simulation jobs initiated from the **ModelPanel** in Quodsi.  All terms (jobId, state, etc.) align with the Azure Batch‑backed execution service that powers Quodsi simulations.

> **Envelope**: Each message inherits the standard envelope fields described in `overview.md`.

---

## 1  Message Catalogue

| `type` | Dir. | Purpose | Required `data` fields | Optional fields |
\|-------...
}
