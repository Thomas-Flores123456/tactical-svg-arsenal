<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCatalog } from '../stores/catalog';
import EquipmentCard from '../components/EquipmentCard.vue';
import AssetInspector from '../components/AssetInspector.vue';
import type { Equipment } from '../types';

const store = useCatalog();
const selectedId = ref<string | null>(null);
const selectedAsset = computed(() => selectedId.value ? store.assetById.get(selectedId.value) : undefined);
const selectedEquipment = computed(() => store.equipment.find(e => e.id === selectedAsset.value?.equipmentId));
const viewsFor = (equipment: Equipment) => equipment.views.map(id => store.assetById.get(id)!);
const cards = computed(() => store.filtered.flatMap(e =>
  (store.byDrawing ? e.views : [e.coverId]).map(id => ({ equipment: e, asset: store.assetById.get(id)! }))
));
</script>

<template>
  <section class="catalog">
    <div class="page-heading">
      <div><p class="eyebrow">LIBRARY / 工程资产目录</p><h1>装备档案</h1><p class="muted">点击图纸进入大幅面光桌，关闭后回到当前浏览位置。</p></div>
      <div class="heading-count"><strong>{{ store.filtered.length }}</strong><span>当前装备组</span></div>
    </div>
    <div class="filterbar">
      <label class="search"><span>搜索资产</span><input v-model="store.query" type="search" placeholder="名称、型号、Asset ID…"></label>
      <label class="facet-control"><span>装备种类</span><select v-model="store.categoryId"><option value="all">全部种类（{{ store.baseRows.length }}）</option><option v-for="c in store.categories" :key="c.id" :value="c.id">{{ c.label }}（{{ c.count }}）</option></select></label>
      <label v-if="store.subtypes.length" class="facet-control"><span>装备子类</span><select v-model="store.subtypeId"><option value="all">全部子类</option><option v-for="s in store.subtypes" :key="s.id" :value="s.id">{{ s.label }}（{{ s.count }}）</option></select></label>
      <label class="facet-control"><span>排序方式</span><select v-model="store.sortMode"><option v-for="s in store.sortOptions" :key="s.id" :value="s.id">{{ s.label }}</option></select></label>
      <label class="toggle"><input v-model="store.byDrawing" type="checkbox">按图纸展示</label>
      <button @click="store.reset">重置筛选</button>
    </div>
    <p class="result-line" role="status" aria-live="polite">{{ cards.length }} 个结果 <span v-if="store.favoritesOnly">· 仅收藏</span><span> / {{ store.byDrawing ? '图纸模式' : '装备模式' }}</span></p>
    <div v-if="cards.length" class="asset-grid">
      <EquipmentCard
        v-for="{ equipment, asset } in cards"
        :key="asset.id"
        :equipment="equipment"
        :asset="asset"
        :views="viewsFor(equipment)"
        :favorite="store.favorites.includes(equipment.id)"
        @inspect="selectedId = $event"
        @favorite="store.toggleFavorite"
      />
    </div>
    <div v-else class="empty">
      <p class="eyebrow">NO MATCHING ASSETS</p><h2>这里暂时没有图纸</h2><p>该分库尚未接入资产，或当前筛选没有匹配结果。</p><button @click="store.reset">查看全部资产</button>
    </div>
    <AssetInspector
      v-if="selectedAsset && selectedEquipment"
      :asset="selectedAsset"
      :equipment="selectedEquipment"
      :views="viewsFor(selectedEquipment)"
      @select="selectedId = $event"
      @close="selectedId = null"
    />
  </section>
</template>
