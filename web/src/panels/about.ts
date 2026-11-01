import type { Panel } from '../core/app';
import { NONE } from '../core/contracts';
import { REPO_URL, SETUP_GUIDE_URL } from '../core/links';

const panel: Panel = {
  id: 'about',
  order: 900,
  title: 'What is this?',
  mount(el, app) {
    const n = app.classes.filter((c) => c.id !== NONE).length;
    el.innerHTML = `
      <p>Talk to your Mac without making a sound. Wear AirPods and silently mouth one of ${n} sentences, like
      “Text mom I’m on my way” or “Turn the volume up”. The motion sensor in the AirPods picks up the tiny movements
      of your jaw, this page works out which sentence it was, and your Mac does it.</p>
      <p class="muted">No AirPods handy? The page opens with a replay of a real session by Spiro, who made this.
      Press “Try it yourself with fake data”, pick a sentence at the top, and hold <kbd>Space</kbd>.</p>
      <p class="muted">It uses motion only, never sound. Your recordings stay in this browser, and the Mac app only
      talks to this page on your own computer. Free and open source (MIT license).</p>
      <p class="muted"><a href="${REPO_URL}" target="_blank" rel="noopener">Code on GitHub</a> ·
        <a href="${SETUP_GUIDE_URL}" target="_blank" rel="noopener">Setup guide</a></p>`;
  },
};
export default panel;
