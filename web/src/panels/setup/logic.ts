// Setup card logic (pure, no DOM, unit tested): which view the card shows, and the getting started checklist.
//
// - Visitors (replay or fake AirPods): "Set it up on your Mac" with the download link.
// - Live, but the Mac app can't be reached: the same card, headed "Can't reach the Mac app".
// - Live and connected (at least once on this source): a small checklist that ticks itself from app state.
import type { SourceKind } from '../../core/app';
import type { StatusMsg } from '../../core/contracts';
import type { Readiness } from '../result/model-source';
import { OFFLINE_AFTER_MS, rateOk } from '../status';

export { OFFLINE_AFTER_MS };

export type SetupView = 'visitor' | 'offline' | 'checklist' | 'hidden';

export function setupView(o: { source: SourceKind | null; connectedOnce: boolean; msSinceSource: number }): SetupView {
  if (o.source === 'replay' || o.source === 'fake') return 'visitor';
  if (o.source !== 'live') return 'hidden';
  if (o.connectedOnce) return 'checklist';
  return o.msSinceSource >= OFFLINE_AFTER_MS ? 'offline' : 'hidden';
}

export type CheckId = 'connected' | 'sensor' | 'recorded' | 'model' | 'armed';
export interface CheckItem { id: CheckId; done: boolean; title: string; detail: string }

export interface CheckInput {
  open: boolean; // the WebSocket to the Mac app is open right now
  status: StatusMsg | null; // latest status on this connection (null: none yet)
  recorded: Readiness; // takes recorded in this browser with real AirPods, per sentence
  ownModel: boolean; // the model on now is "your model"
  paired: boolean; // this page has the Mac app's pairing token (memory only: gone after a reload)
}

const SIDE: Record<string, string> = { left: 'Left', right: 'Right' };

export function checklist({ open, status: st, recorded, ownModel, paired }: CheckInput): CheckItem[] {
  const live = open && !!st;

  // 1. Connected, AirPods streaming at a healthy rate (about 50 Hz, or 25 on older AirPods)
  let connected: CheckItem;
  if (!open) connected = { id: 'connected', done: false, title: 'Connect the Mac app', detail: 'Can’t reach the Mac app. Is it running?' };
  else if (!st) connected = { id: 'connected', done: false, title: 'Connect the Mac app', detail: 'Connected, waiting for the Mac app…' };
  else {
    const hz = Math.round(st.hz);
    const title = 'Connected';
    // Without the token every action is refused, so it isn't really connected (a reload or a bookmark loses it).
    if (!paired) connected = { id: 'connected', done: false, title, detail: 'Open this page from the Mac app’s “Open dashboard” button' };
    else if (st.headphones === 'unavailable') connected = { id: 'connected', done: false, title, detail: 'This Mac can’t read AirPods motion (needs macOS 14 or later)' };
    else if (st.headphones !== 'connected') connected = { id: 'connected', done: false, title, detail: 'Put in your AirPods' };
    else if (st.auth !== 'authorized') connected = { id: 'connected', done: false, title, detail: 'Allow motion access for the Mac app' };
    else if (st.simulated) connected = { id: 'connected', done: false, title, detail: 'Simulate is on in the Mac app. Turn it off to use your AirPods' };
    else if (!rateOk(st.hz)) connected = { id: 'connected', done: false, title, detail: hz > 0 ? `AirPods at ${hz} Hz (should be about 50)` : 'No motion data yet' };
    else connected = { id: 'connected', done: true, title, detail: `AirPods streaming at ${hz} Hz` };
  }

  // 2. Which AirPod has the sensor
  const side = live && !st!.simulated ? SIDE[st!.loc] : undefined; // Simulate mode makes up a side
  const sensor: CheckItem = side
    ? { id: 'sensor', done: true, title: `Sensor: ${side} AirPod`, detail: 'Tip: record and use it with the same ear' }
    : { id: 'sensor', done: false, title: 'Sensor AirPod', detail: !live ? 'Shows once the AirPods stream' : st!.simulated ? 'Shows once Simulate is off' : 'Not known yet' };

  // 3. Every sentence recorded 5+ times in this browser
  const rec: CheckItem = {
    id: 'recorded', done: recorded.ready, title: 'Record 5 of each sentence',
    detail: `${recorded.done} of ${recorded.total} done in this browser`,
  };

  // 4. "Your model" trained (the Recognize screen does it once 3 is done)
  const model: CheckItem = ownModel
    ? { id: 'model', done: true, title: 'Your model is trained', detail: '“Your model” is on in Recognize' }
    : { id: 'model', done: false, title: 'Train your model', detail: recorded.ready ? 'Switch to Recognize: it trains by itself' : 'After recording, switch to Recognize' };

  // 5. Armed: actions really run (off is a safe dry run)
  const armed: CheckItem = live && st!.armed
    ? { id: 'armed', done: true, title: 'Armed', detail: 'Sentences really run on your Mac' }
    : { id: 'armed', done: false, title: 'Arm the Mac app', detail: 'Turn on Armed when you want sentences to really run' };

  return [connected, sensor, rec, model, armed];
}
