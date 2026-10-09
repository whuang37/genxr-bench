import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const checks = [
  ['Hand Fire title', /<title>\s*Hand Fire\s*<\/title>/i.test(html)],
  ['accessible live status', /aria-live=["']polite["']/i.test(html)],
  ['hands enabled', /enableHands\s*\(/.test(js)],
  ['desktop hand pose simulator', /SimulatorMode\.POSE/.test(js)],
  ['left hand joint tracking', /get(?:IndexTip|Wrist)\s*\(\s*0\s*\)/.test(js)],
  ['right hand joint tracking', /get(?:IndexTip|Wrist)\s*\(\s*1\s*\)/.test(js)],
  ['independent left pinch', /isSelecting\s*\(\s*0\s*\)/.test(js)],
  ['independent right pinch', /isSelecting\s*\(\s*1\s*\)/.test(js)],
  ['blue left flame', /leftFlame|LEFT_COLOR|0x(?:38bdf8|249cff|1f8fff|38aaff)/i.test(js)],
  ['orange right flame', /rightFlame|RIGHT_COLOR|0x(?:ff8a1f|ff7a18|ff8c24|ff9d2e)/i.test(js)],
  ['one-second continuous merge hold', /MERGE_HOLD_SECONDS\s*=\s*1(?:\.0)?\b/.test(js)],
  ['merge cancellation path', /cancelMerge|resetMerge|mergeProgress\s*=\s*0/.test(js)],
  ['five-second orb duration', /ORB_HOLD_SECONDS\s*=\s*5(?:\.0)?\b/.test(js)],
  ['two-open-hands clear state', /bothHandsOpen|bothOpen/.test(js)],
  ['success ring visual', /successRing/.test(js)],
];

let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) failed++;
}
if (failed) {
  console.error(`\n${failed} acceptance checks failed.`);
  process.exit(1);
}
console.log('\nHand Fire acceptance checks passed.');
