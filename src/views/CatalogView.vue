<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCatalog } from '../stores/catalog';
import { getServiceMeta } from '../lib/catalog';
import EquipmentCard from '../components/EquipmentCard.vue';
import AssetInspector from '../components/AssetInspector.vue';
import type { Equipment } from '../types';

const store = useCatalog();
const selectedId = ref<string | null>(null);
const selectedAsset = computed(() => (selectedId.value ? store.assetById.get(selectedId.value) : undefined));
const selectedEquipment = computed(() => store.equipment.find(e => e.id === selectedAsset.value?.equipmentId));
const viewsFor = (equipment: Equipment) => equipment.views.map(id => store.assetById.get(id)!);
const currentServiceMeta = computed(() => getServiceMeta(store.service));

const cards = computed(() =>
  store.filtered.flatMap(e =>
    (store.byDrawing ? e.views : [e.coverId]).map(id => ({
      equipment: e,
      asset: store.assetById.get(id)!,
    })),
  ),
);
</script>

<template>
  <section class="catalog">
    <!-- 顶部战术标题区 -->
    <div class="page-heading">
      <div>
        <span class="tag">
          <b>{{ currentServiceMeta.code }} // {{ currentServiceMeta.short }}</b>
          <i>{{ currentServiceMeta.en }} · BLUEPRINT MATRIX</i>
        </span>
        <h1>{{ currentServiceMeta.label }} · 工程档案矩阵</h1>
        <p class="muted">
          点击卡片视图胶囊可即时切换多构型预览；点击预览窗或「进入光桌」启动大幅面 GMUNK 检视器。
        </p>
      </div>
      <div class="heading-count">
        <span class="corner tl" aria-hidden="true"></span>
        <span class="corner br" aria-hidden="true"></span>
        <strong>{{ store.filtered.length.toString().padStart(2, '0') }}</strong>
        <span>ACTIVE GROUPS / 当前装备组</span>
      </div>
    </div>

    <!-- 阵营快速筛选晶片条 (.faction-strip) -->
    <div class="faction-strip" role="group" aria-label="阵营快速筛选">
      <span class="tag">
        <b>阵营谱系</b>
        <i>FACTION FILTER</i>
      </span>
      <div class="faction-chips">
        <button
          v-for="f in store.factions"
          :key="f.id"
          type="button"
          :class="['faction-chip', { active: store.faction === f.id }]"
          :aria-pressed="store.faction === f.id"
          @click="store.faction = f.id"
        >
          <b>{{ f.code }}</b>{{ f.label }}<em>({{ f.count }})</em>
        </button>
      </div>
    </div>

    <!-- 检索与分类控制舱 (.filterbar) -->
    <div class="filterbar">
      <span class="corner tl" aria-hidden="true"></span>
      <span class="corner tr" aria-hidden="true"></span>
      <span class="corner bl" aria-hidden="true"></span>
      <span class="corner br" aria-hidden="true"></span>

      <label class="search">
        <span>SEARCH // 检索资产</span>
        <input
          v-model="store.query"
          type="search"
          placeholder="输入装备名称、代号、阵营或 Asset ID…"
        >
      </label>

      <label class="facet-control">
        <span>CATEGORY // 装备种类</span>
        <select v-model="store.categoryId">
          <option value="all">全部种类（{{ store.baseRows.length }}）</option>
          <option v-for="c in store.categories" :key="c.id" :value="c.id">
            {{ c.label }}（{{ c.count }}）
          </option>
        </select>
      </label>

      <label v-if="store.subtypes.length" class="facet-control">
        <span>SUBTYPE // 装备子类</span>
        <select v-model="store.subtypeId">
          <option value="all">全部子类</option>
          <option v-for="s in store.subtypes" :key="s.id" :value="s.id">
            {{ s.label }}（{{ s.count }}）
          </option>
        </select>
      </label>

      <label class="facet-control">
        <span>ORDER // 排序方式</span>
        <select v-model="store.sortMode">
          <option v-for="s in store.sortOptions" :key="s.id" :value="s.id">
            [{{ s.code }}] {{ s.label }}
          </option>
        </select>
      </label>

      <label class="toggle">
        <input v-model="store.byDrawing" type="checkbox">
        <span>展开全部图纸 ({{ store.telemetry.drawings }})</span>
      </label>

      <button type="button" class="reset-btn" @click="store.reset">
        RESET // 重置
      </button>
    </div>

    <!-- 遥测结果统计行 -->
    <div class="result-line" role="status" aria-live="polite">
      <span>
        DISPLAYING <b>{{ cards.length }}</b> {{ store.byDrawing ? 'DRAWING CARDS (全图纸平铺)' : 'EQUIPMENT GROUPS (装备组聚合)' }}
        <template v-if="store.favoritesOnly"> · <b class="alert-txt">★ STARRED ONLY</b></template>
      </span>
      <span>GRID: 1:1 ORTHOGRAPHIC CAD · ZERO-RADIUS OBLIVION SPEC</span>
    </div>

    <!-- 蓝图卡片网格 -->
    <div v-if="cards.length" class="asset-grid">
      <EquipmentCard
        v-for="{ equipment, asset } in cards"
        :key="store.byDrawing ? asset.id : equipment.id"
        :equipment="equipment"
        :asset="asset"
        :views="viewsFor(equipment)"
        :favorite="store.favorites.includes(equipment.id)"
        :lock-view="store.byDrawing"
        @inspect="selectedId = $event"
        @favorite="store.toggleFavorite"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty">
      <p class="eyebrow">NO MATCHING CAD ASSETS // 未命中蓝图</p>
      <h2>当前筛选条件下没有匹配的工程图纸</h2>
      <p>可尝试切换顶栏军种、阵营晶片，或点击下方按钮重置全部筛选条件。</p>
      <button type="button" @click="store.reset">RESET ALL FILTERS · 查看全部资产</button>
    </div>

    <!-- 模态大幅面战术光桌 -->
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
