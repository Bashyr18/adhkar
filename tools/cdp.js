/* Development only: drives headless Edge at an exact screen size, for screenshots and walking real screens.
   node tools/cdp.js <script.js> <outdir> [port]   The script exports async (page) => {}.  Expects the dev server on 5178. */
const { spawn } = require('child_process'),
  fs = require('fs'),
  path = require('path'),
  http = require('http');
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
const [script, out, portArg] = process.argv.slice(2),
  PORT = +(portArg || 9333),
  ORIGIN = process.env.CDP_ORIGIN || 'http://localhost:5178/';
const prof = path.join(process.env.TEMP, 'adhkar-cdp');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = (u) =>
  new Promise((ok, no) =>
    http
      .get(u, (r) => {
        let s = '';
        r.on('data', (d) => (s += d));
        r.on('end', () => {
          try {
            ok(JSON.parse(s));
          } catch (e) {
            no(e);
          }
        });
      })
      .on('error', no)
  );
(async () => {
  fs.mkdirSync(out, { recursive: true });
  /* CDP_ATTACH=1 drives a window that is already open on that port instead, such as the Windows app started with ADHKAR_DEBUG_PORT */
  const attach = !!process.env.CDP_ATTACH;
  const ch = attach
    ? { kill() {} }
    : spawn(
        EDGE,
        [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          '--no-first-run',
          '--remote-debugging-port=' + PORT,
          '--user-data-dir=' + prof,
          'about:blank'
        ],
        { stdio: 'ignore' }
      );
  let targets;
  for (let i = 0; i < 40; i++) {
    await wait(250);
    try {
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets.find((t) => t.type === 'page')) break;
    } catch (e) {}
  }
  const ws = new WebSocket(
    (targets.find((t) => t.type === 'page' && /adhkar/.test(t.url)) || targets.find((t) => t.type === 'page'))
      .webSocketDebuggerUrl
  );
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pend = {},
    errs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) {
      pend[d.id](d);
      delete pend[d.id];
    } else if (d.method === 'Runtime.exceptionThrown')
      errs.push(
        d.params.exceptionDetails.exception
          ? d.params.exceptionDetails.exception.description
          : d.params.exceptionDetails.text
      );
  };
  const send = (method, params) =>
    new Promise((r) => {
      const i = ++id;
      pend[i] = r;
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const page = {
    errs,
    wait,
    send,
    size: (w, h, s) =>
      send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s || 2, mobile: w < 700 }),
    open: async (hash) => {
      await send('Page.navigate', { url: ORIGIN + (hash || '') });
      await wait(600);
      await send('Page.reload', { ignoreCache: true });
      await wait(1800);
      /* a cold profile loads slowly: wait until the app is really there */
      for (let i = 0; i < 60; i++) {
        const r = await send('Runtime.evaluate', { expression: '!!(window.A && A.S)', returnByValue: true });
        if (r && r.result && r.result.value) break;
        await wait(250);
      }
    },
    eval: async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails)
        throw new Error(
          JSON.stringify(
            (r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) ||
              r.result.exceptionDetails.text
          ).slice(0, 400)
        );
      return r.result.result.value;
    },
    go: async (h, ms) => {
      await page.eval(`location.hash='#/${h}';1`);
      await wait(ms || 500);
    },
    shot: async (name, full) => {
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78, captureBeyondViewport: !!full });
      fs.writeFileSync(path.join(out, name + '.jpg'), Buffer.from(r.result.data, 'base64'));
    }
  };
  try {
    await require(path.resolve(script))(page);
    if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 6).join('\n').slice(0, 1500));
  } catch (e) {
    console.log('SCRIPT ERROR', e.message);
  }
  ws.close();
  ch.kill();
  process.exit(0);
})();
