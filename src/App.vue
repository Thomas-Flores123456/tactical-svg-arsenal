<script setup lang="ts">
import { useCatalog } from './stores/catalog';

const store = useCatalog();

const services = [
  { id: 'all', code: '00', label: '联合总库', en: 'JOINT ARCHIVE' },
  { id: 'navy', code: '01', label: '海军舰艇', en: 'NAVAL SYSTEMS' },
  { id: 'army', code: '02', label: '陆军装甲', en: 'LAND SYSTEMS' },
  { id: 'air', code: '03', label: '空天战机', en: 'AIR SYSTEMS' },
] as const;

const serviceCount = (id: string) =>
  store.equipment.filter(e => id === 'all' || e.service === id).length;
</script>

<template>
  <!-- 顶栏 (.topbar，同源对齐 samples/SVG .bar.top) -->
  <header class="topbar">
    <RouterLink class="brand" to="/">
      <svg class="brand-hex" viewBox="0 0 30 26" aria-hidden="true">
        <path d="M8 1h14l7 12-7 12H8L1 13z" stroke-width="1.4" />
        <circle cx="15" cy="13" r="4.5" stroke-width="1.2" />
      </svg>
      <div class="brand-text">
        <div class="brand-title-row">
          <span>三军工程蓝图总库</span>
          <small>TACTICAL SVG ARSENAL · OBLIVION GFX</small>
        </div>
      </div>
    </RouterLink>

    <nav class="top-service-tabs" aria-label="军种分库快速切换">
      <button
        v-for="s in services"
        :key="s.id"
        type="button"
        :class="['nav-tab', { active: store.service === s.id }]"
        :aria-pressed="store.service === s.id"
        @click="store.service = s.id"
      >
        <em>{{ s.code }}</em>{{ s.label }}<b>[{{ serviceCount(s.id).toString().padStart(2, '0') }}]</b>
      </button>
    </nav>

    <div class="top-right-telemetry">
      <span class="tag focus">
        <b>VAULT</b>
        <i>{{ store.equipment.length }} GROUPS · {{ store.assets.length }} DRAWINGS</i>
      </span>
      <div class="online">
        <span class="led" aria-hidden="true"></span>
        <span>并网 · ONLINE</span>
      </div>
    </div>
  </header>

  <div class="workspace">
    <!-- 左栏：Oblivion 规格遥测与分库导轨 (.sidebar) -->
    <aside class="sidebar" aria-label="战术遥测与资产分库导航">
      <span class="tag">
        <b>统帅部图库</b>
        <i>GMUNK LIGHT TABLE · V1.0</i>
      </span>
      <h2 class="rail-title">三军正交工程蓝图光桌</h2>
      <p class="rail-pitch">
        收录海陆空三军正交侧顶工程蓝图与多构型战术变体。所有图纸均经 SHA-256 基线锁定，支持无级缩放平移、底板剥离与纯净源码提取。
      </p>

      <div class="rule"></div>
      <span class="tag">
        <b>实时遥测</b>
        <i>TELEMETRY READOUTS</i>
      </span>
      <ul class="readouts" aria-label="当前筛选遥测统计">
        <span class="corner tl" aria-hidden="true"></span>
        <span class="corner br" aria-hidden="true"></span>
        <li>
          <span class="num">{{ store.telemetry.groups.toString().padStart(2, '0') }}</span>
          <small>当前装备组<em>ACTIVE GROUPS</em></small>
        </li>
        <li>
          <span class="num">{{ store.telemetry.drawings.toString().padStart(3, '0') }}</span>
          <small>匹配图纸数<em>INDEXED VIEWS</em></small>
        </li>
        <li>
          <span class="num">{{ store.telemetry.variants.toString().padStart(2, '0') }}</span>
          <small>多构型变体<em>CONFIG VARIANTS</em></small>
        </li>
        <li>
          <span class="num" :class="{ 'alert-txt': store.favoritesOnly }">{{ store.telemetry.favorites.toString().padStart(2, '0') }}</span>
          <small>已标星收藏<em>STARRED UNITS</em></small>
        </li>
      </ul>

      <div class="rule"></div>
      <span class="tag">
        <b>军种分库</b>
        <i>SERVICE COLLECTIONS</i>
      </span>
      <div class="service-stack">
        <button
          v-for="s in services"
          :key="s.id"
          type="button"
          :class="['nav-item', { active: store.service === s.id }]"
          :aria-pressed="store.service === s.id"
          @click="store.service = s.id"
        >
          <span class="nav-item-main">
            <span class="nav-item-label">
              <span class="nav-item-code">{{ s.code }}</span>
              <span>{{ s.label }}</span>
            </span>
            <small>{{ s.en }}</small>
          </span>
          <b>{{ serviceCount(s.id).toString().padStart(2, '0') }}</b>
        </button>
        <button
          type="button"
          :class="['nav-item', { active: store.favoritesOnly }]"
          :aria-pressed="store.favoritesOnly"
          @click="store.favoritesOnly = !store.favoritesOnly"
        >
          <span class="nav-item-main">
            <span class="nav-item-label">
              <span class="nav-item-code" style="color: var(--alert)">★</span>
              <span>我的收藏夹</span>
            </span>
            <small>STARRED ARCHIVE</small>
          </span>
          <b>{{ store.favorites.length.toString().padStart(2, '0') }}</b>
        </button>
      </div>

      <div class="rule"></div>
      <span class="tag">
        <b>大类矩阵</b>
        <i>CATEGORY MATRIX</i>
      </span>
      <div class="category-matrix" role="group" aria-label="装备大类快速过滤">
        <button
          type="button"
          :class="['cat-row', { active: store.categoryId === 'all' }]"
          @click="store.categoryId = 'all'"
        >
          <span>00 · 全部装备种类</span>
          <em>{{ store.baseRows.length }}</em>
        </button>
        <button
          v-for="(c, idx) in store.categories"
          :key="c.id"
          type="button"
          :class="['cat-row', { active: store.categoryId === c.id }]"
          @click="store.categoryId = c.id"
        >
          <span>{{ (idx + 1).toString().padStart(2, '0') }} · {{ c.label }}</span>
          <em>{{ c.count }}</em>
        </button>
      </div>

      <div class="archive-note">
        <span class="cap">INTEGRITY CONTRACT // SHA-256</span>
        <p>
          全库 <code>&lt;img&gt;</code> 沙箱隔离渲染，零脚本注入。<br>
          双击任意光桌画布可瞬时复位相机。
        </p>
      </div>
    </aside>

    <main id="main">
      <RouterView />
    </main>
  </div>

  <!-- 底栏 (.statusbar，同源对齐 samples/SVG .bar.bottom) -->
  <footer class="statusbar">
    <span>OBLIVION UI GFX · GMUNK LIGHT TABLE SPEC</span>
    <span>ACTIVE: {{ store.filtered.length }}/{{ store.equipment.length }} GROUPS · {{ store.telemetry.drawings }}/{{ store.assets.length }} DRAWINGS</span>
    <span>SHA-256 VERIFIED · LOCAL ZERO-BACKEND</span>
  </footer>

  <p v-if="store.storageWarning" class="notice" role="status">
    {{ store.storageWarning }}
  </p>
</template>
