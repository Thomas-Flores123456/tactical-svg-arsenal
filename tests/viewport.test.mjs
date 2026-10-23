import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCamera, zoomCamera, clampScale } from '../src/lib/viewport.ts';

test('fit centers the complete image with margins', () => {
  const c = fitCamera(1200, 700, 1480, 620);
  assert.ok(c.x >= 23 && c.y >= 23);
  assert.ok(c.x + 1480 * c.scale <= 1177);
  assert.ok(c.y + 620 * c.scale <= 677);
});

test('zoom preserves the image point beneath the anchor', () => {
  const c = { scale: .75, x: 120, y: -40 };
  const anchor = { x: 650, y: 320 };
  const next = zoomCamera(c, 2, anchor.x, anchor.y);
  assert.ok(Math.abs((anchor.x - c.x) / c.scale - (anchor.x - next.x) / next.scale) < 1e-8);
  assert.ok(Math.abs((anchor.y - c.y) / c.scale - (anchor.y - next.y) / next.scale) < 1e-8);
});

test('camera has finite scale limits including bad inputs', () => {
  assert.equal(clampScale(100), 8);
  assert.equal(clampScale(-1), .02);
  assert.equal(clampScale(NaN), 1);
  assert.equal(clampScale(Infinity), 1);
});
