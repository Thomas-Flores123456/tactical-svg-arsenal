<script setup lang="ts">
import { useCatalog } from './stores/catalog';
const store = useCatalog();
const services = [{ id:'all', label:'联合总库', en:'ALL SERVICES' }, { id:'army',label:'陆军资产',en:'LAND SYSTEMS' },{id:'navy',label:'海军资产',en:'NAVAL SYSTEMS'},{id:'air',label:'空军资产',en:'AIR SYSTEMS'}];
</script>
<template>
  <header class="topbar"><RouterLink class="brand" to="/"><span class="brand-mark">⊞</span><span>三军资产工作台<small>JOINT ASSET ARCHIVE / 01</small></span></RouterLink><span class="build-label">开发预览 · 基座阶段</span></header>
  <div class="workspace">
    <aside class="sidebar" aria-label="资产导航">
      <p class="eyebrow">COLLECTIONS / 资产分库</p>
      <button v-for="s in services" :key="s.id" :class="['nav-item',{active:store.service===s.id}]" :aria-pressed="store.service===s.id" @click="store.service=s.id"><span>{{s.label}}<small>{{s.en}}</small></span><b>{{store.equipment.filter(e=>s.id==='all'||e.service===s.id).length.toString().padStart(2,'0')}}</b></button>
      <div class="sidebar-section"><button class="nav-item" :aria-pressed="store.favoritesOnly" @click="store.favoritesOnly=!store.favoritesOnly"><span>我的收藏<small>LOCAL COLLECTION</small></span><b>{{store.favorites.length}}</b></button></div>
      <div class="archive-note"><span class="eyebrow">INDEX STATUS</span><strong>{{store.assets.length}}<small>图纸已索引</small></strong><p>源文件保持独立。<br>军种暂按来源目录归属；平台与阵营待逐项复核。</p></div>
    </aside>
    <main id="main"><RouterView /></main>
  </div>
  <footer class="statusbar"><span>本地资产 · 无业务后端</span><span>{{store.equipment.length}} 装备组 / {{store.assets.length}} 图纸</span><span>来源状态：未复核</span></footer>
  <p v-if="store.storageWarning" class="notice" role="status">{{store.storageWarning}}</p>
</template>
