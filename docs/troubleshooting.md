# Troubleshooting

Find what you see, then try the fixes in order. The Mac app's **Log** box (and the full log file,
`~/Library/Logs/SilentSpeechBridge.log`) usually says what went wrong in plain words.

**Contents:**
[macOS will not open the app](#macos-will-not-open-the-app) ·
[The page can't reach the Mac app, or the rate is 0](#the-page-cant-reach-the-mac-app-or-the-rate-is-0) ·
[The signal is choppy](#the-signal-is-choppy) ·
[Not paired](#not-paired) ·
[It always says Not sure](#it-always-says-not-sure) ·
[It recognizes, but nothing happens](#it-recognizes-but-nothing-happens) ·
[I missed a permission popup, or clicked Don't Allow](#i-missed-a-permission-popup-or-clicked-dont-allow) ·
[Texts do not go out](#texts-do-not-go-out) ·
[Music, calendar or speech problems](#music-calendar-or-speech-problems) ·
[The app keeps my Mac awake](#the-app-keeps-my-mac-awake) ·
[Port 8765 is in use](#port-8765-is-in-use) ·
[My recordings are gone](#my-recordings-are-gone) ·
[Still stuck](#still-stuck)

## macOS will not open the app

The downloaded app is not signed by Apple, so macOS blocks it the first time ("Apple could not verify..." or "cannot
be opened").

1. Click **Done** (or **OK**) on that message.
2. Open **System Settings > Privacy & Security**, scroll to **Security**, and click **Open Anyway** next to the
   SilentSpeechBridge message. Type your Mac password.
3. Open the app again and click **Open**.

Or, in Terminal: `xattr -dr com.apple.quarantine /Applications/SilentSpeechBridge.app`

Still blocked? Make sure you moved the app out of the zip folder into Applications, and that you are on macOS 14 or
newer (Apple menu > About This Mac).

## The page can't reach the Mac app, or the rate is 0

The Connection card's top line says the page cannot reach the Mac app, or the rate tiles show 0 Hz.

**1. Is the Mac app running?** Look for its window or its Dock icon. In the window's **Dashboard** box, **Server**
should say `Listening on ws://127.0.0.1:8765`. If it says the port is in use, see
[Port 8765 is in use](#port-8765-is-in-use).

**2. Did you open the page from the app?** Click **Open dashboard** in the app window. A page opened any other way
(a bookmark, a reload, or typing the address) is not paired. If this browser has reached the Mac app before, such a
page still tries the app first and shows your motion, but cannot run actions. If it cannot reach the app, it shows
Spiro's replay instead: the pill at the top right of the page says `replay`, not `live`.

**3. Is it Chrome, and did Chrome allow it?** Other browsers may block a secure page from reaching `127.0.0.1`. Use
Chrome. If Chrome asked to let the page access apps on this device and you clicked **Block**: click the icon to the
left of the address, open **Site settings**, set the local network or "apps on this device" permission to **Allow**,
and reload by clicking **Open dashboard** again.

**4. Is it the right address?** The app only accepts `https://spiro-12.github.io` and the local development addresses.
If the app's log says `Blocked a website: <address>`, the page came from somewhere else. A fork with its own dashboard
must add its address: see [Make it yours](make-it-yours.md#host-your-own-dashboard-fork).

**5. Connected, but 0 Hz?** Then the app has no motion to send. Check the app's **AirPods** box:

| It says | Fix |
|---|---|
| Headphones: **Not connected (put the AirPods in)** | Put the AirPods in your ears. Make sure they are connected to **this Mac** (not your phone) and are the Mac's sound output (Control Center > Sound). Take them out and put them back in. |
| Motion permission: **Denied** | See [I missed a permission popup](#i-missed-a-permission-popup-or-clicked-dont-allow). |
| Headphones: **Not available on this Mac** | This Mac or macOS version cannot read AirPods motion. You need macOS 14 or newer. |
| Live rate stays 0 with everything green | Your AirPods may not support head tracking. See the list in [Setup](setup.md#what-you-need). |

To test the pipe without AirPods, turn on **Simulate motion** in the app's Settings. The dashboard should show about
50 Hz of fake motion. (Simulated motion never runs actions.)

## The signal is choppy

The page says **Signal is choppy**, the rate is well below 50 Hz (or 25 Hz on older AirPods), or **Dropped** is over 5%.

- Keep the Mac close, with nothing between you and it.
- Turn off other Bluetooth devices you are not using.
- Try with noise cancellation off (the research notes report dropouts in that mode).
- Quit and reopen the app, then click **Open dashboard** again.

Takes recorded while the signal froze are rejected on purpose ("The AirPods signal froze" or "was patchy"), so they
cannot poison your model.

## Not paired

You see **Not paired** or "This dashboard isn't paired with your Mac app. Open it from the Mac app's link."

The page has lost the secret pairing code. That happens when you reload the page, open it from a bookmark, or type the
address. Fix: click **Open dashboard** in the Mac app window and use that new tab.

If the app's **Pairing** row says **No token: every action is refused**, the app could not create its code file in
`~/.silentspeech`. Check the log for why, quit the app (Cmd+Q) and open it again. If the log says
`Pairing: token reset: bad permissions`, the app made a new code: click **Open dashboard** again.

## It always says Not sure

1. **Wrong ear.** Check the Head pose card: **Sensor in the left AirPod** or right. It must be the ear you recorded
   with. Wear one AirPod, or record a session with each ear.
2. **Out of date model.** In Recognize mode, press **Re-train**. The model line should say **Your model: N recordings**.
   If it says **Spiro's model** or **preview**, you have not recorded every sentence 5 times yet.
3. **Not enough takes.** Record another session, ideally at another time.
4. **Takes cut short.** Press Space a moment before you start and let go a moment after you finish.
5. **Too small, or head moving.** Mouth bigger, keep your head still (rest it against a chair).

The full advice: [Train it on your mouth](calibration.md).

## It recognizes, but nothing happens

The chip under the sentence says **Would: ...** and why. The common ones:

| The chip says | Fix |
|---|---|
| Safe mode: turn on Armed in the Mac app | Turn on **Armed** in the app's Settings box. |
| Record all 8 sentences (5 each) to run actions | Record every sentence, "Mouth closed" included, at least 5 times in this browser. |
| Re-train to use your model | Press **Re-train**. |
| Texts need it to be very sure. Say it again | Texts need 70% and the model's accept. Say it again, clearly. |
| Not sure enough. Say it again | Below 50%. Say it again. |
| The Mac app is in Simulate mode | Turn off **Simulate motion** in the app. |
| Not paired. Open this page from the Mac app's link | See [Not paired](#not-paired). |
| Just did one. Wait 3 seconds | At most one action every 3 seconds. |
| You started in Record mode. Say it again | The take began before you switched modes. Say it again. |
| The connection changed while you were talking. Say it again | Say it again. |
| Replay, so just a preview / Fake data, so just a preview | Open the page from the app's **Open dashboard** button to use your AirPods. |

A popup message can also say:

- **Too soon**: the Mac waits 3 seconds between runs of the same action, and **30 seconds** for the three texting
  sentences.
- **Dry run**: the app is not Armed.
- **Needs permission**: see the next section.

On the **demo screen**, texts never send, by design. See [Make it yours](make-it-yours.md#the-demo-screen).

## I missed a permission popup, or clicked Don't Allow

macOS asks once per kind of access. To change an answer:

| Access | Where to turn it on | Or reset it in Terminal, then reopen the app and try again |
|---|---|---|
| **Motion** (AirPods motion) | System Settings > Privacy & Security, then **Motion & Fitness** > Silent Speech Bridge. If you don't see it, look for Silent Speech Bridge in the Privacy & Security list | `tccutil reset All com.spiro.SilentSpeechBridge` (resets every permission of the app) |
| **Messages, Music, Spotify** | System Settings > Privacy & Security > **Automation** > Silent Speech Bridge > Messages (or Music, Spotify) | `tccutil reset AppleEvents com.spiro.SilentSpeechBridge` |
| **Calendar** | System Settings > Privacy & Security > **Calendars** > Silent Speech Bridge > **Full Access** | `tccutil reset Calendar com.spiro.SilentSpeechBridge` |
| **Chrome reaching the app** | In Chrome: the icon left of the address > Site settings > allow local network / apps on this device | |

If the log says `macOS showed no permission popup for Messages, so nothing ran`, run the `AppleEvents` reset above,
reopen the app, and try the action again while watching for the popup.

**macOS asks again after every rebuild?** If you build from source, run `mac/make-cert.sh` once (see
[Setup, option B](setup.md#option-b-build-it-from-source)). A new download of the app may also ask once more.

## Texts do not go out

| You see | Fix |
|---|---|
| **No contact set** | Click **Text contact…** in the app and save a number. |
| **Contact problem** | The number needs + and the country code. Set it again with **Text contact…**. |
| **Needs permission** | Allow Silent Speech Bridge to control Messages (see the table above). |
| **One moment** | An earlier text is still waiting, usually on a permission popup. Answer the popup. A request that waits over 60 seconds is dropped. |
| The log says **Can't get account** or **Messages said: ...** | Open Messages on the Mac and sign in to iMessage with your Apple Account. |
| It said **Sending**, but the text never arrived | "Sending" means Messages was asked to send it. Check the conversation in Messages on the Mac. **Before you send it again, check whether it arrived**: the app never resends by itself. |

## Music, calendar or speech problems

**Focus music plays nothing or the wrong thing.**

- Check the app's **Plays:** line. Set it with **Focus music…**.
- A playlist name must match a playlist in your Music library exactly.
- Apple Music links need an Apple Music subscription and Music signed in. Without one, the app shuffles your library.
  If your library is empty too, the log says `No focus music`.
- Spotify must be installed and logged in.
- The log line `focus_music done: playing <track> by <artist>` says what really played.

**The calendar says "I can't read your calendar yet."** Give the app **Full Access** to Calendars (table above).

**The calendar reads a plain list, not a nice sentence.** The friendly summary needs macOS 26 with Apple Intelligence
turned on. Otherwise the app reads a plain list. Both are fine.

**Speech comes out of the wrong speaker.** The Mac speaks through its current sound output. Choose your AirPods in
Control Center > Sound.

## The app keeps my Mac awake

On purpose: while it runs, the app stops the Mac from sleeping so the motion keeps flowing. **Quit it with Cmd+Q**
when you are done. Closing the window does not quit it (click the Dock icon to get the window back).

## Port 8765 is in use

The app's **Server** row says the port is in use: another copy of the app is probably still running. Quit every copy
(Cmd+Q, or Activity Monitor), then open the app again. The app tries again by itself every 2 seconds, and the
**Retry** button does it at once.

## My recordings are gone

Your takes live in the browser's storage, for that browser and that site only:

- Another browser, another Chrome profile, or a private window does not have them.
- Clearing Chrome's site data for `spiro-12.github.io` deletes them.
- If the Record screen said **Autosave is off in this browser**, the takes were only kept on that page.

Use **Export JSON** after every session. **Import JSON** brings an export back.

## Still stuck

[Open an issue](https://github.com/Spiro-12/silent-speech/issues/new/choose) with the bug report form. It asks for your
macOS version, AirPods model, which AirPod is the sensor, the rate the page shows, and your browser. The last lines of
the app's **Log box** (in its window) help a lot. The Log box never shows your full number or the pairing code, but
read the lines before you paste. (The log *file* holds the pairing link if you started the app with the developer
option `--print-pair-url`: never share that line.)
