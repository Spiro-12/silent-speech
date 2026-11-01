# FAQ

**Does it use the microphone?**
No. Only the AirPods' motion sensor. No sound is recorded or sent anywhere, and you mouth the words with no sound.

**Which AirPods work?**
AirPods with head tracking. Tested on AirPods Pro 3 (about 50 readings a second). AirPods Pro, AirPods Pro 2, AirPods
Max and AirPods (3rd generation) or newer should work, but nobody has tested them with this yet. Older models may send
only about 25 readings a second (reported in papers, not tested here). If you try one, please [tell us how it went](https://github.com/Spiro-12/silent-speech/issues/new/choose).

**Which Macs work?**
Any Mac with macOS 14 (Sonoma) or newer, Apple silicon or Intel. The friendly calendar summary needs macOS 26 with
Apple Intelligence on; otherwise the Mac reads a plain list.

**Why Chrome?**
The dashboard is a secure (https) web page that talks to the Mac app at a local address (`ws://127.0.0.1:8765`).
Chrome allows that after you click Allow once. Other browsers may block it. Chrome is the one we tested.

**Is anything sent to a server?**
No, apart from the texts you set up, which Messages sends like any iMessage. The dashboard is a static web page on GitHub Pages: no server behind it, no account, no analytics. Motion goes from
the Mac app to that page on your own Mac. Your takes stay in your browser's storage for the site unless you export
them. One thing to know: browsers share storage per site, so any page on `spiro-12.github.io` could read those takes.
That is also why the pairing code is never stored there.

**Why is the Mac app not signed by Apple?**
Signing and notarizing need a paid Apple developer account. So macOS asks you once to confirm (**Open Anyway**). You
can read every line of the app's code in [`mac/`](../mac/), check the download against the SHA-256 on the release page,
or [build it yourself](setup.md#option-b-build-it-from-source).

**Can it learn any sentence, or do dictation?**
No. It knows 7 fixed sentences plus "nothing", and it picks the closest one. It cannot type what you say. A fork can
change the sentences, but that means changing the code and recording again:
[Make it yours](make-it-yours.md#change-the-sentences-fork).

**Does it work for other people?**
Everyone trains their own model on their own mouth. So far it has only been tested on one person (Spiro), so we do not
know yet how well it works for others. Your results will differ.

**Will it text someone by accident?**
It is built hard against that. Armed is off at every launch and only you can turn it on. The page must be paired with
the app. A text needs your own complete model to be at least 70% sure. Texts only go to the one contact you set, each
texting sentence has a 30 second cooldown, and nothing is ever retried. On Spiro's data, no wrong action ran at the 70%
bar, but that is one person: start with your own number. See [Safety and privacy](safety-privacy.md).

**What does Simulate motion do?**
It makes the Mac app send fake motion (smooth waves, 50 a second) instead of the AirPods' readings, so you can check
the app and the dashboard talk to each other without AirPods. Simulated motion is never saved as real training data
and never runs actions.

**Does it keep my Mac awake?**
Yes, while it runs, so the motion keeps flowing. Quit it with **Cmd+Q**. Closing the window does not quit it.

**Something does not work.**
See [Troubleshooting](troubleshooting.md), then [open an issue](https://github.com/Spiro-12/silent-speech/issues/new/choose).
