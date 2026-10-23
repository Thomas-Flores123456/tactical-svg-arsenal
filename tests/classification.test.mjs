import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { sortEquipment, filterEquipment, normalizeSort, sortOptions } from '../src/lib/catalog.ts';

const { equipment } = JSON.parse(await fs.readFile(new URL('../metadata/catalog.json', import.meta.url), 'utf8'));
const taxonomy = JSON.parse(await fs.readFile(new URL('../metadata/classification.json', import.meta.url), 'utf8'));
const search = new Map(equipment.map(e => [e.id, `${e.name} ${e.categoryLabel} ${e.subtypeLabel}`.toLowerCase()]));
const base = { service: 'all', query: '', favoritesOnly: false, favorites: [] };

test('all indexed navy+army+air groups have explicit valid category and subtype mappings', () => {
  const scoped = equipment.filter(e => ['navy', 'army', 'air'].includes(e.service));
  assert.equal(scoped.length, equipment.length);
  assert.ok(scoped.length >= 110, `Expected at least 110 groups, got ${scoped.length}`);
  for (const e of scoped) {
    const entry = taxonomy.equipment[e.id];
    assert.ok(entry, e.id);
    const cat = taxonomy.categories.find(c => c.id === entry.categoryId);
    assert.ok(cat, e.id);
    assert.equal(e.categoryLabel, cat.label);
    assert.ok(!entry.subtypeId || cat.subtypes.some(s => s.id === entry.subtypeId), e.id);
    assert.notEqual(e.categoryId, 'unclassified');
  }
});

test('default category order groups carriers and submarine subtypes deterministically', () => {
  const sorted = sortEquipment(equipment, 'category');
  assert.deepEqual(sorted.slice(0, 3).map(e => e.sourceOrder), [1, 26, 12]);
  const sub = sorted.filter(e => e.categoryId === 'submarine');
  assert.deepEqual(sub.slice(0, 3).map(e => e.sourceOrder), [5, 15, 20]);
  assert.deepEqual(sortEquipment([...equipment].reverse(), 'category'), sorted);
});

test('six sorts are stable, do not mutate input and have deterministic ties', () => {
  const original = JSON.stringify(equipment);
  for (const s of sortOptions) assert.deepEqual(sortEquipment(equipment, s.id), sortEquipment([...equipment].reverse(), s.id));
  assert.equal(JSON.stringify(equipment), original);
  assert.equal(sortEquipment(equipment, 'source-asc')[0].sourceOrder, 1);
  const maxSourceOrder = Math.max(...equipment.map(e => e.sourceOrder));
  assert.equal(sortEquipment(equipment, 'source-desc')[0].sourceOrder, maxSourceOrder);
  const sizes = sortEquipment(equipment, 'views-desc').map(e => e.views.length);
  assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
});

test('name sorting is numeric-aware and Chinese-aware in both directions', () => {
  const rows = ['舰艇10', '舰艇2', '舰艇1'].map((name, i) => ({ ...equipment[0], name, id: String(i) }));
  assert.deepEqual(sortEquipment(rows, 'name-asc').map(e => e.name), ['舰艇1', '舰艇2', '舰艇10']);
  assert.deepEqual(sortEquipment(rows, 'name-desc').map(e => e.name), ['舰艇10', '舰艇2', '舰艇1']);
});

test('search, favorites, category and subtype intersect and empty services stay empty', () => {
  const sub = filterEquipment(equipment, { ...base, categoryId: 'submarine', subtypeId: 'ssbn' }, search);
  assert.equal(sub.length, 3);
  const expectedArmy = equipment.filter(e => e.service === 'army').length;
  const expectedAir = equipment.filter(e => e.service === 'air').length;
  assert.equal(filterEquipment(equipment, { ...base, service: 'army' }, search).length, expectedArmy);
  assert.equal(filterEquipment(equipment, { ...base, service: 'air' }, search).length, expectedAir);
  assert.equal(filterEquipment(equipment, { ...base, categoryId: 'carrier', query: '潜艇' }, search).length, 0);
  assert.equal(filterEquipment(equipment, { ...base, categoryId: 'submarine', favoritesOnly: true, favorites: [sub[0].id] }, search).length, 1);
  assert.equal(filterEquipment(equipment, { ...base, query: '  战略导弹   核潜艇 ' }, search).length, 3);
});

test('unknown stored sort values fall back safely', () => {
  for (const value of [null, undefined, {}, 'invalid', '', 42]) assert.equal(normalizeSort(value), 'category');
  assert.deepEqual(sortEquipment(equipment, 'unknown'), sortEquipment(equipment, 'category'));
});
