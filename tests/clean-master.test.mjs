import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const catalog = JSON.parse(await fs.readFile(new URL('../metadata/catalog.json', import.meta.url), 'utf8'));

test('clean master is the default cover wherever available across navy, army, and air', () => {
  const clean = catalog.assets.filter(a => a.kind === 'clean-master');
  const expectedNavy = catalog.equipment.filter(e => e.service === 'navy' && !e.id.startsWith('navy:07_')).length;
  const expectedArmy = catalog.equipment.filter(e => e.service === 'army').length;
  const expectedAir = catalog.equipment.filter(e => e.service === 'air').length;
  assert.equal(expectedNavy, 36);
  assert.ok(expectedArmy >= 55);
  assert.ok(expectedAir >= 18);
  assert.equal(clean.filter(a => a.equipmentId.startsWith('navy:')).length, expectedNavy);
  assert.equal(clean.filter(a => a.equipmentId.startsWith('army:')).length, expectedArmy);
  assert.equal(clean.filter(a => a.equipmentId.startsWith('air:')).length, expectedAir);
  const expected = catalog.equipment.filter(e => !e.id.startsWith('navy:07_'));
  for (const e of expected) assert.equal(clean.filter(a => a.equipmentId === e.id).length, 1, e.id);
  for (const a of clean) {
    assert.equal(catalog.equipment.find(e => e.id === a.equipmentId).coverId, a.id);
    assert.equal(a.label, '纯净侧顶总图');
    assert.equal(a.backdrop, false);
  }
});

test('clean masters and variants have two explicit views and unique internal identifiers', async () => {
  for (const a of catalog.assets.filter(a => ['clean-master', 'clean-variant'].includes(a.kind))) {
    const svg = await fs.readFile(new URL('../public/' + a.url, import.meta.url), 'utf8');
    assert.equal((svg.match(/id="clean-side"/g) || []).length, 1);
    assert.equal((svg.match(/id="clean-top"/g) || []).length, 1);
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, a.id);
    for (const m of svg.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.includes(m[1]), m[1]);
    assert.ok(!svg.includes('id="layer-backdrop"'));
    assert.ok(!svg.includes('data-clean-status="draft"'), a.id);
    assert.ok(!/<(?:script|foreignObject|image)\b/i.test(svg), a.id);
  }
});
