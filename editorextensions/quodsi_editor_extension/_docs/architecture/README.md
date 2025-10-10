# Architecture Documentation

This folder contains maintained architectural documentation for the Quodsi LucidChart extension. These documents are reference-quality and kept up-to-date with the codebase.

## Documentation Sections

### [Bootstrap Process](./bootstrap/)
Detailed documentation of the extension initialization sequence, from browser load to fully operational state.

**Start here if you need to understand:**
- How the extension initializes
- Extension and React app startup flow
- REACT_APP_READY handshake protocol
- Common initialization issues

### [Messaging System](./messaging/)
Complete documentation of the message protocol enabling extension-React communication.

**Covers:**
- Message protocol and envelope structure
- Message lifecycle and routing
- React mapper system
- All message types organized by category (framework, auth, selection, element-ops, model-ops, simulation)

### Panel Architecture (Coming Soon)
Panel lifecycle, RoutablePanel interface, and panel-specific responsibilities.

### Storage System (Coming Soon)
StorageAdapter, ModelManager, and data persistence patterns.

---

## Quick Links

**Bootstrap:**
- [Bootstrap Overview](./bootstrap/README.md)
- [Initialization Flow](./bootstrap/01_initialization_flow.md)

**Messaging:**
- [Messaging Overview](./messaging/README.md)
- [Message Protocol](./messaging/01_message_protocol.md)
- [Message Lifecycle](./messaging/02_message_lifecycle.md)
- [Mapper System](./messaging/03_mapper_system.md)

## For Developers

These docs assume:
- Familiarity with TypeScript, React, and the Lucid SDK
- Understanding of singleton patterns and message-passing architectures
- Access to the codebase for referenced file paths

## For LLMs

These docs use:
- File path references instead of long code blocks
- Schema-level descriptions of class relationships
- Sequence diagrams for complex flows
- Cross-references between related docs
