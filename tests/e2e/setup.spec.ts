// First time visitors: the "Set it up on your Mac" card, the "can't reach the Mac app" help, the getting started
// checklist for live users, and the share preview tags. Live tests use their own mock bridges (never 8765).
import { expect, test, type Page } from '@playwright/test';
import { BASE } from '../../playwright.config';
import { DOWNLOAD_URL, REPO_URL, SETUP_GUIDE_URL } from '../../web/src/core/links';
import { startMockBridge, type MockBridge } from '../mock-bridge';
import { REAL_S1, addRecorded, assertMockBridge, pageErrors, recognize } from './helpers';

const ORIGIN = new URL(BASE).origin;
const live = (port: number) => `./?mode=live&ws=${encodeURIComponent(`ws://127.0.0.1:${port}`)}`;
const card = (page: Page) => page.locator('.card[data-panel=setup]');
const top = (page: Page, panel: string) => page.locator(`.card[data-panel=${panel}]`).evaluate((el) => el.getBoundingClientRect().top);
const done = (page: Page, id: string) => page.getByTestId(`check-${id}`);

/** A port with nothing listening on it (a bridge took it, then let it go): "the Mac app isn't running". */
async function freePort(): Promise<number> {
  const b = await startMockBridge({ port: 0, allowOrigins: [ORIGIN], utterEvery: 0 });
  const { port } = b;
  await b.close();
  return port;
}

async function expectSetupLinks(page: Page) {
  await expect(page.getByTestId('setup-download')).toHaveAttribute('href', DOWNLOAD_URL);
  await expect(page.getByTestId('setup-guide')).toHaveAttribute('href', SETUP_GUIDE_URL);
  await expect(page.getByTestId('setup-github')).toHaveAttribute('href', REPO_URL);
  expect(DOWNLOAD_URL).toBe('https://github.com/Spiro-12/silent-speech/releases/latest/download/SilentSpeechBridge-macOS.zip');
  expect(SETUP_GUIDE_URL).toBe('https://github.com/Spiro-12/silent-speech/blob/main/docs/setup.md');
}

