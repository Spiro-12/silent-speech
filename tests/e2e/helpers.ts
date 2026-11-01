// Helpers shared by the e2e specs (not a spec itself: Playwright only runs *.spec.ts).
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import type { Dataset } from '../../web/src/core/contracts';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const synthetic = JSON.parse(read('../../shared/fixtures/dataset.synthetic.json')) as Dataset;
/** The synthetic fixture as if it were real AirPods recordings: 8 sentences, 15 takes each (5 per session). */
export const REAL: Dataset = { ...synthetic, source: 'airpods', session: 'real' };
/** Session s1 only: every sentence 5 times (enough for "your model"), and light on the Record panel's live accuracy check. */
export const REAL_S1: Dataset = { ...REAL, clips: REAL.clips.filter((c) => c.session === 's1') };

/** Collects uncaught page errors (expect it to stay empty). */
export function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Switches to Recognize mode with the header button. */
export async function recognize(page: Page) {
  await page.getByTestId('mode-toggle').click();
  await expect.poll(() => page.evaluate(() => window.__ss.app.mode)).toBe('classify');
}

/** Actions may only ever go to a mock. */
export async function assertMockBridge(page: Page) {
  await expect.poll(() => page.evaluate(() => window.__ss.app.lastHello?.app ?? null)).toBe('MockBridge');
}

/** Adds clips as if recorded in this browser with real AirPods (meta origin 'recorded'), like the Record panel does. */
export const addRecorded = (page: Page, ds: Dataset) => page.evaluate(async (ds) => {
  const store = window.__ss.app.store;
  await store.ready;
  for (const c of ds.clips) {
    store.add({ ...c, session: c.session ?? ds.session }, { source: 'airpods', subject: 'spiro', device: { model: 'AirPods Pro 3', loc: 'left' }, hz: 25, origin: 'recorded' });
  }
}, ds);

/** Imports a dataset file (meta origin 'imported'). */
export const addImported = (page: Page, ds: Dataset) => page.evaluate(async (ds) => {
  await window.__ss.app.store.ready;
  window.__ss.app.store.load(ds);
}, ds);
