#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chromePath = chromeCandidates.find(candidate => fs.existsSync(candidate));

if (!chromePath) {
  console.error('Chrome/Chromium not found; set CHROME_BIN to run the browser smoke test.');
  process.exit(2);
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.m4a': 'audio/mp4'
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
  const relative = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
  const requestedPath = path.resolve(repoRoot, '.' + relative);
  if (!requestedPath.startsWith(repoRoot + path.sep) || !fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(requestedPath)] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(requestedPath).pipe(response);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const baseUrl = 'http://127.0.0.1:' + server.address().port;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ljts-chrome-smoke-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-gpu',
  '--no-first-run',
  '--no-sandbox',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profileDir,
  'about:blank'
], { stdio: 'ignore' });

let socket;

try {
  const activePortPath = path.join(profileDir, 'DevToolsActivePort');
  await waitUntil(() => fs.existsSync(activePortPath), 'Chrome debugging endpoint', 10000);
  const [port, browserPath] = fs.readFileSync(activePortPath, 'utf8').trim().split(/\r?\n/);
  socket = new WebSocket('ws://127.0.0.1:' + port + browserPath);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      waiter.reject(new Error(message.error.message || JSON.stringify(message.error)));
    } else {
      waiter.resolve(message.result || {});
    }
  });

  const send = (method, params = {}, sessionId = undefined) => new Promise((resolve, reject) => {
    commandId += 1;
    pending.set(commandId, { resolve, reject });
    const message = { id: commandId, method, params };
    if (sessionId) message.sessionId = sessionId;
    socket.send(JSON.stringify(message));
  });

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);

  const injectedHarness = [
    '(() => {',
    '  const nativeSetTimeout = window.setTimeout.bind(window);',
    '  window.setTimeout = (fn, delay, ...args) => nativeSetTimeout(fn, Math.min(Number(delay) || 0, 8), ...args);',
    '  class FakeAudio extends EventTarget {',
    "    constructor() { super(); this.preload = 'auto'; this.src = ''; this.currentTime = 0; }",
    '    pause() {}',
    '    removeAttribute(name) { if (name === "src") this.src = ""; }',
    '    load() { window.setTimeout(() => { this.dispatchEvent(new Event("loadeddata")); this.dispatchEvent(new Event("canplaythrough")); }, 1); }',
    '    play() { window.setTimeout(() => { this.dispatchEvent(new Event("playing")); this.dispatchEvent(new Event("timeupdate")); this.dispatchEvent(new Event("ended")); }, 2); return Promise.resolve(); }',
    '  }',
    '  Object.defineProperty(window, "Audio", { configurable: true, writable: true, value: FakeAudio });',
    '  const nativeAnchorClick = HTMLAnchorElement.prototype.click;',
    '  HTMLAnchorElement.prototype.click = function() {',
    '    if (this.download) { window.__ljtsDownloads = (window.__ljtsDownloads || 0) + 1; return; }',
    '    return nativeAnchorClick.call(this);',
    '  };',
    '})();'
  ].join('\n');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: injectedHarness }, sessionId);

  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
    }
    return result.result ? result.result.value : undefined;
  };

  const navigate = async url => {
    await send('Page.navigate', { url }, sessionId);
    await waitUntil(async () => {
      try {
        return await evaluate('document.readyState === "complete"');
      } catch {
        return false;
      }
    }, 'page load: ' + url, 10000);
  };

  await navigate(baseUrl + '/index.html');
  assert(await evaluate('Boolean(document.querySelector("#continue-registration"))'), 'public root did not render participant registration');

  await navigate(baseUrl + '/index.html?research=1');
  assert(await evaluate('Boolean(document.querySelector("#generate-url"))'), 'researcher setup route did not render');
  const generatedUrl = await evaluate('document.querySelector("#participant-url").value');
  assert(generatedUrl.includes('take=1') && generatedUrl.includes('research=1'), 'generated participant URL contract changed');

  await navigate(baseUrl + '/index.html?take=1&research=1&rc=smoke&mode=untimed&submit=0');
  await waitForSelector(evaluate, '#continue-registration');
  await evaluate('document.querySelector("#continue-registration").click()');
  await waitForSelector(evaluate, '#continue-consent');
  assert(await evaluate('Boolean(document.querySelector("#consent-check"))'), 'distributed researcher URL bypassed information confirmation');
  await evaluate('document.querySelector("#consent-check").checked = true; document.querySelector("#continue-consent").click()');
  await waitForSelector(evaluate, '#begin-session');
  await evaluate('document.querySelector("#begin-session").click()');

  await waitForSelector(evaluate, '#play-sound-check');
  await evaluate('document.querySelector("#play-sound-check").click()');
  await waitUntil(() => evaluate('document.querySelector("#sound-ok") && !document.querySelector("#sound-ok").disabled'), 'sound check completion', 5000);
  await evaluate('document.querySelector("#sound-ok").click()');
  await waitForSelector(evaluate, '#start-practice');
  await evaluate('document.querySelector("#start-practice").click()');

  let responses = 0;
  await waitUntil(async () => {
    if (await evaluate('Boolean(document.querySelector("#start-main"))')) {
      await evaluate('document.querySelector("#start-main").click()');
      return false;
    }
    const canRespond = await evaluate('(() => { const button = document.querySelector("#respond-appropriate"); const area = document.querySelector("#responses"); return Boolean(button && area && !area.classList.contains("hidden") && !button.disabled); })()');
    if (canRespond) {
      await evaluate('document.querySelector("#respond-appropriate").click()');
      responses += 1;
    }
    return await evaluate('Boolean(document.querySelector("#download-csv"))');
  }, '4 practice + 40 main-test completion', 20000, 2);

  assert(responses === 44, 'unexpected response count: ' + responses);
  const resultText = await evaluate('document.body.innerText');
  assert(resultText.includes('20 / 40'), 'total-score result was not rendered as expected');
  assert(resultText.includes('20 / 20'), 'appropriate-item score was not rendered');
  assert(resultText.includes('0 / 20'), 'inappropriate-item score was not rendered');
  assert(!resultText.includes('Not shown: incomplete form'), 'complete form was incorrectly treated as incomplete');
  assert(await evaluate('Object.keys(localStorage).some(key => { if (!key.startsWith("ljts_partial_") || key === "ljts_partial_last") return false; try { return JSON.parse(localStorage.getItem(key)).stage === "complete"; } catch { return false; } })'), 'completed result was not retained for recovery');

  console.log('Browser smoke passed: public route, researcher route, generated URL, consent, 4+40 completion, results, and recovery snapshot.');
} finally {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  } catch {
    // Best-effort cleanup.
  }
  chrome.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => chrome.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function waitForSelector(evaluate, selector, timeout = 5000) {
  return waitUntil(() => evaluate('Boolean(document.querySelector(' + JSON.stringify(selector) + '))'), 'selector ' + selector, timeout);
}

async function waitUntil(predicate, description, timeout = 5000, interval = 10) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timed out waiting for ' + description);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
