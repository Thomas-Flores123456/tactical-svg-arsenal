import type { Equipment } from '../types/index.ts';

export const sortOptions = [
  { id: 'category', label: '按种类（默认）', code: 'CAT' },
  { id: 'name-asc', label: '名称 · 升序', code: 'A-Z' },
  { id: 'name-desc', label: '名称 · 降序', code: 'Z-A' },
  { id: 'source-asc', label: '目录编号 · 升序', code: '01↑' },
  { id: 'source-desc', label: '目录编号 · 降序', code: '99↓' },
  { id: 'views-desc', label: '图纸数量 · 多到少', code: 'QTY' },
] as const;

export const factionOptions = [
  { id: 'all', label: '全部阵营', short: '全部', en: 'ALL FACTIONS', code: 'ALL' },
  { id: 'allied', label: '盟军体系', short: '盟军', en: 'ALLIED', code: 'ALD' },
  { id: 'soviet', label: '苏联体系', short: '苏联', en: 'SOVIET', code: 'SOV' },
  { id: 'yuri', label: '尤里异构', short: '尤里', en: 'YURI', code: 'YRI' },
  { id: 'common', label: '通用／中立', short: '通用', en: 'COMMON', code: 'CMN' },
] as const;

export type SortMode = typeof sortOptions[number]['id'];
export type FactionId = typeof factionOptions[number]['id'];

export const normalizeSort = (value: unknown): SortMode =>
  sortOptions.find(s => s.id === value)?.id ?? 'category';

export const getFactionMeta = (faction: string) =>
  factionOptions.find(f => f.id === faction) ?? { id: 'common', label: '未定阵营', short: '未定', en: 'UNCLASSIFIED', code: 'UNC' };

export const getServiceMeta = (service: string) => {
  switch (service) {
    case 'navy': return { id: 'navy', label: '海军舰艇', short: '海军', en: 'NAVAL SYSTEMS', code: 'NAV' };
    case 'army': return { id: 'army', label: '陆军装甲', short: '陆军', en: 'LAND SYSTEMS', code: 'ARM' };
    case 'air': return { id: 'air', label: '空天战机', short: '空军', en: 'AIR SYSTEMS', code: 'AIR' };
    default: return { id: 'all', label: '联合总库', short: '三军', en: 'JOINT ARCHIVE', code: 'JNT' };
  }
};

const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
const serviceOrder = (service: string) => ({ navy: 0, army: 1, air: 2 }[service] ?? 99);
const tie = (a: Equipment, b: Equipment) =>
  serviceOrder(a.service) - serviceOrder(b.service)
  || a.sourceOrder - b.sourceOrder
  || a.id.localeCompare(b.id);

export function sortEquipment(rows: Equipment[], mode: unknown): Equipment[] {
  const selected = normalizeSort(mode);
  return [...rows].sort((a, b) => {
    let order = 0;
    switch (selected) {
      case 'category':
        order = serviceOrder(a.service) - serviceOrder(b.service)
          || a.categoryOrder - b.categoryOrder
          || a.subtypeOrder - b.subtypeOrder;
        break;
      case 'name-asc':
        order = collator.compare(a.name, b.name);
        break;
      case 'name-desc':
        order = collator.compare(b.name, a.name);
        break;
      case 'source-asc':
        order = a.sourceOrder - b.sourceOrder;
        break;
      case 'source-desc':
        order = b.sourceOrder - a.sourceOrder;
        break;
      case 'views-desc':
        order = b.views.length - a.views.length;
        break;
    }
    return order || tie(a, b);
  });
}

export function filterEquipment(
  rows: Equipment[],
  filters: {
    service: string;
    faction?: string;
    query: string;
    favoritesOnly: boolean;
    favorites: string[];
    categoryId?: string;
    subtypeId?: string;
  },
  search: Map<string, string>,
): Equipment[] {
  const words = filters.query.trim().toLocaleLowerCase().split(/\s+/);
  return rows.filter(e =>
    (filters.service === 'all' || filters.service === e.service)
    && (!filters.faction || filters.faction === 'all' || filters.faction === e.faction)
    && (!filters.favoritesOnly || filters.favorites.includes(e.id))
    && (!filters.categoryId || filters.categoryId === 'all' || e.categoryId === filters.categoryId)
    && (!filters.subtypeId || filters.subtypeId === 'all' || e.subtypeId === filters.subtypeId)
    && words.every(word => (search.get(e.id) ?? '').includes(word))
  );
}
