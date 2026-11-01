## What and why

<!-- What this changes, and why. Link the issue if there is one. -->

## How I tested it

<!-- Commands you ran, what you clicked. Screenshots for UI changes. macOS and AirPods model for Mac app changes. -->

## Checklist

- [ ] `npm run typecheck`, `npm test`, `npx playwright test` and `npm run build` pass
- [ ] No test uses port 8765, and any test that sends actions checks for `MockBridge` first
- [ ] Contract changes (messages, file formats, preprocessing) update `docs/dev/PROTOCOL.md`, `web/src/core/contracts.ts`, `mac/SilentSpeechBridge/Protocol.swift` and `shared/fixtures/` together
- [ ] Changes to when actions run come with tests
- [ ] No phone numbers, pairing codes, `actions.json` or personal recordings in the diff
- [ ] Docs updated if behavior changed (`docs/`)
