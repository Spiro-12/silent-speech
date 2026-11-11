// The extra analyses in docs/technical-report.md (sections 5.2 to 5.5), from the published sessions:
//   npx tsx scripts/five-session-analysis.ts data/raw/ss-dataset-*.json data/raw/day2/ss-dataset-*.json --exclude data/raw/exclude.json
// Uses the model defaults (web/src/ml). Prints:
//   - leave one session out per session, and pooled over the left ear sessions and over all sessions (5.2)
//   - the confusion matrix over the left ear folds (5.2)
//   - trivial baselines: clip duration, and duration + per channel movement std, with the same kNN (5.3)
//   - accuracy against the number of training sessions, and against takes per class from one session (5.4)
//   - within session leave one clip out (5.4)
//   - coverage and wrong fires at confidence bars 0.5 to 0.9 on the left ear folds (5.5)
// Right ear sessions are mirrored into the left ear frame by the model (PROTOCOL §5 step 0) and stay in training.
import { readFileSync } from 'node:fs';
import type { Clip, Dataset } from '../web/src/core/contracts';
import { NONE } from '../web/src/core/contracts';
import { applyExclude, parseExclude } from '../web/src/ml/data';
import { evaluate, train } from '../web/src/ml/index';

interface Take extends Clip { pressT: number; releaseT: number }
interface Pred { truth: string; label: string; confidence: number; session: string }

const args = process.argv.slice(2);
const exIdx = args.indexOf('--exclude');
const excludeFile = exIdx >= 0 ? args[exIdx + 1] : undefined;
const files = args.filter((a, i) => a.endsWith('.json') && i !== exIdx + 1);
if (!files.length) { console.error('usage: five-session-analysis.ts <ss-dataset files...> [--exclude exclude.json]'); process.exit(2); }

const exclude = excludeFile ? parseExclude(JSON.parse(readFileSync(excludeFile, 'utf8'))) : new Set<string>();
const bySession = new Map<string, Take[]>();
for (const f of files) {
  const d = JSON.parse(readFileSync(f, 'utf8')) as Dataset;
  const clips = applyExclude(d.clips, exclude).clips as unknown as Take[];
  bySession.set(d.session, clips.map((c) => ({ ...c, session: d.session, loc: c.loc ?? d.device.loc })));
}
const sessions = [...bySession.keys()].sort();
const all = sessions.flatMap((s) => bySession.get(s)!);
const isLeft = (s: string) => bySession.get(s)![0].loc !== 'right';
const left = sessions.filter(isLeft);
const pct = (k: number, n: number) => `${(100 * k / n).toFixed(1)}% (${k}/${n})`;

function predict(trainClips: Take[], test: Take[], session: string): Pred[] {
  const model = train(trainClips);
  return test.map((c) => { const p = model.predict(c.samples, { loc: c.loc }); return { truth: c.label, label: p.label, confidence: p.confidence, session }; });
}
const acc = (ps: Pred[]) => ps.filter((p) => p.label === p.truth).length;

// 5.2 leave one session out
const loso: Pred[] = [];
console.log('5.2 Leave one session out (DTW defaults)');
for (const s of sessions) {
  const ps = predict(all.filter((c) => c.session !== s), bySession.get(s)!, s);
  loso.push(...ps);
  console.log(`  ${s} (${isLeft(s) ? 'left' : 'right'} ear): ${pct(acc(ps), ps.length)}`);
}
const leftPreds = loso.filter((p) => left.includes(p.session));
console.log(`  left ear pooled: ${pct(acc(leftPreds), leftPreds.length)}`);
console.log(`  all pooled: ${pct(acc(loso), loso.length)}`);

const labels = [...new Set(all.map((c) => c.label))].sort();
console.log('  confusion over the left ear folds (rows true, columns predicted):');
console.log(`  ${['true \\ pred', ...labels].join('\t')}`);
for (const t of labels) console.log(`  ${[t, ...labels.map((p) => leftPreds.filter((x) => x.truth === t && x.label === p).length)].join('\t')}`);

