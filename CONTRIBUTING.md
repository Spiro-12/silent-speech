# Contributing

Thanks for helping. Bug reports, fixes, docs and test results on AirPods other than AirPods Pro 3 are all welcome.

**No coding needed:** the most useful thing you can share is your own recordings, so we can see if it works for
people other than Spiro. Open a [Share your recordings](https://github.com/Spiro-12/silent-speech/issues/new?template=share_recordings.yml)
issue and attach the file from **Export JSON**.

**Looking for something to code?** Start with the issues labeled
[good first issue](https://github.com/Spiro-12/silent-speech/labels/good%20first%20issue) or
[help wanted](https://github.com/Spiro-12/silent-speech/labels/help%20wanted).
Be kind: see the [code of conduct](CODE_OF_CONDUCT.md). Security problems: see [SECURITY.md](SECURITY.md).

## The layout

| Folder | What |
|---|---|
| `web/` | The dashboard: Vite + plain TypeScript, no framework. Panels in `web/src/panels/`, data sources in `web/src/sources/`, the model in `web/src/ml/`. |
| `mac/` | SilentSpeechBridge, the Mac app (Swift, SwiftUI). Builds with the Command Line Tools only. |
| `ml/` | The Python benchmark (same DTW + kNN as the dashboard, plus MiniRocket and a 1D CNN). |
| `shared/` | `classes.json` (the sentences) and test fixtures. |
| `data/raw/` | Spiro's published recordings. |
| `tests/` | Unit tests (Vitest), browser tests (Playwright) and the mock Mac app (`tests/mock-bridge.ts`). |
| `docs/` | User docs. `docs/dev/` has the contracts ([PROTOCOL.md](docs/dev/PROTOCOL.md)) and the build history. |

## Dev setup

You need Node.js 22.

```bash
npm ci
npm run dev
```

The dashboard is now at http://localhost:5173/silent-speech/. Add `?mode=fake` for fake AirPods (no hardware
needed), or `?mode=replay` for the replay.

### With the mock Mac app

`tests/mock-bridge.ts` speaks the same protocol as the real app, with fake motion, and says `MockBridge` in its hello.

```bash
npm run bridge -- --allow-origin http://localhost:5173    # ws://127.0.0.1:18765
```

Then open http://localhost:5173/silent-speech/?mode=live&ws=ws://127.0.0.1:18765. Useful options: `--real` (reports
real AirPods instead of simulated), `--armed`, `--token <hex>` (require a pairing code), `--port`, `--drop 0.05`
(drop 5% of samples). The full list is at the top of the file.

### With the real Mac app

The real app already allows `http://localhost:5173`. Build and open it (see
[Setup, option B](docs/setup.md#option-b-build-it-from-source)), then open your dev server paired:

```bash
open -a "Google Chrome" "http://localhost:5173/silent-speech/?mode=live#pair=$(cat ~/.silentspeech/token)"
```

The shell fills in the pairing code without printing it. Never paste the code anywhere.

## Tests

```bash
npm run typecheck                     # TypeScript
npm test                              # unit tests (Vitest)
npx playwright install chromium       # once
npx playwright test                   # browser tests: builds the site, starts a preview server and the mock app
npm run build                         # the GitHub Pages build, into dist/
```

**The e2e port rule:** Playwright takes its ports from `E2E_WEB_PORT` and `E2E_MOCK_PORT` (default 4173 and 18765),
so several checkouts can run tests at once:

```bash
E2E_WEB_PORT=4301 E2E_MOCK_PORT=18901 npx playwright test
```

- **Never use port 8765 in a test.** That is the real Mac app, and it can send real texts.
- In specs, import `BASE` and `MOCK_WS` from `playwright.config.ts` instead of writing ports.
- A test that sends actions must first check that `hello.app` is `MockBridge`.
- Unit tests that need a mock app use `startMockBridge({ port: 0 })`.
- If you pipe test output (`| tail`), use `set -o pipefail` so failures are not hidden.

**Mac app:**

```bash
cd mac && ./build.sh                  # needs macOS and the Command Line Tools
```

With the app running and **not** Armed, `npx tsx mac/check-bridge.ts` checks its security rules (loopback only,
origin allowlist, pairing, cooldowns). It refuses to run while the app is Armed.

**Python bench:**

```bash
cd ml && uv sync && uv run pytest -q
```

## Pull requests

- **Keep it focused.** One change per pull request.
- **Green before review:** typecheck, unit tests, browser tests and the build. CI runs three jobs: web, Mac compile
  (on a macOS runner) and Python.
- **Say how you tested it.** For UI changes, add a screenshot. For Mac app changes, say which macOS and AirPods.
- **Contracts change together.** If you change a message, a file format or the preprocessing, update
  [docs/dev/PROTOCOL.md](docs/dev/PROTOCOL.md), `web/src/core/contracts.ts`, `mac/SilentSpeechBridge/Protocol.swift`
  and `shared/fixtures/` in the same pull request. JavaScript and Python preprocessing must keep matching
  (`tests/unit/ml/golden.json`).
- **Safety is strict by default.** Changes to when actions run (`web/src/panels/result/rule.ts`, the Mac app's
  cooldowns, pairing or origin checks) need tests. A new action is strict (texts' bar) unless there is a clear reason
  it can never reach another person.
- **No personal data.** Never commit phone numbers, the pairing code, `~/.silentspeech/actions.json`, or recordings
  without the person's OK.
- **Plain words in the UI.** Short sentences, no jargon, as if for a 12 year old.

Recorded your own sessions and happy to share them? Use the [Share your recordings](https://github.com/Spiro-12/silent-speech/issues/new?template=share_recordings.yml) form.

## Reporting bugs

Use the [bug report form](https://github.com/Spiro-12/silent-speech/issues/new/choose). For security problems, see
[SECURITY.md](SECURITY.md) (report privately, not in a public issue).
