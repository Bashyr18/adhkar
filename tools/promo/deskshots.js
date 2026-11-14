/* Desktop screens for the ad, from the real app in desktop mode (web/index.html?desk), with a month of sample use.
     CDP_ORIGIN=file:///…/web/index.html?desk node tools/cdp.js tools/promo/deskshots.js <outdir>
   Saves <outdir>/desk-<name>.png at 1600 x 1000, dark theme. Nothing here touches the user's own app or data. */
const path = require('path'),
  fs = require('fs');
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function sample() {
  const done = {}, prayed = {}, days = {}, P = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let total = 0, r = 11;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 1; i <= 34; i++) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(6, 10, 0, 0);
    const k = iso(d), at = d.getTime();
    if (rnd() < .93) done[k + '|morning'] = at;
    if (rnd() < .82) done[k + '|evening'] = at + 11 * 3600e3;
    if (rnd() < .6) done[k + '|sleep'] = at + 16 * 3600e3;
    prayed[k] = {};
    P.forEach((p, j) => { if (rnd() < .95) { prayed[k][p] = 1; if (rnd() < .7) done[k + '|salah-' + p] = at + j * 3 * 3600e3; } });
    const n = Math.round(60 + rnd() * 240 + (i % 7 === 2 ? 120 : 0));
    days[k] = n; total += n;
  }
  return {
    v: 10,
    profile: { name: 'Bashir', hue: 'gold', since: iso(new Date(Date.now() - 40 * 864e5)), onboarded: true, gender: 'm' },
    loc: { lat: 6.5244, lng: 3.3792, name: 'Lagos', city: 'Lagos', country: 'Nigeria', src: 'city', tz: 1 },
    prefs: { theme: process.env.THEME || 'dark', lang: process.env.LANG_AR ? 'ar' : null },
    done, prayed,
    tasbih: { cur: 'subhanallah', target: 33, days, total, per: { subhanallah: Math.round(total * .4), alhamdulillah: Math.round(total * .35), allahuakbar: Math.round(total * .25) } }
  };
}
module.exports = async (page) => {
  const out = process.argv[3];
  await page.size(1600, 1000, 1);
  /* the sample goes in before the app's own scripts run, so the app never saves over it */
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('adhkar.v10', ${JSON.stringify(JSON.stringify(sample()))})` });
  await page.send('Page.navigate', { url: process.env.CDP_ORIGIN });
  await page.wait(3000);
  const routes = (process.env.ROUTES || 'today=#/,insights=#/insights,tracker=#/tracker,reader=#/adhkar,calendar=#/calendar,salah=#/salah,journal=#/journal,learn=#/learn').split(',');
  for (const r of routes) {
    const [name, h] = r.split('=');
    await page.eval(`location.hash=${JSON.stringify(h)};1`);
    await page.wait(1600);
    /* pal: the Ctrl K palette, with a few letters typed */
    if (name === 'pal') {
      await page.eval(`Desk.palette();1`);
      await page.wait(400);
      await page.eval(`(function(){var i=document.getElementById('pal-q');i.value='kursi';i.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
      await page.wait(900);
    }
    const s = await page.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, 'desk-' + name + '.png'), Buffer.from(s.result.data, 'base64'));
    console.log('shot', name);
  }
};
