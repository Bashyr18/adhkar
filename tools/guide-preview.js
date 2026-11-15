/* Pictures of the guide itself, for the README.
     CDP_ORIGIN=file:///…/docs/guide/index.html node tools/cdp.js tools/guide-preview.js build/preview
   Saves cover.png (the opening, dark) and install.png (installing, step by step) at 1440 x 900. */
const fs = require('fs'),
  path = require('path');
module.exports = async (page) => {
  const out = process.argv[3];
  fs.mkdirSync(out, { recursive: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      "try{localStorage.setItem('adhkar-guide-theme','dark');localStorage.setItem('adhkar-guide-lang','en')}catch(e){}"
  });
  await page.size(1440, 900, 1);
  await page.send('Page.navigate', { url: process.env.CDP_ORIGIN });
  await page.wait(3500);
  const at = async (sel, name, before) => {
    if (before) await page.eval(before);
    for (let i = 0; i < 2; i++) {
      await page.eval(
        `(function(){var e=document.querySelector(${JSON.stringify(sel)});if(e)e.scrollIntoView({block:'start'});document.querySelectorAll('.rv').forEach(function(x){x.classList.add('in')});return 1})()`
      );
      await page.wait(1200);
    }
    const r = await page.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.result.data, 'base64'));
    console.log('preview', name);
  };
  await at('body', 'cover');
  await at('#install', 'install', "instTab('a');1");
  await at('#ch-today .spread', 'spread');
};
