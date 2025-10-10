# Quodsi Messaging System Documentation

> **⚠️ ARCHIVED DOCUMENTATION**
>
> This documentation has been reorganized and moved to `_docs/architecture/messaging/`.
>
> **New location:**
> - [Messaging System Overview](../../architecture/messaging/README.md)
> - [Message Protocol](../../architecture/messaging/01_message_protocol.md)
> - [Message Lifecycle](../../architecture/messaging/02_message_lifecycle.md)
> - [Mapper System](../../architecture/messaging/03_mapper_system.md)
> - Individual message docs organized by category
>
> **Key changes:**
> - Updated handler references (`mapMessageToAction` → specific mapper functions)
> - Organized by message category (framework, auth, selection, element-ops, model-ops, simulation)
> - Added overview docs explaining protocol and lifecycle
> - Category READMEs for quick navigation
>
> These archived docs are kept for historical reference only.

---

This folder contains detailed documentation for each message exchange in the Quodsi messaging system between the LucidChart extension and embedded React panels.

## Message Categories

### Framework & Lifecycle
- **[react-app-ready.md](./react-app-ready.md)** - Initial handshake and panel initialization
- **[error-logging.md](./error-logging.md)** - Error reporting and debugging messages

### Authentication
- **[auth-login-logout.md](./auth-login-logout.md)** - User authentication flow (login/logout)
- **[auth-status.md](./auth-status.md)** - Authentication state synchronization

### Selection & Context
- **[selection-changed.md](./selection-changed.md)** - Element selection and context updates

### Element Operations
- **[element-update.md](./element-update.md)** - Update element properties (UPDATE + UPDATE_RESULT)
- **[element-convert.md](./element-convert.md)** - Convert element types (CONVERT + CONVERT_RESULT)

### Model Operations
- **[model-validate.md](./model-validate.md)** - Model validation (VALIDATE + VALIDATION_RESULT)
- **[model-convert.md](./model-convert.md)** - Page to model conversion (CONVERT + CONVERSION_RESULT)
- **[model-remove.md](./model-remove.md)** - Model removal (REMOVE + REMOVE_RESULT)
- **[results-page-create.md](./results-page-create.md)** - Dashboard creation (CREATE + CREATE_RESULT)

### Simulation
- **[simulation-run.md](./simulation-run.md)** - Complete simulation lifecycle (REQUEST + ACK + STATUS)

## Documentation Structure

Each message exchange document follows this structure:

### Overview
- Purpose and context of the message exchange
- When and why these messages are used

### Message Flow
- Detailed specification for each message in the exchange
- Direction, payload structure, sender/handler information
- Authentication requirements

### Handler Analysis
- Implementation status table
- File locations and function names

### Typical Sequence
- Step-by-step flow showing how messages are used in practice
- Integration with user actions and system responses

### Implementation Details
- Code examples from actual implementation
- Key algorithms and logic

### Error Handling
- How errors are detected, reported, and recovered
- Fallback mechanisms and reliability features

### Related Messages
- Cross-references to other message exchanges
- Integration points and dependencies

## Message Flow Notation

Each message uses this standardized notation:

```
MESSAGE_TYPE: [Direction: React → Extension | Extension → React]
  • Purpose: [Natural language description]
  • Sender: [ClassName.methodName (filePath)]
  • Handler: [ClassName.methodName (filePath)]
  • Payload: [TypeScript interface or key fields]
  • Response: [RESPONSE_MESSAGE_TYPE if applicable]
  • Auth Required: [Yes/No]
```

## Quick Reference

### Most Common Message Flows

1. **Panel Initialization**:
   `REACT_APP_READY` → `AUTH_STATUS` → `SUBSCRIPTION_STATUS`

2. **User Authentication**:
   `AUTH_LOGIN_SUCCESS` → `AUTH_STATUS` (broadcast)

3. **Element Editing**:
   `SELECTION_CHANGED` → [user edits] → `ELEMENT_UPDATE` → `ELEMENT_UPDATE_RESULT`

4. **Simulation Execution**:
   `MODEL_RUN_REQUEST` → `MODEL_RUN_ACK` → `MODEL_RUN_STATUS` (periodic) → `RESULTS_PAGE_CREATE`

### Handler Status Legend

- ✅ **Implemented**: Fully implemented and working
- 🟡 **Partial**: Implemented but has known issues
- ❌ **Missing**: Not implemented
- ➖ **N/A**: Not applicable for this direction

## Development Guidelines

### Adding New Messages

1. **Define the message type** in `envelopeMessageTypes.ts`
2. **Create TypeScript interfaces** for payload structures
3. **Implement sender** in React or Extension
4. **Implement handler** in Extension or React
5. **Add documentation** following the template structure
6. **Update this README** with the new message

### Message Design Principles

1. **Request/Response Pairs**: Related messages should be documented together
2. **Consistent Naming**: Follow `NOUN_VERB` and `NOUN_VERB_RESULT` patterns
3. **Standard Error Format**: All responses include `success` boolean and `errorMessage`
4. **Message Correlation**: Include original message ID in responses
5. **Type Safety**: Use TypeScript interfaces for all payloads

## Troubleshooting

### Common Issues

1. **Messages Not Delivered**: Check if channel is marked ready with `REACT_APP_READY`
2. **Authentication Errors**: Verify `AUTH_STATUS` has been received
3. **Payload Validation**: Ensure payload matches expected interface
4. **Race Conditions**: Use message queuing for initialization-dependent messages

### Debugging Tools

- Browser console shows detailed message logs
- Extension logging can be enabled with `setLogging(true)`
- Network tab shows Data Connector API calls
- React DevTools for state inspection

## Migration Notes

This messaging system is part of the ongoing refactoring from the legacy `ModelPanel` to the new modular `MessageRouter` architecture. See `../deprecated/` folder for old documentation.

---

*Last updated: June 2025*  
*Current branch: `feature/refactoring_messaging`*