import type { Equipment } from '../types/index.ts';

export const sortOptions = [
  { id: 'category', label: '按种类（默认）' },
  { id: 'name-asc', label: '名称 · 升序' },
  { id: 'name-desc', label: '名称 · 降序' },
  { id: 'source-asc', label: '目录编号 · 升序' },
  { id: 'source-desc', label: '目录编号 · 降序' },
  { id: 'views-desc', label: '图纸数量 · 多到少' },
] as const;
export type SortMode = typeof sortOptions[number]['id'];
export const normalizeSort = (value: unknown): SortMode => sortOptions.find(s => s.id === value)?.id ?? 'category';
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
const serviceOrder = (service: string) => ({ navy: 0, army: 1, air: 2 }[service] ?? 99);
const tie = (a: Equipment, b: Equipment) => serviceOrder(a.service) - serviceOrder(b.service) || a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id);
export function sortEquipment(rows: Equipment[], mode: unknown): Equipment[] {
  const selected = normalizeSort(mode);
  return [...rows].sort((a, b) => {
    let order = 0;
    switch (selected) {
      case 'category': order = serviceOrder(a.service) - serviceOrder(b.service) || a.categoryOrder - b.categoryOrder || a.subtypeOrder - b.subtypeOrder; break;
      case 'name-asc': order = collator.compare(a.name, b.name); break;
      case 'name-desc': order = collator.compare(b.name, a.name); break;
      case 'source-asc': order = a.sourceOrder - b.sourceOrder; break;
      case 'source-desc': order = b.sourceOrder - a.sourceOrder; break;
      case 'views-desc': order = b.views.length - a.views.length; break;
    }
    return order || tie(a, b);
  });
}
export function filterEquipment(rows: Equipment[], filters: {service: string; query: string; favoritesOnly: boolean; favorites: string[]; categoryId?: string; subtypeId?: string}, search: Map<string, string>): Equipment[] {
  const words = filters.query.trim().toLocaleLowerCase().split(/\s+/);
  return rows.filter(e => (filters.service === 'all' || filters.service === e.service)
    && (!filters.favoritesOnly || filters.favorites.includes(e.id))
    && (!filters.categoryId || filters.categoryId === 'all' || e.categoryId === filters.categoryId)
    && (!filters.subtypeId || filters.subtypeId === 'all' || e.subtypeId === filters.subtypeId)
    && words.every(word => (search.get(e.id) ?? '').includes(word)));
}
