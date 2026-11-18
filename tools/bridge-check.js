/* The web app talks to two native shells through one bridge (window.AndroidBridge). This check proves that every
   method the Android app offers also exists in the Windows app (answered in windows/app/src/bridge.rs, or played by
   windows/shim.js in the page itself), and that the shim forwards it, so a page that works on the phone works on the
   computer. It also checks that every computer-only call desk.js and print.js make is answered.
   Run: node tools/bridge-check.js */
const fs = require('fs'),
  path = require('path');
const R = path.join(__dirname, '..');
const java = fs.readFileSync(path.join(R, 'android/src/com/adhkar/app/MainActivity.java'), 'utf8');
const rs = fs.readFileSync(path.join(R, 'windows/app/src/bridge.rs'), 'utf8');
const shim = fs.readFileSync(path.join(R, 'windows/shim.js'), 'utf8');
const android = [...java.matchAll(/@JavascriptInterface\s+public\s+\S+\s+(\w+)\s*\(([^)]*)\)/g)].map((m) => m[1]);
/* the names bridge.rs answers: each arm of its match, `"a" | "b" => ...` */
const answered = new Set();
for (const m of rs.matchAll(/^\s*((?:"\w+"\s*\|\s*)*"\w+")\s*=>/gm))
  for (const n of m[1].matchAll(/"(\w+)"/g)) answered.add(n[1]);
const list = (name) =>
  new Set(
    [...(shim.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\];')) || ['', ''])[1].matchAll(/'(\w+)'/g)].map(
      (m) => m[1]
    )
  );
const forwarded = list('names'),
  desk = list('desk');
const inShim = new Set([...shim.matchAll(/B\.(\w+)\s*=\s*function/g)].map((m) => m[1]));
const bad = [];
android.forEach((n) => {
  if (inShim.has(n)) return;
  if (!answered.has(n)) bad.push(n + ': not answered in bridge.rs');
  else if (!forwarded.has(n)) bad.push(n + ': not forwarded by shim.js');
});
forwarded.forEach((n) => {
  if (!answered.has(n) && !inShim.has(n)) bad.push(n + ': forwarded by shim.js but not answered in bridge.rs');
});
/* the computer's own calls, as the page makes them */
const page = ['web/js/desk.js', 'web/js/print.js'].map((f) => fs.readFileSync(path.join(R, f), 'utf8')).join('\n');
const used = new Set([...page.matchAll(/\b(?:B|DeskBridge)\.(\w+)\s*\(/g)].map((m) => m[1]));
used.forEach((n) => {
  if (!desk.has(n) && !forwarded.has(n)) bad.push(n + ': called by the page but not forwarded by shim.js');
  else if (!answered.has(n)) bad.push(n + ': called by the page but not answered in bridge.rs');
});
console.log(
  'bridge: ' + android.length + ' Android methods, ' + used.size + ' computer calls; all checked against bridge.rs'
);
if (bad.length) {
  console.log('MISSING:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('ok: every page call has a home on both devices');
