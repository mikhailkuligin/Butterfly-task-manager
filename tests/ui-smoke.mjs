// Butterfly pilot — браузерная проверка через CDP (headless Edge)
// Запуск: сначала `node server.js`, затем `node test/ui-smoke.mjs`
import fs from 'node:fs';
import path from 'node:path';

const CDP = process.env.CDP || 'http://127.0.0.1:9224';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8091';
const LOGIN_PATH = process.env.LOGIN_PATH || '/login';
const UI_USER = process.env.UI_USER || 'test';
const UI_PASS = process.env.UI_PASS || 'test';
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
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', () => rej(new Error('ws error')), { once: true });
    });
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

  const errors = [];
  const origins = new Set();
  page.on('Runtime.exceptionThrown', (p) => errors.push('exception: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 400)));
  page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') errors.push('console: ' + p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)); });
  page.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') errors.push('log: ' + p.entry.text.slice(0, 300)); });
  page.on('Network.requestWillBeSent', (p) => { try { origins.add(new URL(p.request.url).origin); } catch {} });

  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');

  const ev = async (expression, awaitPromise = true) => {
    try {
      const r = await page.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) return { __error: JSON.stringify(r.exceptionDetails).slice(0, 500) };
      return r.result.value;
    } catch (e) {
      return { __error: String(e && e.message ? e.message : e).slice(0, 300) };
    }
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

  const results = { errors, checks: {} };

  // чистые cookies, HTTP-кэш и service worker, чтобы проверить именно свежую версию
  await page.send('Network.clearBrowserCache').catch(() => {});
  await page.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});
  await page.send('Page.navigate', { url: BASE + '/' });
  await sleep(1500);
  await page.send('Runtime.evaluate', {
    expression: `(async () => {
      try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } catch (_) {}
      try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (_) {}
      return true;
    })()`,
    awaitPromise: true, returnByValue: true
  }).catch(() => {});
  await page.send('Network.clearBrowserCookies').catch(() => {});
  await page.send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' }).catch(() => {});

  // 1. login page
  let loaded = load();
  await page.send('Page.navigate', { url: BASE + LOGIN_PATH });
  await loaded; await sleep(500);
  results.checks.loginPage = await ev(`(() => ({
    title: document.title,
    hasForm: !!document.querySelector('#authForm'),
    hasNoRegistration: document.querySelectorAll('.auth-tab').length === 0 && !document.querySelector('#pass2Input'),
    passwordType: document.querySelector('#passInput').type,
    externalRefs: [...document.querySelectorAll('link[href], script[src]')].map(e => e.href || e.src).filter(u => !u.startsWith(location.origin) && !u.startsWith('data:')),
    baseline: document.documentElement.scrollWidth <= window.innerWidth + 1
  }))()`);
  const shotLogin = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'login-page.png'), Buffer.from(shotLogin.data, 'base64'));

  // 2. login test/test через форму
  await ev(`(() => {
    const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('#loginInput'), ${JSON.stringify(process.env.UI_USER || 'test')});
    set(document.querySelector('#passInput'), ${JSON.stringify(process.env.UI_PASS || 'test')});
    document.querySelector('#submitBtn').click();
  })()`);
  const reachedApp = await waitFor(`location.pathname === '/' && !!document.querySelector('.app')`, 15000);
  await sleep(1200);

  results.checks.app = await ev(`(() => ({
    reached: document.querySelector('.app') !== null,
    title: document.title,
    user: document.querySelector('#userName')?.textContent,
    login: document.querySelector('#userLogin')?.textContent,
    hasLogout: !!document.querySelector('#logoutTop'),
    sections: document.querySelectorAll('.view').length,
    activeSection: document.querySelector('.view.active')?.id,
    saveState: document.querySelector('#saveState')?.textContent,
    sw: 'serviceWorker' in navigator,
    themeColor: document.querySelector('meta[name=theme-color]')?.content,
    manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
    externalRefs: [...document.querySelectorAll('link[href], script[src], img[src]')].map(e => e.href || e.src).filter(u => !u.startsWith(location.origin))
  }))()`);

  // 2b. раздел «Отладка»
  results.checks.debug = await ev(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const btn = document.querySelector('[data-view="debug"]');
    if (!btn) return { found: false };
    btn.click();
    await sleep(900);
    const text = document.querySelector('#debugText');
    const send = document.querySelector('#debugSend');
    let captured = null;
    const origFetch = window.fetch;
    if (text && send) {
      text.value = 'Проверка кнопки отправки';
      text.dispatchEvent(new Event('input', { bubbles: true }));
      window.fetch = (input, init) => {
        if (String(input).includes('/api.php/debug')) {
          captured = { method: init?.method, body: init?.body };
          return Promise.resolve(new Response(JSON.stringify({ id: 'test', created_at: 1 }), {
            status: 201, headers: { 'Content-Type': 'application/json' }
          }));
        }
        return origFetch(input, init);
      };
      send.click();
      await sleep(600);
      window.fetch = origFetch;
    }
    return {
      found: true,
      active: document.querySelector('#view-debug')?.classList.contains('active'),
      hasText: !!text,
      hasSend: !!send,
      hasRules: !!document.querySelector('.debug-rules'),
      textStyle: text ? getComputedStyle(text).borderRadius : null,
      sent: !!captured,
      method: captured?.method,
      payload: captured?.body,
      msg: document.querySelector('#debugMsg')?.textContent,
      cleared: text?.value === ''
    };
  })()`);
  await ev(`(() => { document.querySelector('[data-view="today"]').click(); return true; })()`);

  // 3. настройки + экспорт базы
  results.checks.settings = await ev(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('#userBtn').click();
    await sleep(400);
    return {
      open: !document.querySelector('#settingsModal').hidden,
      account: document.querySelector('#accountName')?.textContent,
      hasExport: !!document.querySelector('#exportBtn'),
      hasPassword: !!document.querySelector('#pwForm'),
      hasDelete: !!document.querySelector('#deleteBtn')
    };
  })()`);
  const shotSettings = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'settings-modal.png'), Buffer.from(shotSettings.data, 'base64'));

  const dlDir = path.join(OUT, 'downloads');
  fs.mkdirSync(dlDir, { recursive: true });
  await page.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir, eventsEnabled: true }).catch(() => {});
  await ev(`document.querySelector('#exportBtn').click()`);
  await sleep(2500);
  const files = fs.readdirSync(dlDir).filter((f) => f.endsWith('.json'));
  results.checks.export = { files };
  if (files.length) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dlDir, files[files.length - 1]), 'utf8'));
      results.checks.export.parsed = { app: j.app, schema: j.schema_version, login: j.account?.login, subjects: j.data?.subjects?.length };
    } catch (e) { results.checks.export.parseError = String(e); }
  }
  await ev(`(() => { document.querySelector('[data-close="settings"]').click(); return true; })()`);
  await sleep(300);

  // 4. добавление плана + сохранение
  const planText = `Проверка ${Date.now()}`;
  results.checks.addPlan = await ev(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const inp = document.querySelector('#plansStack .line-form input');
    inp.value = ${JSON.stringify(planText)};
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#plansStack .line-form').requestSubmit();
    await sleep(1200);
    return { inList: document.querySelector('#plansList').innerText.includes(${JSON.stringify(planText)}), saveState: document.querySelector('#saveState')?.textContent };
  })()`);

  await sleep(1400);
  loaded = load();
  await page.send('Page.reload');
  await loaded; await sleep(1800);
  results.checks.persistence = await ev(`(() => ({
    stillThere: document.querySelector('#plansList')?.innerText.includes(${JSON.stringify(planText)}),
    user: document.querySelector('#userName')?.textContent,
    saveState: document.querySelector('#saveState')?.textContent
  }))()`);

  // 4. скриншоты desktop/mobile
  const shotDesktop = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'app-desktop.png'), Buffer.from(shotDesktop.data, 'base64'));

  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(700);
  results.checks.mobile = await ev(`(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
    userChipVisible: !!document.querySelector('#userBtn')?.offsetParent
  }))()`);
  const shotMobile = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, 'app-mobile.png'), Buffer.from(shotMobile.data, 'base64'));
  await page.send('Emulation.clearDeviceMetricsOverride');

  // 5. service worker + clean up test plan? (план останется — это нормально)
  results.checks.sw = await ev(`(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      return { count: regs.length, controller: !!navigator.serviceWorker.controller };
    } catch (e) { return { error: String(e) }; }
  })()`);

  // 6. выход с главной страницы
  await ev(`(() => { document.querySelector('#logoutTop').click(); return true; })()`);
  await sleep(1200);
  results.checks.logout = await ev(`(() => ({
    path: location.pathname,
    hasForm: !!document.querySelector('#authForm'),
    hasNoRegistration: document.querySelectorAll('.auth-tab').length === 0 && !document.querySelector('#pass2Input')
  }))()`);

  results.checks.origins = [...origins];
  results.checks.errors = errors;
  fs.writeFileSync(path.join(OUT, 'ui-smoke.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify(results, null, 2));

  page.close?.();
  process.exit(0);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