test('visitor watching the replay: the setup card sits right under the demo, with the download and the guide', async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto('./');
  await expect(page.getByTestId('source-pill')).toHaveText('replay · open');
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toHaveAttribute('data-view', 'visitor');
  await expect(card(page).locator('h2')).toHaveText('Set it up on your Mac');
  await expect(page.getByTestId('setup-card')).toBeVisible();
  await expect(page.getByTestId('setup-card').locator('.su-steps li')).toHaveCount(4);
  await expect(page.getByTestId('setup-card')).toContainText('Open dashboard');
  await expect(page.getByTestId('setup-card')).toContainText('macOS 14');
  await expectSetupLinks(page);
  await expect(page.getByTestId('setup-checklist')).toBeHidden();
  await expect(page.getByTestId('status-help')).toBeHidden(); // nothing is wrong: it's a replay

  // The replay and the Recognize stage come first; the card comes right after them, before everything else.
  expect(await top(page, 'replay')).toBeLessThan(await top(page, 'result'));
  expect(await top(page, 'result')).toBeLessThan(await top(page, 'setup'));
  for (const id of ['status', 'head3d', 'charts', 'about', 'enroll']) expect(await top(page, 'setup')).toBeLessThan(await top(page, id));

  // The replay bar links down to it, without putting #setup in the address bar.
  await page.getByTestId('setup-jump').click();
  await expect(page.getByTestId('setup-download')).toBeInViewport();
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test('visitor with fake AirPods sees the same card', async ({ page }) => {
  await page.goto('./?mode=fake');
  await expect(page.getByTestId('source-pill')).toHaveText(/fake · open/);
  await expect(card(page)).toHaveAttribute('data-view', 'visitor');
  await expect(page.getByTestId('setup-card')).toBeVisible();
  await expectSetupLinks(page);
  expect(await top(page, 'enroll')).toBeLessThan(await top(page, 'setup')); // Record mode: the Record panel stays on top
  await recognize(page);
  expect(await top(page, 'result')).toBeLessThan(await top(page, 'setup'));
});

test('live, but the Mac app is not running: plain words on what to do, with the download link', async ({ page }) => {
  const errors = pageErrors(page);
  await page.goto(live(await freePort()));
  await expect(page.getByTestId('source-pill')).toHaveText(/live · (closed|connecting)/);
  const help = page.getByTestId('status-help');
  await expect(help).toBeVisible();
  await expect(help).toContainText('can’t reach the Mac app');
  await expect(help).toContainText('Open dashboard');
  await expect(help).toContainText('Chrome may ask');
  await expect(help).toContainText('Allow');
  await expect(page.getByTestId('status-download')).toHaveAttribute('href', DOWNLOAD_URL);
  await expect(page.locator('.card[data-panel=status] .headline')).toHaveText('Can’t reach the Mac app');
  // The setup card says it too, with the same links.
  await expect(card(page)).toHaveAttribute('data-view', 'offline');
  await expect(page.getByTestId('setup-head')).toHaveText('Can’t reach the Mac app');
  await expect(page.getByTestId('setup-card')).toContainText('Open dashboard');
  await expectSetupLinks(page);
  expect(errors).toEqual([]);
});

test('live and connected: the setup card goes away and the checklist ticks itself (connect, record, train, armed)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = pageErrors(page);
  const port = await freePort();
  let bridge: MockBridge | null = null;
  try {
    await page.goto(live(port));
    await expect(card(page)).toHaveAttribute('data-view', 'offline');

    // The Mac app starts (real AirPods, not armed): the page connects by itself.
    bridge = await startMockBridge({ port, allowOrigins: [ORIGIN], utterEvery: 0, real: true });
    await expect(page.getByTestId('source-pill')).toHaveText('live · open', { timeout: 15_000 });
    await assertMockBridge(page);
    await expect(card(page)).toHaveAttribute('data-view', 'checklist');
    await expect(page.getByTestId('setup-card')).toBeHidden();
    await expect(page.getByTestId('status-help')).toBeHidden();
    await expect(page.getByTestId('setup-checklist')).toBeVisible();
    await expect(page.getByTestId('setup-checklist')).toHaveAttribute('open', '');
    await expect(done(page, 'connected')).toHaveAttribute('data-done', '1');
    await expect(done(page, 'connected')).toContainText('25 Hz');
    await expect(done(page, 'sensor')).toHaveAttribute('data-done', '1');
    await expect(done(page, 'sensor')).toContainText('Left AirPod');
    await expect(done(page, 'sensor')).toContainText('same ear');
    for (const id of ['recorded', 'model', 'armed']) await expect(done(page, id)).toHaveAttribute('data-done', '0');
    await expect(done(page, 'recorded')).toContainText('0 of 8 done');
    await expect(page.getByTestId('setup-count')).toHaveText('2 of 5 done');

    // Record 5 of each sentence (the store, as the Record panel would): 3 sentences first, then all of them.
    const some = (ids: string[]) => ({ ...REAL_S1, clips: REAL_S1.clips.filter((c) => ids.includes(c.label)) });
    await addRecorded(page, some(['text_mom', 'volume_up', 'call_back']));
    await expect(done(page, 'recorded')).toContainText('3 of 8 done');
    await expect(done(page, 'recorded')).toHaveAttribute('data-done', '0');
    await addRecorded(page, REAL_S1);
    await expect(done(page, 'recorded')).toContainText('8 of 8 done');
    await expect(done(page, 'recorded')).toHaveAttribute('data-done', '1');
    await expect(done(page, 'model')).toHaveAttribute('data-done', '0');

    // Recognize trains "your model".
    await recognize(page);
    await expect(page.getByTestId('result-model')).toHaveAttribute('data-kind', 'own');
    await expect(done(page, 'model')).toHaveAttribute('data-done', '1');
    await expect(page.getByTestId('setup-count')).toHaveText('4 of 5 done');

    // Armed in the Mac app: all done, and the checklist folds itself away.
    bridge.setArmed(true);
    await expect(done(page, 'armed')).toHaveAttribute('data-done', '1');
    await expect(page.getByTestId('setup-count')).toHaveText('You’re all set');
    await expect(page.getByTestId('setup-checklist')).not.toHaveAttribute('open', '');
    await expect(page.getByTestId('setup-summary')).toBeVisible();

    // No nagging: Armed off again (4 of 5), and after a reload too, it stays folded.
    bridge.setArmed(false);
    await expect(done(page, 'armed')).toHaveAttribute('data-done', '0');
    await expect(page.getByTestId('setup-checklist')).not.toHaveAttribute('open', '');
    await page.evaluate(() => window.__ss.app.store.flush()); // every recording saved before the reload
    expect(await page.evaluate(() => window.__ss.app.store.health().error)).toBeNull();
    await page.reload();
    await expect(page.getByTestId('source-pill')).toHaveText('live · open');
    await expect(done(page, 'recorded')).toHaveAttribute('data-done', '1', { timeout: 15_000 });
    await expect(page.getByTestId('setup-checklist')).toBeVisible();
    await expect(page.getByTestId('setup-checklist')).not.toHaveAttribute('open', '');
    // It still opens on a click.
    await page.getByTestId('setup-summary').click();
    await expect(page.getByTestId('setup-checklist')).toHaveAttribute('open', '');
    await expect(done(page, 'connected')).toBeVisible();

    // The Mac app quits: the item unticks and the Connection panel says what to do (the checklist stays).
    await bridge.close();
    bridge = null;
    await expect(done(page, 'connected')).toHaveAttribute('data-done', '0');
    await expect(page.getByTestId('status-help')).toBeVisible();
    await expect(card(page)).toHaveAttribute('data-view', 'checklist');
    expect(errors).toEqual([]);
  } finally {
    await bridge?.close();
  }
});

