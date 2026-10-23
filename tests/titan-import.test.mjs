import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const audit = JSON.parse(await fs.readFile(new URL('metadata/titan-import.json', root), 'utf8'));
const baseline = JSON.parse(await fs.readFile(new URL('metadata/source-baseline.json', root), 'utf8'));
const catalog = JSON.parse(await fs.readFile(new URL('metadata/catalog.json', root), 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');

test('Original 119 naval SVG baseline remains intact', async () => {
  assert.equal(Object.keys(baseline).length, 119);
  for (const [file, digest] of Object.entries(baseline)) {
    const bytes = await fs.readFile(new URL(file, root));
    assert.equal(hash(bytes), digest, file);
  }
});

test('Army entities have clean-master covers and multi-configuration semantics', () => {
  const army = catalog.equipment.filter(e => e.service === 'army');
  const armyAssets = catalog.assets.filter(a => a.equipmentId.startsWith('army:'));
  assert.ok(army.length >= 55, `Expected at least 55 army groups, got ${army.length}`);
  assert.ok(armyAssets.length >= 75, `Expected at least 75 army views, got ${armyAssets.length}`);
  for (const e of army) {
    const cover = catalog.assets.find(a => a.id === e.coverId);
    assert.ok(cover, e.id);
    assert.equal(cover.kind, 'clean-master', e.id);
    assert.equal(
      armyAssets.filter(a => a.equipmentId === e.id && a.kind === 'clean-master').length,
      1,
      e.id,
    );
  }
  for (const [key, count] of [['humvee', 3], ['frv1400', 3], ['m142_himars', 2], ['v3', 2], ['miasma', 2], ['terror_drone', 2], ['tornado_s', 2], ['tos1a', 2], ['pion2s7m', 2], ['s400', 2], ['pzh2000', 2], ['earthshaker_mortar', 2], ['rs24_yars', 2], ['caesar_155', 2], ['shepherd_relay', 2], ['buk_m3', 2], ['weather_control', 2], ['patriot_pac3', 2]]) {
    assert.equal(
      armyAssets.filter(a => a.id.includes(`.${key}.`)).length,
      count,
      key,
    );
  }
});

test('Air entities have clean-master covers', () => {
  const air = catalog.equipment.filter(e => e.service === 'air');
  const airAssets = catalog.assets.filter(a => a.equipmentId.startsWith('air:'));
  assert.ok(air.length >= 18, `Expected at least 18 air groups, got ${air.length}`);
  assert.ok(airAssets.length >= 31, `Expected at least 31 air views, got ${airAssets.length}`);
  for (const e of air) {
    const cover = catalog.assets.find(a => a.id === e.coverId);
    assert.ok(cover, e.id);
    assert.equal(cover.kind, 'clean-master', e.id);
  }
});

test('Titan-extracted army SVGs (01-07) match extraction receipt and side/top configuration attributes', async () => {
  for (const a of audit.assets) {
    const svg = await fs.readFile(new URL(a.sourcePath, root));
    assert.equal(hash(svg), a.sha256, a.id);
    const configs = [...svg.toString().matchAll(/data-configuration="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(configs, [a.variant, a.variant, a.variant]);
    assert.equal(catalog.assets.find(x => x.id === a.id)?.sha256, a.sha256);
  }
});
