// Setup card, right under the main panel (setup/logic.ts decides what it shows):
// - Visitors (replay or fake AirPods): "Set it up on your Mac": 4 short steps, the download and the setup guide.
// - Live, but the Mac app can't be reached: the same card, headed "Can't reach the Mac app".
// - Live and connected: a small getting started checklist that ticks itself from app state. Collapsible; it
//   folds itself away the first time everything is done, and after that stays the way the person leaves it.
import './setup/setup.css';
import type { App, Panel } from '../core/app';
import type { StatusMsg } from '../core/contracts';
import { DOWNLOAD_URL, REPO_URL, SETUP_GUIDE_URL } from '../core/links';
import { isOwnModel } from './result';
import { actionReadiness, realClips, type Readiness } from './result/model-source';
import { OFFLINE_AFTER_MS, checklist, setupView, type SetupView } from './setup/logic';

const PREFS_KEY = 'ss.setup';
interface Prefs { open?: boolean; done?: boolean } // open: the person's own choice; done: everything was ticked once

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Prefs | null;
    return p && typeof p === 'object' ? { open: typeof p.open === 'boolean' ? p.open : undefined, done: p.done === true } : {};
  } catch { return {}; } // storage blocked or junk
}

const TEMPLATE = `
<div class="su">
  <div class="su-visitor" data-testid="setup-card" data-ref="visitor" hidden>
    <div class="su-intro">
      <h3 class="su-head" data-testid="setup-head" data-ref="head"></h3>
      <div class="su-sub" data-ref="sub"></div>
      <div class="su-btns">
        <a class="su-btn su-primary" data-testid="setup-download" href="${DOWNLOAD_URL}">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M3 13h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Download the Mac app</a>
        <a class="su-btn" data-testid="setup-guide" href="${SETUP_GUIDE_URL}" target="_blank" rel="noopener">Setup guide</a>
      </div>
      <a class="su-gh" data-testid="setup-github" href="${REPO_URL}" target="_blank" rel="noopener">Code on GitHub</a>
    </div>
    <ol class="su-steps">
      <li><span class="su-n">1</span><b>AirPods and a Mac</b>
        <span>AirPods with head tracking (Pro, Max, or 3rd generation and newer) and a Mac on macOS 14 or later.</span></li>
      <li><span class="su-n">2</span><b>Get the Mac app</b>
        <span>Download it, unzip it, and open SilentSpeechBridge. The setup guide shows what to click if macOS asks.</span></li>
      <li><span class="su-n">3</span><b>Click “Open dashboard”</b>
        <span>The Mac app opens this page, connected. Chrome may ask to let it reach apps on your Mac: click Allow.</span></li>
      <li><span class="su-n">4</span><b>Record, then Recognize</b>
        <span>Record each sentence 5 times, switch to Recognize, and silently mouth one. Your Mac does it.</span></li>
    </ol>
  </div>
  <details class="su-check" data-testid="setup-checklist" data-ref="check" hidden>
    <summary data-testid="setup-summary">
      <span class="su-sum-title">Getting started</span>
      <span class="su-count" data-testid="setup-count" data-ref="count"></span>
      <span class="su-meter" aria-hidden="true"><i data-ref="meter"></i></span>
      <span class="su-next" data-ref="next"></span>
    </summary>
    <ol class="su-items" data-ref="items"></ol>
  </details>
</div>`;

const HEAD: Record<'visitor' | 'offline', { title: string; head: string; sub: string }> = {
  visitor: {
    title: 'Set it up on your Mac',
    head: 'Try it with your own AirPods',
    sub: 'Free and open source. No sound, no account: your recordings stay in this browser on your Mac.',
  },
  offline: {
    title: 'Connect the Mac app',
    head: 'Can’t reach the Mac app',
    sub: 'Is SilentSpeechBridge running? Open this page from its “Open dashboard” button. Chrome may ask to let this page reach apps on your Mac: click Allow. No Mac app yet? Here is how to set it up.',
  },
};

class SetupPanel {
  private r: Record<string, HTMLElement> = {};
  private card: HTMLElement | null;
  private h2: HTMLElement | null;
  private sourceAt = performance.now();
  private connectedOnce = false; // the Mac app answered at least once on this source
  private open = false; // the connection is open right now
  private status: StatusMsg | null = null; // from the current connection only
  private recorded: Readiness = { ready: false, done: 0, total: 0 };
  private restored = false;
  private prefs = loadPrefs();
  private wantOpen: boolean | null = null; // what this panel last set <details> to (null: not shown yet)
  private offlineTimer: ReturnType<typeof setTimeout> | null = null;
  private itemsHtml = '';

  constructor(el: HTMLElement, private app: App) {
    this.card = el.closest('.card');
    this.h2 = this.card?.querySelector('h2') ?? null;
    this.card?.classList.add('wide');
    if (this.card) this.card.id = 'setup'; // the replay bar links here
    el.innerHTML = TEMPLATE;
    for (const n of el.querySelectorAll<HTMLElement>('[data-ref]')) this.r[n.dataset.ref!] = n;
    this.recorded.total = app.classes.length;
    this.wire();
    this.render();
  }

