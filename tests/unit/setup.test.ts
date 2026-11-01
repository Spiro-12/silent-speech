import { describe, expect, it } from 'vitest';
import { fakeStatus } from '../../web/src/core/synth';
import { OFFLINE_AFTER_MS, checklist, setupView, type CheckInput } from '../../web/src/panels/setup/logic';

describe('setupView', () => {
  it('visitors (replay, fake) get the setup card', () => {
    expect(setupView({ source: 'replay', connectedOnce: false, msSinceSource: 0 })).toBe('visitor');
    expect(setupView({ source: 'fake', connectedOnce: true, msSinceSource: 0 })).toBe('visitor');
  });
  it('live: nothing while it first connects, "can’t reach" after a moment, the checklist once connected', () => {
    expect(setupView({ source: 'live', connectedOnce: false, msSinceSource: 200 })).toBe('hidden');
    expect(setupView({ source: 'live', connectedOnce: false, msSinceSource: OFFLINE_AFTER_MS })).toBe('offline');
    expect(setupView({ source: 'live', connectedOnce: true, msSinceSource: 200 })).toBe('checklist');
    expect(setupView({ source: 'live', connectedOnce: true, msSinceSource: 60_000 })).toBe('checklist');
  });
  it('no source yet: hidden', () => {
    expect(setupView({ source: null, connectedOnce: false, msSinceSource: 9999 })).toBe('hidden');
  });
});

describe('checklist', () => {
  const none = { ready: false, done: 0, total: 8 };
  const all = { ready: true, done: 8, total: 8 };
  const base: CheckInput = { open: true, status: fakeStatus({ simulated: false, hz: 50 }), recorded: none, ownModel: false, paired: true };
  const byId = (i: CheckInput) => Object.fromEntries(checklist(i).map((c) => [c.id, c]));

  it('has the 5 steps in order', () => {
    expect(checklist(base).map((c) => c.id)).toEqual(['connected', 'sensor', 'recorded', 'model', 'armed']);
  });

  it('connected: real AirPods at a healthy rate (about 50 Hz, or 25)', () => {
    expect(byId(base).connected).toMatchObject({ done: true, detail: 'AirPods streaming at 50 Hz' });
    expect(byId({ ...base, status: fakeStatus({ simulated: false, hz: 25 }) }).connected.done).toBe(true);
    expect(byId({ ...base, status: fakeStatus({ simulated: false, hz: 12 }) }).connected).toMatchObject({ done: false, detail: expect.stringContaining('12 Hz') });
    expect(byId({ ...base, status: fakeStatus({ simulated: true, hz: 50 }) }).connected).toMatchObject({ done: false, detail: expect.stringContaining('Simulate') });
    expect(byId({ ...base, status: fakeStatus({ simulated: false, headphones: 'disconnected' }) }).connected.detail).toBe('Put in your AirPods');
    expect(byId({ ...base, status: fakeStatus({ simulated: false, auth: 'denied' }) }).connected.detail).toContain('motion access');
    expect(byId({ ...base, open: false, status: null }).connected).toMatchObject({ done: false, detail: expect.stringContaining('Can’t reach the Mac app') });
    expect(byId({ ...base, status: null }).connected.done).toBe(false);
  });

  it('connected: not without the pairing token (a reload or a bookmark loses it, and every action is refused)', () => {
    const c = byId({ ...base, paired: false, status: fakeStatus({ simulated: false, hz: 50, armed: true }), recorded: all, ownModel: true });
    expect(c.connected).toMatchObject({ done: false, detail: 'Open this page from the Mac app’s “Open dashboard” button' });
    expect(checklist({ ...base, paired: false, recorded: all, ownModel: true }).every((i) => i.done)).toBe(false);
  });

  it('sensor: left or right, with the same ear tip; unknown is not done', () => {
    expect(byId(base).sensor).toMatchObject({ done: true, title: 'Sensor: Left AirPod', detail: expect.stringContaining('same ear') });
    expect(byId({ ...base, status: fakeStatus({ simulated: false, loc: 'right' }) }).sensor.title).toBe('Sensor: Right AirPod');
    expect(byId({ ...base, status: fakeStatus({ simulated: false, loc: 'unknown' }) }).sensor.done).toBe(false);
    expect(byId({ ...base, open: false }).sensor.done).toBe(false); // only true while connected
    expect(byId({ ...base, status: fakeStatus({ simulated: true, loc: 'left' }) }).sensor).toMatchObject({ done: false, detail: expect.stringContaining('Simulate') });
  });

  it('recorded: x of 8 done in this browser', () => {
    expect(byId({ ...base, recorded: { ready: false, done: 3, total: 8 } }).recorded).toMatchObject({ done: false, detail: '3 of 8 done in this browser' });
    expect(byId({ ...base, recorded: all }).recorded).toMatchObject({ done: true, detail: '8 of 8 done in this browser' });
  });

  it('model: ticked only by "your model"; says what to do next', () => {
    expect(byId(base).model).toMatchObject({ done: false, detail: 'After recording, switch to Recognize' });
    expect(byId({ ...base, recorded: all }).model.detail).toContain('Switch to Recognize');
    expect(byId({ ...base, recorded: all, ownModel: true }).model.done).toBe(true);
  });

  it('armed: from the Mac app’s status while connected', () => {
    expect(byId(base).armed.done).toBe(false);
    expect(byId({ ...base, status: fakeStatus({ simulated: false, armed: true }) }).armed.done).toBe(true);
    expect(byId({ ...base, open: false, status: fakeStatus({ armed: true }) }).armed.done).toBe(false);
  });
});
