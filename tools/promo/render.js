/* Renders tools/promo/promo.html to video, frame by frame, through tools/cdp.js (headless Edge).
     STILLS="1,8,15" CDP_ORIGIN=file:///…/promo.html?render node tools/cdp.js tools/promo/render.js <outdir>
       saves those seconds as JPEGs, for checking;
     CDP_ORIGIN=file:///…/promo.html?render node tools/cdp.js tools/promo/render.js <outdir>
       pipes every frame (30 a second) to ffmpeg as <outdir>/video.mp4 (no sound; tools/promo/build.sh adds it). */
const path = require('path'),
  fs = require('fs'),
  { spawn } = require('child_process');
module.exports = async (page) => {
  const out = process.argv[3];
  await page.size(1920, 1080, 1);
  await page.send('Page.navigate', { url: process.env.CDP_ORIGIN });
  for (let i = 0; i < 80; i++) {
    await page.wait(250);
    try { if (await page.eval('!!window.render')) break; } catch (e) {}
  }
  /* the film's own size: portrait or landscape */
  const dim = await page.eval('[document.getElementById("stage").offsetWidth, document.getElementById("stage").offsetHeight]');
  await page.size(dim[0], dim[1], 1);
  await page.wait(300);
  /* every font and image ready before the first frame */
  await page.eval(`(async function(){await document.fonts.ready;await Promise.all([].map.call(document.images,function(i){return i.decode().catch(function(){})}));
    await Promise.all(['700 30px Quicksand','400 40px Amiri','400 40px "Amiri Quran"'].map(function(f){return document.fonts.load(f,'أبج abc')}));return 1})()`);
  const shot = async (t, q) => {
    await page.eval(`window.render(${t});1`);
    const r = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: q, optimizeForSpeed: false });
    return Buffer.from(r.result.data, 'base64');
  };
  if (process.env.STILLS) {
    for (const s of process.env.STILLS.split(',')) fs.writeFileSync(path.join(out, 'still-' + s + '.jpg'), await shot(+s, 88));
    return;
  }
  const FPS = 30,
    dur = await page.eval('window.DUR'),
    n = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const buf = await shot(f / FPS, 95);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log('frame', f, '/', n, Math.round((Date.now() - t0) / 1000) + 's');
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('video:', n, 'frames in', Math.round((Date.now() - t0) / 1000) + 's');
};
