<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getFactionMeta, getServiceMeta } from '../lib/catalog';
import type { AssetView, Equipment } from '../types';

const props = defineProps<{
  equipment: Equipment;
  asset: AssetView;
  views: AssetView[];
  favorite: boolean;
  lockView?: boolean;
}>();

const emit = defineEmits<{
  inspect: [id: string];
  favorite: [id: string];
}>();

const previewViewId = ref(props.asset.id);
watch(() => props.asset.id, id => {
  previewViewId.value = id;
});

const activeView = computed(
  () => props.views.find(v => v.id === previewViewId.value) ?? props.asset,
);

const serviceMeta = computed(() => getServiceMeta(props.equipment.service));
const factionMeta = computed(() => getFactionMeta(props.equipment.faction));
const assetUrl = (url: string) => import.meta.env.BASE_URL + url;

function handleViewChipClick(viewId: string) {
  if (props.lockView || previewViewId.value === viewId) {
    emit('inspect', viewId);
  } else {
    previewViewId.value = viewId;
  }
}
</script>

<template>
  <article class="asset-card">
    <span class="corner tl" aria-hidden="true"></span>
    <span class="corner tr" aria-hidden="true"></span>
    <span class="corner bl" aria-hidden="true"></span>
    <span class="corner br" aria-hidden="true"></span>

    <div class="card-top">
      <div class="card-top-meta">
        <span class="card-idx">{{ serviceMeta.code }}-{{ String(equipment.sourceOrder).padStart(2, '0') }}</span>
        <span :class="['card-faction-badge', `f-${equipment.faction}`]">{{ factionMeta.short }} · {{ factionMeta.code }}</span>
        <span class="card-view-tag">{{ activeView.label }}</span>
      </div>
      <button
        type="button"
        class="fav-btn"
        :aria-label="(favorite ? '取消收藏 ' : '收藏 ') + equipment.name"
        :aria-pressed="favorite"
        @click="$emit('favorite', equipment.id)"
      >
        {{ favorite ? '★' : '☆' }}
      </button>
    </div>

    <button
      type="button"
      class="preview inspect-preview"
      :aria-label="'大窗检视：' + equipment.name + ' · ' + activeView.label"
      @click="$emit('inspect', activeView.id)"
    >
      <img
        :src="assetUrl(activeView.url)"
        :alt="equipment.name + ' ' + activeView.label"
        loading="lazy"
        decoding="async"
      >
      <span class="preview-crosshair ch-h" aria-hidden="true"></span>
      <span class="preview-crosshair ch-v" aria-hidden="true"></span>
      <span v-if="activeView.configuration && activeView.configuration !== 'default'" class="config-pill">
        CFG // {{ activeView.configuration.toUpperCase() }}
      </span>
      <span class="inspect-hint">⤢ LIGHT TABLE</span>
    </button>

    <div class="card-body">
      <p class="classification-label">
        {{ equipment.categoryLabel }}<span v-if="equipment.subtypeLabel"> // {{ equipment.subtypeLabel }}</span>
      </p>
      <h2>{{ equipment.name }}</h2>
      <div class="card-spec-line">
        <span>{{ equipment.views.length }} VIEWS · {{ activeView.width }}×{{ activeView.height }} PX</span>
        <span>{{ (activeView.bytes / 1024).toFixed(1) }} KB</span>
      </div>

      <div class="view-links" role="group" aria-label="构型与视角切换（单击预览，再次点击进入光桌）">
        <button
          v-for="(view, idx) in views"
          :key="view.id"
          type="button"
          :class="{ 'is-active-view': view.id === activeView.id }"
          :title="view.file + '（单击切换卡片预览，再次点击打开光桌）'"
          @click="handleViewChipClick(view.id)"
        >
          <em>{{ String(idx + 1).padStart(2, '0') }}</em> {{ view.label }}
        </button>
      </div>
    </div>

    <div class="card-bottom">
      <button type="button" class="inspect-text" @click="$emit('inspect', activeView.id)">
        启动光桌检视 ⤢
      </button>
      <a :href="assetUrl(activeView.url)" :download="activeView.file">
        RAW SVG ↓
      </a>
    </div>
  </article>
</template>

<style scoped>
.inspect-preview {
  position: relative;
  width: 100%;
  border-inline: 0;
  padding: 12px;
}
.card-view-tag {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preview-crosshair {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms;
}
.ch-h {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.35) 0 10px, transparent 10px calc(100% - 10px), rgba(56, 189, 248, 0.35) calc(100% - 10px));
}
.ch-v {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.35) 0 10px, transparent 10px calc(100% - 10px), rgba(56, 189, 248, 0.35) calc(100% - 10px));
}
.inspect-preview:hover .preview-crosshair {
  opacity: 1;
}
.config-pill {
  position: absolute;
  top: 8px;
  left: 10px;
  padding: 2px 6px;
  font: 600 9.5px var(--f-num);
  letter-spacing: 0.12em;
  color: #120604;
  background: var(--alert);
}
.inspect-hint {
  position: absolute;
  bottom: 8px;
  right: 10px;
  padding: 3px 7px;
  font: 600 10px var(--f-num);
  letter-spacing: 0.12em;
  color: var(--hi);
  background: rgba(8, 10, 11, 0.88);
  border: 1px solid var(--dim);
}
.inspect-preview:hover .inspect-hint {
  border-color: var(--focus);
  color: var(--focus);
}
.view-links button em {
  font-style: normal;
  color: var(--line);
  margin-right: 3px;
}
.view-links button.is-active-view em {
  color: var(--focus);
}
.inspect-text {
  min-height: 0;
  padding: 0;
  border: 0;
  font: 600 11px var(--f-num);
  letter-spacing: 0.12em;
  color: var(--focus);
}
.inspect-text:hover {
  color: var(--hi);
}
@media (max-width: 680px) {
  .view-links button {
    min-height: 36px;
  }
  .card-bottom {
    min-height: 44px;
  }
}
</style>