test('share previews: title, description, Open Graph and Twitter tags; og.png and the icons are served', async ({ page, request }) => {
  await page.goto('./?mode=fake');
  await expect(page).toHaveTitle('Silent Speech: talk to your Mac without making a sound');
  const meta = (sel: string) => page.locator(`head meta[${sel}]`).getAttribute('content');
  expect((await meta('name="description"'))?.length ?? 0).toBeGreaterThan(40);
  expect(await meta('name="theme-color"')).toBe('#0b0d12');
  const OG = 'https://spiro-12.github.io/silent-speech/og.png';
  expect(await meta('property="og:type"')).toBe('website');
  expect(await meta('property="og:url"')).toBe('https://spiro-12.github.io/silent-speech/');
  expect(await meta('property="og:title"')).toContain('Silent Speech');
  expect((await meta('property="og:description"'))?.length ?? 0).toBeGreaterThan(40);
  expect(await meta('property="og:image"')).toBe(OG);
  expect(await meta('property="og:image:width"')).toBe('1200');
  expect(await meta('property="og:image:height"')).toBe('630');
  expect(await meta('property="og:image:alt"')).toBeTruthy();
  expect(await meta('name="twitter:card"')).toBe('summary_large_image');
  expect(await meta('name="twitter:image"')).toBe(OG);
  expect(await meta('name="twitter:title"')).toContain('Silent Speech');
  await expect(page.locator('head link[rel=icon]')).toHaveAttribute('href', '/silent-speech/favicon.svg');
  await expect(page.locator('head link[rel=icon]')).toHaveAttribute('type', 'image/svg+xml');

  // The image the tags point at is in the build, at the Pages path: a 1200x630 PNG under 300 KB.
  const og = await request.get(new URL('og.png', BASE).href);
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
  const png = await og.body();
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]); // IHDR width, height
  expect(png.length).toBeLessThan(300 * 1024);
  const icon = await request.get(new URL('favicon.svg', BASE).href);
  expect(icon.status()).toBe(200);
  expect(await icon.text()).toContain('<svg');
  const touch = await request.get(new URL('apple-touch-icon.png', BASE).href);
  expect(touch.status()).toBe(200);
  expect(touch.headers()['content-type']).toContain('image/png');
});
