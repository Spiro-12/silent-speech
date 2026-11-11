# Spiro's real recordings

AirPods Pro 3 on a Mac (SilentSpeechBridge), recorded with the dashboard's Record panel on Oct 31 and Nov 1, 2026. Head and jaw motion only (`ss-dataset` v1, [PROTOCOL §3](../../docs/dev/PROTOCOL.md#3-dataset-file-ss-dataset-v1)): no audio, no personal info. Published with Spiro's OK.

| File | Session | Sensor bud | Clips |
|---|---|---|---|
| `ss-dataset-s1-20261031-1621.json` | s1 | **right** | 8 classes × 15 |
| `ss-dataset-s2-20261031-1637.json` | s2 | left | 8 classes × 15 |
| `ss-dataset-s3-20261031-1654.json` | s3 | left | 8 classes × 15 |

- 50 Hz, under 1% gaps. Head resting against a chair. Silent mouthing, jaw a bit exaggerated.
- **`exclude.json`**: 18 `none` takes where Spiro mouthed "stay still" (old prompt wording). Every script skips them (`--exclude`); the raw files are never edited.
- Later `none` takes are nods or swallows (the old prompt said "maybe swallow or nod"). From Phase 2 the prompt says "Keep your mouth closed and still. Don't say anything."
- s1 used the right bud and s2/s3 the left, which is why bud normalization exists ([PROTOCOL §5](../../docs/dev/PROTOCOL.md#5-preprocessing-spec-v1-js-and-python-must-match-exactly) step 0).

First results (DTW kNN, k = 1, before Phase 2 tuning): LOSO on s2 + s3 89.9% (8 classes, chance 12.5%); s1 on an s2 + s3 model 34% raw, 63% mirrored.

## Day 2: `day2/`

Two more sessions, recorded on Nov 1, 2026, the morning after, with the new "Keep your mouth closed and still" prompt for `none`. Both on the **left** bud, 8 classes × 15, no exclusions. The model settings were tuned on s1 to s3 before these existed, so they are a clean test of the defaults.

| File | Session | Sensor bud | Clips |
|---|---|---|---|
| `day2/ss-dataset-s4-20261101-0735.json` | s4 | left | 8 classes × 15 |
| `day2/ss-dataset-s5-20261101-0917.json` | s5 | left | 8 classes × 15 |

They live in their own folder so the 3 session benchmark (`--real`, `data/raw/ss-dataset-*.json`) stays exactly as published.

## Results

On s1 to s3: [ml/RESULTS.md](../../ml/RESULTS.md). On all 5 sessions: [docs/results.md](../../docs/results.md) and the [technical report](../../docs/technical-report.md), rerun with `npx tsx scripts/five-session-analysis.ts data/raw/ss-dataset-*.json data/raw/day2/ss-dataset-*.json --exclude data/raw/exclude.json`.
