# Internal docs

These are the working documents from building Silent Speech. They are kept for contributors and for the record. If
you want to use the project, start with the [main README](../../README.md) and the [setup guide](../setup.md) instead.

| File | What it is |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | **The contracts**: WebSocket messages between the Mac app and the dashboard, the security rules, the dataset and replay file formats, the preprocessing spec that JavaScript and Python both follow, the classifier API. Change it only together with `web/src/core/contracts.ts`, `mac/SilentSpeechBridge/Protocol.swift` and `shared/fixtures/`. |
| [RESEARCH.md](RESEARCH.md) | What AirPods can and cannot sense, prior research, and how to give it the best shot. Written before the first line of code (Oct 31, 2026). |
| [PLAN.md](PLAN.md) | The original weekend build plan, phase by phase. |
| [tracks/](tracks/README.md) | One brief per agent "track": each part of the project was built by a separate Claude Code agent in its own git worktree, from one of these briefs, then checked by a separate reviewer agent. |
| [mac-runbook.md](mac-runbook.md) | The runbook for the Claude Code session that builds, runs and tests the Mac app on Spiro's Mac. It was `mac/SETUP.md`. It has rules specific to that setup (Spiro only clicks popups and wears the AirPods; numbers and the pairing code never go into a chat). |

Paths inside `PLAN.md` and `tracks/` are from before the project moved out of the `weekend-projects` monorepo: read
`01-silent-speech/` as the repo root, `PROTOCOL.md` as `docs/dev/PROTOCOL.md`, and `mac/SETUP.md` as
`docs/dev/mac-runbook.md`. Code comments that say "PROTOCOL §5" refer to section 5 of [PROTOCOL.md](PROTOCOL.md).

The benchmark report stays with the code that writes it: [ml/RESULTS.md](../../ml/RESULTS.md).
