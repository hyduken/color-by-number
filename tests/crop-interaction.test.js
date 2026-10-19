import test from 'node:test';
import assert from 'node:assert/strict';
import { bindCropInteraction } from '../src/image/crop-interaction.js';

function setup(zoom = 1) {
  const events = new Map();
  const settings = { x: 50, y: 50, zoom };
  bindCropInteraction({
    canvas: { addEventListener: (type, fn) => events.set(type, fn),
      focus() {}, setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) },
    source: { width: 400, height: 400 }, settings,
    onChange: (next) => Object.assign(settings, next),
  });
  const send = (type, id, x, y = 100) => events.get(type)({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', preventDefault() {} });
  return { settings, send };
}

test('crop pinch zooms around the fingers, clamps zoom, and syncs position', () => {
  const { settings, send } = setup();
  send('pointerdown', 1, 50); send('pointerdown', 2, 150);
  send('pointermove', 1, 0); send('pointermove', 2, 200);
  assert.equal(settings.zoom, 2);
  assert.equal(settings.x, 50);
  assert.equal(settings.y, 50);
  send('pointermove', 2, 500);
  assert.equal(settings.zoom, 3);
  assert.ok(settings.x >= 0 && settings.x <= 100);
});

test('touch drag follows the finger and continues smoothly after a pinch finger is released', () => {
  const { settings, send } = setup(2);
  send('pointerdown', 1, 100); send('pointermove', 1, 120);
  assert.equal(settings.x, 40);
  send('pointerdown', 2, 180); send('pointermove', 2, 200);
  send('pointerup', 2, 200);
  const before = settings.x;
  send('pointermove', 1, 120);
  assert.ok(Math.abs(settings.x - before) < 1e-10);
  send('pointermove', 1, 130);
  assert.ok(settings.x < before);
  send('pointercancel', 1, 130);
  const cancelled = { ...settings };
  send('pointermove', 1, 180);
  assert.deepEqual(settings, cancelled);
});

test('off-center pinch keeps the image beneath the gesture midpoint', () => {
  const { settings, send } = setup();
  send('pointerdown', 1, 25); send('pointerdown', 2, 75);
  send('pointermove', 1, 0); send('pointermove', 2, 100);
  assert.equal(settings.zoom, 2);
  assert.equal(settings.x, 25);
  assert.equal(settings.y, 50);
});
