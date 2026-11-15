/* A bug sweep of the computer's layout: every screen in desktop mode (web/index.html?desk), in English and Arabic,
   at the two sizes the desktop is checked at, collecting script errors and anything wider than the window.
     CDP_ORIGIN=file:///…/web/index.html?desk node tools/cdp.js tools/desk-sweep.js build/sweep
   SHOTS=1 saves a picture of each screen too (see below). */
const ROUTES = [
  '#/',
  '#/adhkar',
  '#/c/morning',
  '#/r/morning/0',
  '#/r/morning/1',
  '#/search',
  '#/saved',
  '#/counting',
  '#/tracker',
  '#/insights',
  '#/salah',
  '#/qibla',
  '#/month',
  '#/night',
  '#/duha',
  '#/qada',
  '#/location',
  '#/learn',
  '#/learn/fajr',
  '#/learn/quiz',
  '#/journal',
  '#/answered',
  '#/deeds',
  '#/modesty',
  '#/profile',
  '#/calendar',
  '#/ramadan',
  '#/jumuah',
  '#/kahf',
  '#/print',
  '#/settings/appearance',
  '#/settings/reading',
  '#/settings/prayer',
  '#/settings/notifications',
  '#/settings/data',
  '#/settings/about',
  'rail:Print and PDF',
  'rail:This computer'
];
module.exports = async (page) => {
  /* SHOTS=1 also saves a picture of every screen; ROUTES="#/learn,#/qibla" sweeps only those;
     LANGS=en and SIZES=1600 narrow it further */
  const fs = require('fs'),
    path = require('path'),
    out = process.argv[3],
    list = process.env.ROUTES ? process.env.ROUTES.split(',') : ROUTES,
    langs = (process.env.LANGS || 'en,ar').split(','),
    sizes = (process.env.SIZES || '1333,1600').split(',').map(Number),
    bad = [];
  if (process.env.SHOTS) fs.mkdirSync(out, { recursive: true });
  for (const ar of langs.map((l) => l === 'ar')) {
    for (const [w, h] of [
      [1333, 790],
      [1600, 1000]
    ].filter((x) => sizes.indexOf(x[0]) >= 0)) {
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try{localStorage.setItem('adhkar.v10', JSON.stringify({v:10,profile:{name:'Test',onboarded:true,since:'2026-10-01'},loc:{lat:6.52,lng:3.38,name:'Lagos',city:'Lagos',country:'Nigeria',src:'city',tz:1},prefs:{theme:'dark',lang:${ar ? "'ar'" : 'null'}},hints:{counting:1,tracker:1,reader:1,today:1,'pace-tap':1,fingers:1}}))}catch(e){}`
      });
      await page.size(w, h, 1);
      await page.send('Page.navigate', { url: process.env.CDP_ORIGIN });
      await page.wait(3000);
      for (const r of list) {
        const before = page.errs.length;
        if (r.indexOf('rail:') === 0)
          await page.eval(
            `(function(){var a=[].slice.call(document.querySelectorAll('#rail a,#rail button')).filter(function(e){return e.textContent.indexOf(${JSON.stringify(r.slice(5))})>=0})[0];if(a)a.click();return 1})()`
          );
        else await page.eval(`location.hash=${JSON.stringify(r)};1`);
        await page.wait(1100);
        const o = await page.eval(
          `(function(){var W=innerWidth,out=[];document.querySelectorAll('#app *').forEach(function(e){var b=e.getBoundingClientRect();if(b.width&&(b.right>W+1||b.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.trk-chips,.fan,.rail,.kf-pages,.feature,[style*="overflow"]'))out.push((e.className&&e.className.baseVal===undefined?e.className:e.tagName)+':'+Math.round(b.left)+'-'+Math.round(b.right))});return JSON.stringify({x:document.documentElement.scrollWidth>W+1,o:out.slice(0,3)})})()`
        );
        const res = JSON.parse(o);
        if (process.env.SHOTS) {
          const shot = await page.send('Page.captureScreenshot', { format: 'png' });
          const name =
            (ar ? 'ar-' : '') +
            w +
            '-' +
            (r
              .replace(/^rail:/, '')
              .replace(/[^a-z0-9]+/gi, '-')
              .replace(/^-|-$/g, '') || 'today');
          fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(shot.result.data, 'base64'));
        }
        const errs = page.errs.slice(before);
        if (errs.length || res.x || res.o.length)
          bad.push(
            `${ar ? 'ar' : 'en'} ${w} ${r}: ${errs.join(' | ')} ${res.x ? 'PAGE SCROLLS SIDEWAYS ' : ''}${res.o.join(', ')}`
          );
      }
      await page.send('Page.navigate', { url: 'about:blank' });
    }
  }
  console.log(
    bad.length
      ? bad.join('\n')
      : 'clean: ' + list.length + ' screens x ' + langs.length + ' languages x ' + sizes.length + ' sizes'
  );
};
