<script setup lang="ts">
import type { AssetView, Equipment } from '../types';
defineProps<{ equipment: Equipment; asset: AssetView; views: AssetView[]; favorite: boolean }>();
defineEmits<{ inspect: [id: string]; favorite: [id: string] }>();
const assetUrl = (url: string) => import.meta.env.BASE_URL + url;
</script>

<template>
  <article class="asset-card">
    <div class="card-top">
      <span>{{ equipment.service.toUpperCase() }} / {{ asset.label }}</span>
      <button :aria-label="(favorite ? '取消收藏 ' : '收藏 ') + equipment.name" :aria-pressed="favorite" @click="$emit('favorite', equipment.id)">{{ favorite ? '★' : '☆' }}</button>
    </div>
    <button class="preview inspect-preview" :aria-label="'大窗检视：' + equipment.name" @click="$emit('inspect', asset.id)">
      <img :src="assetUrl(asset.url)" :alt="equipment.name + ' ' + asset.label" loading="lazy" decoding="async">
      <span class="inspect-hint">⤢ 大窗检视</span>
    </button>
    <div class="card-body">
      <p class="classification-label">{{ equipment.categoryLabel }}<span v-if="equipment.subtypeLabel"> / {{ equipment.subtypeLabel }}</span></p>
      <h2>{{ equipment.name }}</h2>
      <p class="muted">{{ equipment.views.length }} 份图纸 · {{ asset.width }} × {{ asset.height }} px</p>
      <div class="view-links">
        <button v-for="view in views" :key="view.id" :title="view.file" @click="$emit('inspect', view.id)">{{ view.label }}</button>
      </div>
    </div>
    <div class="card-bottom"><button class="inspect-text" @click="$emit('inspect', asset.id)">进入光桌 ⤢</button><a :href="assetUrl(asset.url)" :download="asset.file">下载 SVG ↓</a></div>
  </article>
</template>

<style scoped>
.inspect-preview { position: relative; width: 100%; border-inline: 0; padding: 12px; }
.inspect-hint { position: absolute; bottom: 8px; right: 10px; padding: 4px 7px; font-size: 10px; color: var(--accent); background: #101e29e6; border: 1px solid #31515d; }
.view-links button { font-size: 11px; padding: 6px 9px; border: 1px solid var(--line); min-height: 32px; }
.inspect-text { min-height: 0; padding: 0; border: 0; font-size: inherit; color: var(--accent); }
@media(max-width:600px) { .view-links button { min-height: 44px; } .card-bottom { align-items: center; min-height: 52px; } }
</style>
