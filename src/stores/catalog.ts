import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import catalog from '../../metadata/catalog.json';
import classification from '../../metadata/classification.json';
import { sortEquipment, filterEquipment, normalizeSort, sortOptions } from '../lib/catalog';
import type { AssetView, Equipment } from '../types';
export const useCatalog = defineStore('catalog', () => {
  const assets: AssetView[] = catalog.assets;
  const equipment: Equipment[] = catalog.equipment;
  const query = ref(''), service = ref('all'), favoritesOnly = ref(false), byDrawing = ref(false);
  const categoryId = ref('all'), subtypeId = ref('all');
  const sortMode = ref('category');
  const storageWarning = ref('');
  const favorites = ref<string[]>([]);
  try { const v = JSON.parse(localStorage.getItem('joint-assets:v1:favorites') || '[]'); if(Array.isArray(v)) favorites.value = v.filter(x => typeof x === 'string' && equipment.some(e => e.id === x)); }
  catch { storageWarning.value = '本地收藏存储不可用，本次操作仅在会话内保留。'; }
  try { sortMode.value = normalizeSort(localStorage.getItem('joint-assets:v1:sort')); }
  catch { storageWarning.value = '本地存储不可用，筛选排序与收藏仅在本次会话内生效。'; }
  watch(sortMode, value => {
    const valid = normalizeSort(value);
    if (valid !== value) { sortMode.value = valid; return; }
    try { localStorage.setItem('joint-assets:v1:sort', valid); }
    catch { storageWarning.value = '排序偏好无法保存，本次操作仍有效。'; }
  });
  const assetById = new Map(assets.map(a => [a.id, a]));
  const search = new Map(equipment.map(e => [e.id, [e.name, e.id, e.categoryLabel, e.subtypeLabel, ...e.views.map(id => { const a=assetById.get(id)!; return a.file+' '+a.id; })].join(' ').toLocaleLowerCase()]));
  const baseFilters = () => ({ service: service.value, query: query.value, favoritesOnly: favoritesOnly.value, favorites: favorites.value });
  const baseRows = computed(() => filterEquipment(equipment, baseFilters(), search));
  // Counts reflect search + service + favorites, but not their own selected facet.
  const categories = computed(() => classification.categories.map(c => ({ ...c, count: baseRows.value.filter(e => e.categoryId === c.id).length })).filter(c => c.count > 0 || c.id === categoryId.value));
  const subtypes = computed(() => (classification.categories.find(c => c.id === categoryId.value)?.subtypes ?? []).map(s => ({ ...s, count: baseRows.value.filter(e => e.categoryId === categoryId.value && e.subtypeId === s.id).length })));
  watch(service, value => {
    if (categoryId.value !== 'all' && !equipment.some(e => (value === 'all' || e.service === value) && e.categoryId === categoryId.value)) categoryId.value = 'all';
    subtypeId.value = 'all';
  }, { flush: 'sync' });
  watch(categoryId, () => { subtypeId.value = 'all'; }, { flush: 'sync' });
  const filtered = computed(() => sortEquipment(filterEquipment(equipment, { ...baseFilters(), categoryId: categoryId.value, subtypeId: subtypeId.value }, search), sortMode.value));
  function toggleFavorite(id: string) {
    favorites.value = favorites.value.includes(id) ? favorites.value.filter(x => x !== id) : [...favorites.value, id];
    try { localStorage.setItem('joint-assets:v1:favorites', JSON.stringify(favorites.value)); }
    catch { storageWarning.value = '收藏无法写入本地存储，本次操作仍有效。'; }
  }
  function reset() { query.value=''; service.value='all'; favoritesOnly.value=false; categoryId.value='all'; subtypeId.value='all'; sortMode.value='category'; }
  return { assets, equipment, assetById, query, service, favoritesOnly, byDrawing, favorites, filtered, storageWarning, toggleFavorite, reset, categoryId, subtypeId, sortMode, sortOptions, categories, subtypes, baseRows };
});
