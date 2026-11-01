# Results

How well does it work? Honest numbers, with how each was measured and what they do **not** show.

**The big caveat first:** every number here is from **one person** (Spiro), wearing **AirPods Pro 3** on a Mac,
sitting still with his head against a chair. Nobody else has been tested yet. With 8 choices (7 sentences plus
"nothing"), guessing at random would be right 12.5% of the time.

**Contents:** [The data](#the-data) ·
[Headline numbers](#headline-numbers) ·
[What the words mean](#what-the-words-mean) ·
[The published benchmark](#the-published-benchmark-3-sessions) ·
[The replay on the website](#the-replay-on-the-website) ·
[How the bars were picked](#how-the-bars-were-picked) ·
[Limits](#limits)

## The data

| | |
|---|---|
| Sessions | 5. One sitting each: 15 takes of each sentence and of "nothing", shuffled. |
| Takes | 600 recorded, **582 used**. 18 were mislabeled and are excluded everywhere: "nothing" takes where Spiro mouthed the words "stay still" (from an old prompt). The raw files are never edited. |
| Ears | Session 1 on the **right** AirPod, the other four on the **left**. |
| When | Sessions 1 to 3 on one afternoon (Oct 31, 2026), about 15 minutes apart. Sessions 4 and 5 the next day. |
| Published | Sessions 1 to 3, in [`data/raw/`](../data/raw/README.md) (motion only, no audio). Sessions 4 and 5 are not published. |

## Headline numbers

All from Spiro's 5 sessions, with the dashboard's own model (DTW + kNN, the default settings).

> **You cannot rerun these from this repo.** They use sessions 4 and 5, which are not published, and live tests on
> Spiro's Mac. The numbers you can rerun are in [the published benchmark](#the-published-benchmark-3-sessions):
> **88.2%** with settings chosen without the test session, 94.2% with settings tuned on the same sessions.

| Test | Result |
|---|---|
| **New session, same ear.** Train on the other left ear sessions, test on the one left out. Repeat for each of the 4. | **97.3%** of takes: the top guess is right |
| **At the bar texts need** (model accepts, 70% sure). Same test, 420 sentence takes. | **82.1%** of sentences act on the first try. **0 of 420** act wrongly |
| **Sessions recorded after the settings were tuned.** Session 5 (trained on sessions 1 to 4) and session 4 (trained on 1 to 3 and 5). | **98.3%** and **97.5%** top guess right. **0 wrong** actions in both |
| **Across ears.** Train on the left ear, test on the right ear session. | **57% to 84%**, depending on the sessions (see below) |
| **Live, prompted, left ear.** 16 takes, the sentence to say chosen by the page, on Spiro's Mac. | **16 of 16** right. 13 of the 14 sentences acted on the first try. **0 wrong** |
| **Live, right ear.** Same 5 session model, after macOS switched the sensor to the right AirPod. | **11 of 16** (69%), often "Not sure" |
| **More sessions help.** Test on session 5. | Trained on session 4 only: **92%**. Trained on sessions 1 to 4: **98.3%** |

**A note on optimism.** The default settings (like how many neighbors vote) were tuned with leave one session out on
sessions 1 to 3. So the 97.3% and the 82.1% / 0 of 420 include test sessions (2 and 3) that helped pick those
settings, which flatters them a little. Sessions 4 and 5 were recorded after the tuning, so they are the clean test:
98.3% and 97.5%, with no wrong actions.

**Across ears.** The model is trained on left ear sessions and tested on session 1, the only right ear session
(mirrored, see [How it works](how-it-works.md#the-bud-mirror)):

- Trained on sessions 2 and 3: **83.8%** (with the tuned settings; 67.1% with settings chosen without session 1).
- Trained on sessions 2 to 5: **57.1%**. The likely reason: session 1 was Spiro's first, with small movements and the
  old style of "nothing" takes, while sessions 4 and 5 were recorded the next day with bigger movements.
- Live, the 5 session model got 11 of 16 (69%) on the right ear.

So the other ear works somewhere between 57% and 84%, depending on the sessions. Record on the ear you will use.

What this means for you: record on the ear you will use, record more than one session, and mouth clearly. See
[Train it on your mouth](calibration.md).

## What the words mean

- **Leave one session out**: train on every session but one, then test on the one left out, and repeat so each
  session is tested once. It is the closest thing to real use: the model has never seen that sitting.
- **Top guess right**: the most likely sentence is the one that was said, however sure the model is.
- **Acts on the first try**: the guess is right **and** sure enough to run the action (the model accepts it at 70%).
  The rest are "Not sure, try again", which is annoying but safe.
- **Acts wrongly**: sure enough to run an action, but the wrong sentence. This is the number that must stay at 0,
  because a wrong one can send a text.

## The published benchmark (3 sessions)

Anyone can rerun this one: the data is in [`data/raw/`](../data/raw/README.md) and the code in [`ml/`](../ml). The full
report, with every table and confusion matrix, is [ml/RESULTS.md](../ml/RESULTS.md).

Sessions 1 to 3 were recorded about 15 minutes apart on the same afternoon, in the same chair. Session 1 used the right
ear, sessions 2 and 3 the left. 342 takes after the exclusion list.

**Leave one session out, DTW + kNN:**

| Tested on | Settings chosen without the test session | Settings tuned on all 3 sessions |
|---|---:|---:|
| Session 1 (right ear, mirrored) | 67.1% | 83.8% |
| Session 2 (left ear) | 96.6% | 97.4% |
| Session 3 (left ear) | 98.3% | 100% |
| **All** | **88.2%** | 94.2% |

The left column is the honest one: the settings (like how many neighbors vote) were picked without looking at the
session being tested. Tuning on all three sessions looks about 6 points better than it really is.

**Other models, same test:**

| Model | Preprocessing fixed before the data | Preprocessing from the DTW sweep |
|---|---:|---:|
| DTW + kNN | 81.9% | 88.2% chosen without the test session, 94.2% tuned on all 3 |
| MiniRocket | 76.3% | 84.8% (83.9% to 88.3% over 5 random seeds) |
| Small 1D neural network | 76.6% | 79.2% |

The right column borrows the preprocessing (96 points, each take normalized on its own) that the DTW sweep picked on
these same sessions, so MiniRocket's and the network's numbers there share some of that optimism. The left column
uses settings fixed before any of this data existed.

**Is it luck?** Three models were rerun 500 times each with the training labels shuffled: DTW with the tuned settings
(94.2%), DTW with the settings fixed before the data (81.9%), and MiniRocket with its fixed settings (76.3%). The
shuffled models score about 12.5% (chance), and not one of the 500 reached the real score for any of them
(p = 0.002). The other MiniRocket and network rows were not luck tested. This test shows the models are far above
chance; it does not measure how much tuning flatters a number (that is what the 88.2% is for).

**"Nothing" takes:** at the old 85% bar, 0 of 27 "nothing" takes were mistaken for a sentence.

## The replay on the website

The [live demo](https://spiro-12.github.io/silent-speech/) replays 16 takes from session 3, picked at random and
stitched into one stream. The model it uses (Spiro's public model) was trained on sessions 1 and 2 only, so it never
saw them. It is stricter than your own model: it only accepts a guess at 85%.

Played to the end, it scores **11 of 16 right, 0 wrong, 5 "not sure"**. "Not sure" means the model did not accept
its guess at 85%, so nothing would have run.

## How the bars were picked

Two bars decide what may run (see [How it works](how-it-works.md#how-sure-is-it)):

- **Texts** need the model to accept the guess at **70%**.
- **Harmless actions** (volume, music, calendar, the demo line) may run from **50%**.

First, on the 3 published sessions, an 85% bar gave 61.6% of sentences acted on (55.1% with settings chosen without
the test session), 0 wrong and 0 "nothing" takes mistaken. At 50%: 85.4% acted on, 1.0% wrong.

Then, with all 5 sessions (420 left ear sentence takes), leave one session out (with the optimism noted
[above](#headline-numbers)):

| Bar | Act on the first try | Act wrongly |
|---|---:|---:|
| 85% | 65.5% | 0 |
| **70%** | **82.1%** | **0** (1.0% across ears) |

On the same ear, no wrong ones showed up even at 60%.

Texts only go to the contact you set (Spiro used his own number), so Spiro chose 70%: texts work on the first try
much more often, with no wrong ones seen. The harmless actions use 50% because a wrong one only turns the volume up
or plays music.

## Limits

- **One person.** Nobody else has been tested. Your numbers will differ.
- **7 fixed sentences** plus "nothing". It is not dictation and does not know any other words.
- **Per person and per ear.** You train it on your own mouth, on the ear you will use.
- **Still head.** All takes were recorded sitting still. Walking, talking with your head or turning to look at
  something will confuse it.
- **Push to talk.** You hold Space while you mouth. There is no automatic detection yet.
- **One AirPods model tested** (AirPods Pro 3, about 50 readings a second). Older AirPods send about half as many.
- The first three sessions were recorded the same afternoon. Accuracy on another day is covered by sessions 4 and 5
  (the next day), which are not published.
