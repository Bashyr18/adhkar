/* The installer's brand panel (windows/setup/art.html) as pictures, at twice the size it is shown:
     node tools/cdp.js tools/setup-art.js windows/setup
   writes art-dark.png, art-light.png, art-dark-ar.png, art-light-ar.png. Run it again when the panel changes. */
const fs = require('fs'),
  path = require('path');
module.exports = async (page) => {
  const out = process.argv[3];
  const base = 'file:///' + path.join(__dirname, '..', 'windows', 'setup', 'art.html').replace(/\\/g, '/').replace(/ /g, '%20');
  for (const q of ['dark', 'light', 'dark-ar', 'light-ar']) {
    await page.size(260, 470, 1);
    await page.send('Page.navigate', { url: base + '?' + q });
    for (let i = 0; i < 40; i++) {
      await page.wait(150);
      try {
        if (await page.eval('!!window.ready')) break;
      } catch (e) {}
    }
    await page.wait(300);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 260, height: 470, scale: 2 } });
    fs.writeFileSync(path.join(out, 'art-' + q + '.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('art-' + q + '.png');
  }
};
