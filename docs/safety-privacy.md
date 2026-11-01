# Safety and privacy

This project can send real texts from your Mac. So it is built to stay quiet unless you clearly want it to act, and
to keep everything on your own Mac. This page lists exactly what happens, taken from the code.

**Contents:** [In short](#in-short) ·
[What stays where](#what-stays-where) ·
[Nothing runs until you say so](#nothing-runs-until-you-say-so) ·
[Only your dashboard can ask](#only-your-dashboard-can-ask) ·
[When the dashboard acts](#when-the-dashboard-acts) ·
[Texts](#texts) ·
[Too late, dropped, or no answer](#too-late-dropped-or-no-answer) ·
[What this does not protect against](#what-this-does-not-protect-against)

## In short

- Motion goes from the AirPods to the Mac app to the dashboard tab, **all on your Mac**. No server, no account, no
  sound.
- **Armed is off** every time the Mac app starts. Only you can turn it on, by hand, in the app window.
- The Mac app only takes requests from the dashboard's web address, only from this Mac, and only from a page opened
  with its own secret **pairing code**.
- **Texts** go only to the contact you set, need the model to be 70% sure, and each texting sentence can run at most
  once every 30 seconds. Nothing is ever retried.

## What stays where

| What | Where it lives | Who can see it |
|---|---|---|
| AirPods motion | Streamed from the Mac app to the dashboard tab, over `127.0.0.1` (your Mac talking to itself) | Only your Mac |
| Your recorded takes | Your browser's storage for the dashboard's site (IndexedDB) | Only that browser on your Mac. Never uploaded |
| Exported files | Wherever you save them | Whoever you give them to |
| Your text contact, music choice | `~/.silentspeech/actions.json` | Only your Mac user (file mode 600). The window shows the contact as `+61 •••• ••12` |
| The pairing code | `~/.silentspeech/token`, the Open dashboard link, and the dashboard tab's memory | Only your Mac user |
| The app's log | `~/Library/Logs/SilentSpeechBridge.log`, new each launch | Only your Mac user. Contacts show as the last 2 digits only |
| Your calendar | Read on your Mac, summarized by Apple's on device model | Never logged, never sent to the dashboard or anywhere else |

More details:

- **No sound.** The microphone is never used. Only motion.
- **The dashboard is a static web page** hosted on GitHub Pages. There is no server behind it and no analytics in it.
  Like any website, GitHub serves the files. The page also loads Spiro's public model and the replay file from the
  same site.
- **Exported takes** are motion only, plus the session name, the AirPods model, which ear, and the name in the
  Record screen's "Your name" setting. Change that setting if you plan to share files.
- **Texts** are sent by the Messages app from your own Apple account, like any iMessage you send.

## Nothing runs until you say so

- **Armed is off by default**, at every launch. While it is off, every request is a **dry run**: the app answers
  "Dry run" and does nothing. The dashboard shows **Safe mode: dry run only**.
- **Only you can arm it**, with the **Armed** switch in the Mac app's window. There is no launch option, setting or
  message from the web page that can turn it on.
- **Switching Armed off cancels** anything that has not started yet. So does switching it off and on again.
- **Simulated motion never acts.** If the Mac app's "Simulate motion" is on, the dashboard will not send actions.

## Only your dashboard can ask

The Mac app runs a small local server at `ws://127.0.0.1:8765`. Three locks stand between a web page and your Mac:

1. **This Mac only.** The server listens only on `127.0.0.1`, an address other computers cannot reach, and it also
   refuses any connection that does not come from this Mac.
2. **Known web addresses only.** Browsers tell the server which site a page is from (its "origin"). The app accepts
   only `https://spiro-12.github.io` and the local development addresses (`http://localhost:5173`, `:4173`, and the
   same on `127.0.0.1`), plus any you add yourself in `~/.silentspeech/config.json` (for a fork with its own
   dashboard, see [Make it yours](make-it-yours.md#host-your-own-dashboard-fork)). Every other site is refused before
   it can connect. A program that sends no origin at all is
   refused too, unless you turn on the app's "Allow non browser clients (dev only)" switch.
3. **The pairing code.** An origin covers a whole site: every page on `spiro-12.github.io`, not just this dashboard.
   So every action must also carry a secret code:
   - On first launch the app makes a random 32 character code and saves it in `~/.silentspeech/token`, readable only
     by you. If that file's permissions are ever wrong, the app makes a new code.
   - **Open dashboard** opens the page with the code after a `#` in the address. Browsers never send that part to a
     server.
   - The dashboard keeps the code **in that tab's memory only**: never in browser storage (which every page on the
     site shares). It removes it from the address bar right away and sends it with each action request.
   - The app checks the code before anything else and refuses a request with a wrong or missing code (`unpaired`).
   - The app never shows the code in its window or writes it to its log.

That is why you must open the dashboard from the app's button each time: a reloaded page has lost the code and cannot
run actions (motion still shows).

## When the dashboard acts

The page asks the Mac to act only when **every** check of its safety rule passes. In short:

- **Sure enough.** Texts (and any action that is not on the harmless list) need the model to accept the guess at
  **70%**. The harmless ones (volume, focus music, calendar, the demo line) need **50%**.
- **Your own, complete model.** Trained in this browser on your real AirPods takes, with every sentence recorded at
  least 5 times. Spiro's public model, preview models and fake data never act.
- **Live and unchanged.** Recognize mode, from the take's start to its end; the live Mac app (never the replay or fake
  AirPods); the same connection the whole time.
- **Armed, paired, offered.** The Mac app is Armed, the page is paired, and the app offers that action.
- **One at a time.** No other action waiting for an answer, and none in the last 3 seconds.

All 12 checks, in order: [How it works: the safety rule](how-it-works.md#the-safety-rule). They live in one small
function with unit tests, [`web/src/panels/result/rule.ts`](../web/src/panels/result/rule.ts).

The Mac app adds its own **cooldowns**: the same action cannot run again within **3 seconds**, or within
**30 seconds** for the three that text people.

## Texts

- **Only to your contact.** Texts go only to the contact in `~/.silentspeech/actions.json`. There is no default
  contact, and only phone numbers with + and a country code are accepted.
- **Only three sentences can text**: "Text mom I'm on my way", "Call me back later" and "I need help right now".
  Each sentence has a fixed kind of action, so the volume sentence, for example, can never send a text, whatever the
  settings file says.
- **"Sending", not "sent".** When the Mac answers, Messages has only been asked to send. The dashboard says
  "Your Mac is sending the text". Only the phone that receives it can say it arrived.
- **Help** plays an alarm, shows a red notice above every window, bounces the Dock icon, and texts your contact. It
  **never calls emergency services**. Do not rely on it in an emergency.
- **The demo screen never sends texts.** It shows a text bubble marked "Demo: not sent" instead. See
  [Make it yours](make-it-yours.md#the-demo-screen).

## Too late, dropped, or no answer

- **The Mac answers every request within 1 second.** Long actions (texts, music, calendar) answer "Working on it" or
  "Sending" right away and finish in the background.
- **Waiting too long cancels it.** If an action waits more than 60 seconds (for example on a permission popup you have
  not answered), it is dropped and the log says `cancelled: too late`.
- **One at a time per app.** While one request waits on Messages (or Music, or Spotify), another one for the same app
  is refused as busy. So one popup can never release two texts.
- **A changed connection stops it.** If the connection or the source changed while you were mouthing, that take does
  not act ("The connection changed while you were talking. Say it again").
- **Never retried.** If the Mac does not answer, or the connection drops after a request, the action may already have
  run. The dashboard says "It may have run anyway, so it won't try again" and does not send it again.
- **The help alert ends a take.** If the red alert opens while you are still holding Space, that take is stopped and
  cannot act.

## What this does not protect against

Being honest about the limits:

- **Anyone who can use your Mac account** can read the pairing code and edit your settings file. This is not a
  defense against someone sitting at your unlocked Mac.
- **Browser history** may still hold the Open dashboard address, code included. That is fine on your own Mac, but
  keep it in mind on a shared one.
- **Wrong guesses still happen.** Harmless actions can run from 50%, so now and then the volume may go up when you
  meant something else. On Spiro's data no text went to the wrong action at the 70% bar, but that is one person.
- **A text cannot be unsent** once Messages has it.
- **The downloaded app is not signed by Apple.** You can read and build it yourself instead: see
  [Setup, option B](setup.md#option-b-build-it-from-source).

Found a security problem? Please do not open a public issue with the details. Use GitHub's private
**Report a vulnerability** button on the repo's Security tab if it is there, or ask for a private contact in a short
issue first.
