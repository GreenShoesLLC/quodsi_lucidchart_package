# Quodsi messaging protocol (Lucid)

The postMessage protocol between the LucidChart extension (the host) and the
iframes it opens: the right-dock model panel and the RoutingModal family
(pattern, schedule, work-schedule, settings, diagram-mapping, Studies,
Advisor). Import everything from `@quodsi/lucid-shared`.

## Envelope

Every message is an `EnvelopeBase`:

```ts
{ id, type, source, target, version: '1.0', data }
```

- `type` is an `EnvelopeMessageType` member (`envelope/envelopeMessageTypes.ts`).
  The enum groups members by area, with a comment on each group.
- `source` / `target` come from `MESSAGE_SOURCES` / `MESSAGE_TARGETS`
  (`envelope/envelope.ts`). These are runtime lists: `isEnvelope` validates
  against them, so a new iframe must be added there, not only to a type.
- A reply reuses the request's `id`, which is how a sender matches it.

Receivers guard with `isEnvelope` and then switch on `type`: the extension in
`core/messaging/handlers/` (dispatched by `MessageHandlers`), the panel in
`messaging/mappers/` plus hook-level `window` listeners for request/reply
pairs.

## Payload types

`data` is typed at each send and receive site (usually an inline
`msg.data as {...}`). This package holds only the payload pieces both sides
share: `QuodsiUserInfo`, `ExtensionConfig`, `ElementShape`, `SimulationStatus`,
the entitlement types (including the whole `ENTITLEMENTS_STATUS` payload,
`EntitlementsStatusData`) and the page-conversion payloads. A type only one
side uses lives on that side. A full typed payload map was removed on
2026-09-17 because nothing used it and it had drifted from the real messages;
typing payloads end to end is ClickUp 86e39r8e9.

## Adding a message type

1. Add the member to `EnvelopeMessageType`, in the right group.
2. Send it (extension: `router.send(channel, envelope)`; panel:
   `useSendMessage` or `window.parent.postMessage`).
3. Handle it on the other side: a `case` in the relevant extension handler
   (or a new handler registered in `MessageHandlers`), or a panel mapper or
   listener.
4. If the payload shape is needed on both sides, export it from here.
5. Queue-before-ready still applies: the router holds messages for a channel
   until that iframe's `REACT_APP_READY`.
