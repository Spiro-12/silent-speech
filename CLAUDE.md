# Silent Speech

Open source: mouth a sentence silently, the motion sensor in your AirPods picks it up, your Mac does it.
Spun out of `Spiro-12/weekend-projects` (project 01) with its full history. MIT licensed.

## Layout
- `web/` dashboard (Vite + vanilla TS), deployed to GitHub Pages at https://spiro-12.github.io/silent-speech/ (`base: '/silent-speech/'`).
- `mac/` SilentSpeechBridge, the macOS app that streams AirPods head motion over a local WebSocket and runs actions.
- `ml/` Python bench (same DTW kNN as `web/src/ml`), `data/raw/` Spiro's published recordings, `shared/` classes and fixtures.
- `docs/` user docs (setup, calibration, results, safety, troubleshooting). `docs/dev/` internal docs: `PROTOCOL.md` (the contracts), `PLAN.md`, `RESEARCH.md`, `tracks/` (agent briefs), `mac-runbook.md` (the runbook for the Claude Code session on Spiro's Mac).
- Tests: `npm run typecheck && npm test && npx playwright test` (e2e ports from `E2E_WEB_PORT` / `E2E_MOCK_PORT`; never use 8765 in tests). Pipe test output only with `set -o pipefail`.

## How we work with Spiro
- Spiro is not technical. **Never ask him to review code, run commands, merge PRs or edit files.** Claude does all of that.
- Claude reviews, tests, merges, installs and builds. Work on his Mac goes through Remote Control (his `~/weekend-projects` folder, with this repo cloned at `~/weekend-projects/silent-speech`; Remote Control to cloud sessions is not available on his Mac yet, so a Claude Code session running on the Mac does Mac work).
- Only ask Spiro for: physical actions (wearing AirPods, mouthing sentences, clicking macOS permission popups, typing his Mac password), accounts or money, and anything that reaches real people (real texts, public posts). Sending a real message to a real person always needs his OK first.
- Updates are short, plain English, 7th grade, no jargon: what changed, what he can see, and the one thing he needs to do (if any).
- He is fine with Claude merging its own PRs to main, **only** after the ship checklist passes.
- **Real life tests with Spiro:** whenever something can be tested for real (AirPods, the Mac app, real actions), ask Spiro to test it as early as possible. Give him a short script: what to put on, what to do, what he should see, and what to send back (screenshot, file, or a yes/no). Don't wait until the end of a phase if an earlier test would catch a problem.

## Ship checklist (every PR, before merge)
1. Author agent passes its own gate (typecheck, unit, e2e, build).
2. A fresh reviewer agent that did not write the code reviews the diff against its brief and `docs/dev/PROTOCOL.md` (high effort). Fix findings, re-review until clean.
3. GitHub CI (`.github/workflows/ci.yml`) green: web job, Mac compile job, Python job.
4. Claude checks it for real: headless browser screenshots and click through; on his Mac when connected.
5. Merge with the GitHub REST API (`gh api repos/Spiro-12/silent-speech/pulls/N/merge -X PUT`). After the Pages deploy, load the live URL and confirm.
6. Plain English update to Spiro.
