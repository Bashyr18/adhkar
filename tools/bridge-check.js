/* The web app talks to two native shells through one bridge (window.AndroidBridge). This check proves that every
   method the Android app offers also exists in the Windows app (in windows/src/Bridge.cs, or in windows/shim.js for
   what the page itself plays), so a page that works on the phone works on the computer.
   Run: node tools/bridge-check.js */
const fs = require('fs'),
  path = require('path');
const R = path.join(__dirname, '..');
const java = fs.readFileSync(path.join(R, 'android/src/com/adhkar/app/MainActivity.java'), 'utf8');
const cs = fs.readFileSync(path.join(R, 'windows/src/Bridge.cs'), 'utf8');
const shim = fs.readFileSync(path.join(R, 'windows/shim.js'), 'utf8');
const android = [...java.matchAll(/@JavascriptInterface\s+public\s+\S+\s+(\w+)\s*\(([^)]*)\)/g)].map((m) => ({
  name: m[1],
  argc: m[2].trim() ? m[2].split(',').length : 0
}));
const csMethods = {};
for (const m of cs.matchAll(/public\s+(?:async\s+)?[\w<>,\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*\{/g))
  csMethods[m[1]] = m[2].trim() ? m[2].split(',').length : 0;
/* the host methods the shim forwards, and the ones it plays itself */
const listed = new Set(
  [...(shim.match(/var names = \[([\s\S]*?)\];/) || ['', ''])[1].matchAll(/'(\w+)'/g)].map((m) => m[1])
);
const inShim = new Set([...shim.matchAll(/B\.(\w+)\s*=\s*function/g)].map((m) => m[1]));
const bad = [];
android.forEach((m) => {
  if (inShim.has(m.name)) return;
  if (!(m.name in csMethods)) bad.push(m.name + ': missing in Bridge.cs');
  else if (csMethods[m.name] !== m.argc)
    bad.push(m.name + ': ' + m.argc + ' arguments on Android, ' + csMethods[m.name] + ' on Windows');
  else if (!listed.has(m.name)) bad.push(m.name + ': not forwarded by shim.js');
});
console.log('bridge: ' + android.length + ' Android methods; ' + (android.length - bad.length) + ' present on Windows');
if (bad.length) {
  console.log('MISSING or DIFFERENT:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('ok: every page call has a home on both devices');
