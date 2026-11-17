/* The guide's pictures, checked: in each theme and language the page asks for, every image it would show exists.
     CDP_ORIGIN=file:///…/docs/guide/index.html node tools/cdp.js tools/guide-check.js x
   A picture removed while the guide still asks for it (its path is built in code, so a search will not find it)
   shows here as missing. */
const fs = require('fs'),
  path = require('path');
const GUIDE = path.join(__dirname, '..', 'docs', 'guide');
module.exports = async (page) => {
  await page.size(1440, 900, 1);
  await page.send('Page.navigate', { url: process.env.CDP_ORIGIN });
  await page.wait(2500);
  const missing = new Set(),
    seen = new Set();
  for (const theme of ['dark', 'light'])
    for (const lang of ['en', 'ar']) {
      await page.eval(
        `(function(){if(state.theme!=='${theme}')document.getElementById('theme').click();var l=document.querySelector('#lang [data-l="${lang}"]');if(l)l.click();return state.theme+state.lang})()`
      );
      await page.wait(700);
      const srcs = JSON.parse(
        await page.eval(
          `JSON.stringify([].map.call(document.querySelectorAll('img'),function(i){return i.getAttribute('src')}).concat([].map.call(document.querySelectorAll('[data-base]'),function(p){return p.querySelector('img')&&p.querySelector('img').getAttribute('src')})))`
        )
      );
      srcs.forEach((s) => {
        if (!s || /^(https?:|data:)/.test(s)) return;
        seen.add(s);
        if (!fs.existsSync(path.join(GUIDE, s.split('?')[0]))) missing.add(theme + '/' + lang + ': ' + s);
      });
    }
  if (page.errs.length) console.log('page errors:', page.errs.slice(0, 5).join(' | '));
  console.log(
    missing.size ? 'MISSING\n' + [...missing].join('\n') : 'every picture present: ' + seen.size + ' distinct'
  );
};