// 5.3 trivial baselines: same distance weighted kNN (k = 3) on a few summary features
function features(c: Take): number[] {
  const w = c.samples.filter((s) => s.t >= c.pressT && s.t <= c.releaseT);
  const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };
  return [c.releaseT - c.pressT, ...[0, 1, 2].map((j) => sd(w.map((s) => s.rr[j]))), ...[0, 1, 2].map((j) => sd(w.map((s) => s.ua[j])))];
}
function knnCorrect(trainClips: Take[], test: Take[], cols: number[]): number {
  const X = trainClips.map((c) => cols.map((i) => features(c)[i]));
  const mu = cols.map((_, j) => X.reduce((a, r) => a + r[j], 0) / X.length);
  const sg = cols.map((_, j) => Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / X.length) || 1);
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sg[j]));
  let ok = 0;
  for (const c of test) {
    const z = cols.map((i, j) => (features(c)[i] - mu[j]) / sg[j]);
    const near = Z.map((r, i) => ({ d: r.reduce((a, v, j) => a + (v - z[j]) ** 2, 0), l: trainClips[i].label })).sort((a, b) => a.d - b.d).slice(0, 3);
    const votes = new Map<string, number>();
    for (const n of near) votes.set(n.l, (votes.get(n.l) ?? 0) + 1 / (n.d + 1e-9));
    if ([...votes.entries()].sort((a, b) => b[1] - a[1])[0][0] === c.label) ok++;
  }
  return ok;
}
console.log('5.3 Trivial baselines (same LOSO, left ear folds)');
for (const [name, cols] of [['duration only', [0]], ['duration + movement std (7 features)', [0, 1, 2, 3, 4, 5, 6]]] as const) {
  let ok = 0, n = 0;
  for (const s of left) { ok += knnCorrect(all.filter((c) => c.session !== s), bySession.get(s)!, [...cols]); n += bySession.get(s)!.length; }
  console.log(`  ${name}: ${pct(ok, n)}`);
}

// 5.4 learning curves: more training sessions (test the last two left ear sessions), then takes per class
console.log('5.4 Accuracy against the number of training sessions');
const lastTwo = left.slice(-2);
for (const test of lastTwo) {
  const other = lastTwo.find((s) => s !== test)!;
  const earlier = sessions.filter((s) => s !== test && s !== other).reverse(); // nearest first
  for (let n = 0; n <= earlier.length; n++) {
    const tr = [other, ...earlier.slice(0, n)];
    const ps = predict(tr.flatMap((s) => bySession.get(s)!), bySession.get(test)!, test);
    console.log(`  train ${[...tr].sort().join('+')} → ${test}: ${pct(acc(ps), ps.length)}`);
  }
}
function sample(cs: Take[], k: number, seed: number): Take[] {
  let x = seed * 9301 + 49297;
  const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const by = new Map<string, Take[]>();
  for (const c of cs) by.set(c.label, [...(by.get(c.label) ?? []), c]);
  return [...by.values()].flatMap((v) => [...v].sort(() => rnd() - 0.5).slice(0, k));
}
if (lastTwo.length === 2) {
  console.log(`  takes per class from one session (${lastTwo[0]} ↔ ${lastTwo[1]}, mean of 5 draws):`);
  const [a, b] = lastTwo.map((s) => bySession.get(s)!);
  for (const k of [1, 2, 3, 5, 8, 10, 15]) {
    const runs = [0, 1, 2, 3, 4].map((seed) => (acc(predict(sample(a, k, seed), b, 'x')) / b.length + acc(predict(sample(b, k, seed), a, 'x')) / a.length) / 2);
    console.log(`    ${k}: ${(100 * runs.reduce((p, q) => p + q, 0) / runs.length).toFixed(1)}%`);
  }
}
console.log('  within session leave one clip out:');
for (const s of sessions) console.log(`    ${s}: ${(100 * evaluate(bySession.get(s)!, {}, 'loo').accuracy).toFixed(1)}%`);

// 5.5 selective classification on the left ear folds
const sentences = leftPreds.filter((p) => p.truth !== NONE);
const nothing = leftPreds.filter((p) => p.truth === NONE);
console.log(`5.5 Coverage at each bar (left ear folds: ${sentences.length} sentence takes, ${nothing.length} "nothing" takes)`);
for (const bar of [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9]) {
  const fired = sentences.filter((p) => p.label !== NONE && p.confidence >= bar);
  const wrong = fired.filter((p) => p.label !== p.truth).length;
  const nothingFired = nothing.filter((p) => p.label !== NONE && p.confidence >= bar).length;
  console.log(`  ${bar.toFixed(2)}: fired ${pct(fired.length, sentences.length)}, wrong ${wrong}, "nothing" fired ${nothingFired}`);
}
