import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await fs.readFile(new URL('metadata/catalog.json', root), 'utf8'));

test('all assets have unique IDs, dimensions and valid equipment references', () => {
  assert.equal(new Set(catalog.assets.map(a => a.id)).size, catalog.assets.length);
  assert.equal(new Set(catalog.equipment.map(e => e.id)).size, catalog.equipment.length);
  for (const a of catalog.assets) {
    assert.ok(a.width > 0 && a.height > 0);
    assert.ok(catalog.equipment.some(e => e.id === a.equipmentId && e.views.includes(a.id)));
  }
});

test('every equipment cover is a member view and has resolved platform/faction metadata', () => {
  for (const e of catalog.equipment) {
    assert.ok(e.views.includes(e.coverId));
    assert.ok(e.views.every(id => catalog.assets.some(a => a.id === id)));
    assert.ok(['sea', 'land', 'air'].includes(e.platform), e.id);
    assert.ok(['allied', 'soviet', 'yuri', 'common'].includes(e.faction), e.id);
  }
});

test('indexed copies and original SVG files are byte-identical', async () => {
  for (const a of catalog.assets) {
    const source = await fs.readFile(new URL(a.sourcePath, root));
    const copy = await fs.readFile(new URL('public/assets/' + a.id + '.svg', root));
    assert.deepEqual(copy, source);
    assert.equal(createHash('sha256').update(source).digest('hex'), a.sha256);
  }
});
