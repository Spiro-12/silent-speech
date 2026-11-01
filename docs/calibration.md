# Train it on your mouth

Silent Speech does not come knowing your mouth. It learns from the takes you record, so how you record matters more
than anything else. This page is what we learned from Spiro's real recordings.

## The short version

- [ ] Wear **one AirPod** (or check which one is the sensor), and use the **same ear** every time.
- [ ] Head **still**, resting against a chair if you can.
- [ ] Mouth **clearly and a bit bigger** than normal. No sound.
- [ ] Hold <kbd>Space</kbd> a moment **before** you start and let go a moment **after** you finish.
- [ ] For "Mouth closed": mouth closed and still. **No nods, no swallows.**
- [ ] At least **5 takes of every sentence**. 15 is better. More sessions on different days is best.
- [ ] Press **Re-train** after recording.

## 1. Pick your ear

Only one AirPod sends motion at a time, and macOS picks which one. The dashboard shows it: the **Head pose** card says
**Sensor in the left AirPod** (or right), and the **Connection** card has a **Sensor bud** row.

This matters a lot. Your jaw moves each ear differently, and a model learns one ear:

- A model trained on Spiro's **left** ear got **16 of 16** right in a live test with the left ear.
- The same model got **11 of 16** when macOS switched to the **right** ear, and it often said "Not sure".
- Trained on left ear sessions and tested on his one right ear session: about **57% to 69%** (84% only with
  settings tuned on that same session; [details](results.md#headline-numbers)).

The page already mirrors right ear motion to look like left ear motion, which helps (see
[How it works](how-it-works.md#the-bud-mirror)), but it does not close the gap.

So:

- **Wear one AirPod.** Then macOS has no choice.
- Or wear both, but **check the sensor bud** before you record and before you use it.
- Want both ears to work? **Record one session per ear.** The model keeps track of which ear each take came from.

## 2. Sit still

The sensor feels your whole head, not just your jaw. A nod or a turn of the head is much bigger than a mouthed word.

- Rest your head against a chair back if you can. Spiro recorded all his sessions that way.
- Keep your head still from the moment you press Space until you let go.
- Quiet surroundings help only because you will not be tempted to talk. Sound itself does not matter: the
  microphone is never used.

## 3. Mouth clearly, a bit bigger than normal

Mouth the words with no sound, as if someone were lip reading you from across a room. Open your jaw on each syllable.

The sensor mostly feels your **jaw** opening and closing (the rhythm of the syllables). Lips and tongue barely move
your head, so "bat" and "pat" look the same to it. Bigger jaw movement gives a clearer signal.

In Spiro's data, the session where he moved about **25% more** than usual scored **97.5%** on its own. His first
session, with small movements (and on the other ear), was the hardest one to recognize.

Try to mouth each sentence the **same way every time**: same speed, same size.

## 4. The "Mouth closed" takes

The model also learns "nothing", so it can tell when you did not say a sentence. When the screen says
**Keep your mouth closed and still. Don't say anything.**:

- Mouth closed, jaw still.
- **No nods, no swallows, no glances.** Spiro's early "nothing" takes had those in them. The prompt now asks for a
  still mouth only, so the model learns one clear picture of "nothing".
- Hold Space for about as long as a sentence takes.

## 5. Push to talk timing

- Wait until the sentence turns **solid white** before you press. A press too soon after it appears is ignored.
- **Hold Space a moment before** you start mouthing, and **let go a moment after** you finish. Cutting the start or
  end off is a common reason for a wrong guess.
- Do not press again within a second of letting go. The page treats that as a finger slip and drops both takes.
- A take can be at most 10 seconds.

## 6. How many takes

- Your model can run actions only when **every sentence, "Mouth closed" included, has at least 5 takes** recorded in
  this browser. Until then, the Recognize screen shows a preview but never acts.
- The default is **15 takes** of each sentence per session. That is about 10 minutes.
- **More sessions at different times help a lot.** On Spiro's data, a model trained on one session got **92%** on the
  next session. A model trained on four sessions got **98%** on that same session.
- Between sessions, take the AirPods out and put them back in. The page offers **Start the next session** when one is
  done.
- **Export JSON** after each session. That file is your backup, and you can **Import JSON** it into another browser.

## 7. Re-train

After you record more, switch to **Recognize** and press **Re-train**. The model line tells you when it is out of
date: **New recordings since. Press Re-train.**

## 8. Check yourself

- **How well it knows your sentences** (Record screen, right side): as you record, the page tests itself on your
  takes and shows a score and a small grid of which sentences it mixes up. Rows are what you said, columns are what it
  guessed. A sentence that keeps landing in the wrong column needs clearer, more consistent takes.
- **Session recorder** (Recognize mode, with the Mac app connected): it prompts you with the sentence to say next, so
  you test yourself on sentences you did not pick. Watch whether the big sentence matches the prompt.

## 9. How sure is sure?

Every guess comes with a score from 0% to 100% (the ring on the Recognize screen).

| Score | The screen says | What may run |
|---|---|---|
| Under 50% | **Not sure, try again** | Nothing |
| 50% to 70% | **Probably** | Only harmless actions: volume, music, calendar, the demo line |
| 70% and up, and the model accepts it | **You said** | Any action, texts included |

Texts need the higher bar because a wrong text to a real person is the worst mistake this project can make. On Spiro's
data, at the 70% bar, 82.1% of sentences acted on the first try and none of 420 acted wrongly. See
[Results](results.md).

## 10. It keeps saying "Not sure"

In order of how often it is the cause:

1. **Wrong ear.** Check the sensor bud. Record on the ear you use, or wear one AirPod.
2. **Out of date model.** Press **Re-train**.
3. **Too few takes, or one session only.** Record another session, ideally at another time of day.
4. **Takes cut short.** Hold Space a little longer on both ends.
5. **Too small.** Mouth bigger.
6. **Head moving.** Rest your head and keep still while Space is down.

More fixes: [Troubleshooting](troubleshooting.md#it-always-says-not-sure).
