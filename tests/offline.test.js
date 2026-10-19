import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { buildOffline } from '../scripts/build-offline.mjs';
import { recentPuzzles } from '../src/puzzle/library.js';

test('home gets seven recent puzzles, collection retains all without changing input', () => {
  const records = Array.from({ length: 12 }, (_, i) => ({ id: i, updatedAt: i }));
  assert.deepEqual(recentPuzzles(records, 7).map((p) => p.id), [11, 10, 9, 8, 7, 6, 5]);
  assert.equal(recentPuzzles(records).length, 12);
  assert.equal(records[0].id, 0);
  assert.deepEqual(recentPuzzles([], 7), []);
});
test('offline build includes every shipped asset and versions content changes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'color-offline-'));
  try {
    await mkdir(join(dir, 'starters'));
    await writeFile(join(dir, 'index.html'), 'app');
    await writeFile(join(dir, 'starters/fox.webp'), 'fox');
    const first = await buildOffline(dir);
    assert.deepEqual(first.urls, ['/index.html', '/starters/fox.webp']);
    assert.ok((await readFile(join(dir, 'sw.js'), 'utf8')).includes(first.cacheName));
    assert.equal((await buildOffline(dir)).cacheName, first.cacheName);
    await writeFile(join(dir, 'starters/fox.webp'), 'updated fox');
    assert.notEqual((await buildOffline(dir)).cacheName, first.cacheName);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
async function worker(failInstall = false) {
  const listeners = {};
  const entries = new Map();
  const removed = [];
  const posted = [];
  let claimed = false;
  const cache = {
    addAll: async (requests) => {
      if (failInstall) throw new Error('network unavailable');
      requests.forEach((request) => entries.set(request.url, `cached:${request.url}`));
    },
    match: async (request, options) => {
      if (typeof request !== 'string' && !options?.ignoreVary) return undefined;
      return entries.get(typeof request === 'string' ? request : new URL(request.url).pathname);
    },
  };
  const sandbox = {
    self: { location: { origin: 'https://color.test' }, addEventListener: (name, fn) => { listeners[name] = fn; }, clients: { claim: async () => { claimed = true; } } },
    caches: { open: async () => cache, keys: async () => ['color-by-number-app-old', 'unrelated-cache', 'color-by-number-app-new'], delete: async (key) => { removed.push(key); } },
    URL, Request: class { constructor(url) { this.url = url; } },
    fetch: async () => { throw new Error('network unavailable'); },
  };
  const template = await readFile(new URL('../src/offline/worker.js', import.meta.url), 'utf8');
  vm.runInNewContext(template.replace('__OFFLINE_CONFIG__', JSON.stringify({ cacheName: 'color-by-number-app-new', urls: ['/index.html', '/starters/fox.webp'] })), sandbox);
  async function dispatch(name, extra = {}) {
    let pending;
    listeners[name]({ waitUntil: (p) => { pending = p; }, respondWith: (p) => { pending = p; }, ...extra });
    return pending;
  }
  return { dispatch, entries, removed, posted, claimed: () => claimed };
}
test('failed cache installation discards only the incomplete new cache', async () => {
  const sw = await worker(true);
  await assert.rejects(sw.dispatch('install'), /network unavailable/);
  assert.deepEqual(sw.removed, ['color-by-number-app-new']);
});
test('activation preserves unrelated caches and claims the first visit', async () => {
  const sw = await worker();
  await sw.dispatch('activate');
  assert.deepEqual(sw.removed, ['color-by-number-app-old']);
  assert.equal(sw.claimed(), true);
});
test('navigation and unvisited starter images work without a network', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  assert.equal(await sw.dispatch('fetch', { request: { url: 'https://color.test/', method: 'GET', mode: 'navigate' } }), 'cached:/index.html');
  assert.equal(await sw.dispatch('fetch', { request: { url: 'https://color.test/starters/fox.webp', method: 'GET', mode: 'cors' } }), 'cached:/starters/fox.webp');
  assert.equal(await sw.dispatch('fetch', { request: { url: 'https://elsewhere.test/', method: 'GET', mode: 'navigate' } }), undefined);
});
test('offline readiness is false when even one shipped image is missing', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  const replies = [];
  const message = { data: { type: 'OFFLINE_STATUS' }, ports: [{ postMessage: (value) => replies.push(value.ready) }] };
  await sw.dispatch('message', message);
  sw.entries.delete('/starters/fox.webp');
  await sw.dispatch('message', message);
  assert.deepEqual(replies, [true, false]);
});