  private wire() {
    const { app } = this;
    app.bus.on('source', () => {
      this.sourceAt = performance.now();
      this.connectedOnce = false;
      this.open = false;
      this.status = null;
      if (this.offlineTimer) clearTimeout(this.offlineTimer);
      this.offlineTimer = setTimeout(() => this.render(), OFFLINE_AFTER_MS + 20);
      this.render();
    });
    app.bus.on('conn', (c) => {
      this.open = c.state === 'open';
      if (this.open) this.connectedOnce = true;
      else this.status = null; // device info is only true while connected
      this.render();
    });
    app.bus.on('hello', () => { this.connectedOnce = true; this.render(); });
    app.bus.on('status', (s) => { this.status = s; this.render(); });
    app.bus.on('model', () => this.render());
    app.store.onChange(() => this.refreshRecorded());
    void app.store.ready.then(() => { this.restored = true; this.refreshRecorded(); });

    const details = this.r.check as HTMLDetailsElement;
    details.addEventListener('toggle', () => {
      if (details.open === this.wantOpen) return; // this panel opened or closed it
      this.wantOpen = details.open; // the person did: remember their choice
      this.prefs.open = details.open;
      this.savePrefs();
    });
    // Focus left on the summary would turn the next Space press into a toggle instead of push to talk.
    const summary = details.querySelector('summary')!;
    summary.addEventListener('click', () => setTimeout(() => summary.blur(), 0));
  }

  private refreshRecorded() {
    if (!this.restored) return;
    const ids = this.app.classes.map((c) => c.id);
    const rec = realClips(this.app.store.all(), (id) => this.app.store.meta(id), ids, { recordedOnly: true });
    this.recorded = actionReadiness(rec, ids);
    this.render();
  }

  private savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch { /* storage blocked: it just won't stick */ }
  }

  private view(): SetupView {
    return setupView({
      source: this.app.source?.kind ?? null, connectedOnce: this.connectedOnce, msSinceSource: performance.now() - this.sourceAt,
    });
  }

  private render() {
    const { r } = this;
    const view = this.view();
    if (this.card) {
      this.card.hidden = view === 'hidden';
      this.card.dataset.view = view;
    }
    r.visitor.hidden = view !== 'visitor' && view !== 'offline';
    r.check.hidden = view !== 'checklist';
    if (view === 'visitor' || view === 'offline') {
      const h = HEAD[view];
      setText(this.h2, h.title);
      setText(r.head, h.head);
      setText(r.sub, h.sub);
      r.visitor.dataset.variant = view;
    } else if (view === 'checklist') {
      setText(this.h2, 'Getting started');
      this.renderChecklist();
    }
  }

  private renderChecklist() {
    const { r } = this;
    const items = checklist({
      open: this.open, status: this.status, recorded: this.recorded, ownModel: isOwnModel(this.app.model), paired: !!this.app.pairToken,
    });
    const done = items.filter((i) => i.done).length;
    const all = done === items.length;
    const html = items.map((it, i) => `<li data-testid="check-${it.id}" data-done="${it.done ? 1 : 0}">
      <span class="su-tick" aria-hidden="true">${it.done ? '✓' : i + 1}</span>
      <div><b>${esc(it.title)}</b><span>${esc(it.detail)}</span></div>
      <span class="su-sr">${it.done ? 'Done' : 'Not done yet'}</span></li>`).join('');
    if (this.itemsHtml !== html) { r.items.innerHTML = html; this.itemsHtml = html; }
    setText(r.count, all ? 'You’re all set' : `${done} of ${items.length} done`);
    r.check.dataset.all = all ? '1' : '0';
    r.meter.style.width = `${(100 * done) / items.length}%`;
    const next = items.find((i) => !i.done);
    setText(r.next, next ? `Next: ${next.title}` : 'All 5 done');

    // Open or folded: the person's own choice wins; otherwise open until everything was done once.
    if (this.wantOpen === null) this.setOpen(this.prefs.open ?? !(this.prefs.done || all));
    if (all && !this.prefs.done) { // done for the first time ever: fold it away, once. After that it's theirs.
      this.prefs = { done: true };
      this.savePrefs();
      this.setOpen(false);
    }
  }

  private setOpen(open: boolean) {
    this.wantOpen = open;
    (this.r.check as HTMLDetailsElement).open = open;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const setText = (n: Element | null, t: string) => { if (n && n.textContent !== t) n.textContent = t; };

const panel: Panel = {
  id: 'setup',
  order: 45, // after Recognize (5) and Record (40), so it lands right under whichever of them is on top
  title: 'Set it up on your Mac',
  mount(el, app) { new SetupPanel(el, app); },
};
export default panel;
