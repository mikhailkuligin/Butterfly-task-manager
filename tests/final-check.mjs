// Butterfly pilot — финальная проверка чистого пилота (без изменения данных)
// Запуск: node test/final-check.mjs  (сервер и headless Edge должны быть запущены)
import fs from 'node:fs';
import path from 'node:path';

const CDP = 'http://127.0.0.1:9224';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8091';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';
const OUT = path.join(process.cwd(), 'audit');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Conn {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      } else if (m.method) (this.handlers.get(m.method) || []).forEach((h) => h(m.params));
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', () => rej(new Error('ws')), { once: true }); });
    return new Conn(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 60000);
    });
  }
  on(m, f) { if (!this.handlers.has(m)) this.handlers.set(m, []); this.handlers.get(m).push(f); }
}

const run = async () => {
  const ver = await (await fetch(`${CDP}/json/version`)).json();
  const browser = await Conn.connect(ver.webSocketDebuggerUrl);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  let target;
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${CDP}/json/list`)).json();
    target = list.find((t) => t.id === targetId);
    if (target?.webSocketDebuggerUrl) break;
    await sleep(200);
  }
  const page = await Conn.connect(target.webSocketDebuggerUrl);
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Network.enable');
  await page.send('Log.enable');

  const errors = [];
  page.on('Runtime.exceptionThrown', (p) => errors.push('exception: ' + (p.exceptionDetails?.exception?.description || '').slice(0, 300)));
  page.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') errors.push('log: ' + p.entry.text.slice(0, 200)); });

  const ev = async (expression) => {
    try {
      const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) return { __error: 'exception' };
      return r.result.value;
    } catch (e) { return { __error: String(e.message || e) }; }
  };
  const waitFor = async (expr, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = await ev(expr);
      if (v) return v;
      await sleep(200);
    }
    return null;
  };
  const load = () => new Promise((res) => { page.on('Page.loadEventFired', () => res()); setTimeout(res, 8000); });

  await page.send('Network.clearBrowserCookies').catch(() => {});
  await page.send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' }).catch(() => {});

  let loaded = load();
  await page.send('Page.navigate', { url: BASE + LOGIN_PATH });
  await loaded; await sleep(400);
  const loginShot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'login-page.png'), Buffer.from(loginShot.data, 'base64'));

  await ev(`(() => {
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('#loginInput'), ${JSON.stringify(process.env.UI_USER || 'test')});
    set(document.querySelector('#passInput'), ${JSON.stringify(process.env.UI_PASS || 'test')});
    document.querySelector('#submitBtn').click();
    return true;
  })()`);
  await waitFor(`location.pathname === '/' && document.querySelector('#saveState')?.textContent === 'Сохранено'`, 15000);
  await sleep(700);

  const result = { errors };
  result.checks = await ev(`(() => ({
    user: document.querySelector('#userName')?.textContent,
    sections: document.querySelectorAll('.view').length,
    saveState: document.querySelector('#saveState')?.textContent,
    examChips: document.querySelectorAll('.ex-chip').length,
    scheduleItems: document.querySelectorAll('#schedList .tl').length,
    subjectsInStudy: 0,
    externalRefs: [...document.querySelectorAll('link[href], script[src], img[src]')].map(e => e.href || e.src).filter(u => !u.startsWith(location.origin)),
    overflowDesktop: document.documentElement.scrollWidth > window.innerWidth + 1
  }))()`);

  const shotDesktop = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'app-desktop.png'), Buffer.from(shotDesktop.data, 'base64'));

  await ev(`(() => { document.querySelector('#userBtn').click(); return true; })()`);
  await sleep(400);
  const shotSettings = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'settings-modal.png'), Buffer.from(shotSettings.data, 'base64'));
  await ev(`(() => { document.querySelector('[data-close="settings"]').click(); return true; })()`);

  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  result.checks.mobile = await ev(`(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display
  }))()`);
  const shotMobile = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'app-mobile.png'), Buffer.from(shotMobile.data, 'base64'));

  fs.writeFileSync(path.join(OUT, 'final-check.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
