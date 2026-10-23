<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getFactionMeta, getServiceMeta } from '../lib/catalog';
import type { AssetView, Equipment } from '../types';
import { usePanZoom } from '../composables/usePanZoom';

const props = defineProps<{
  asset: AssetView;
  equipment: Equipment;
  views: AssetView[];
}>();

const emit = defineEmits<{
  close: [];
  select: [id: string];
}>();

const dialog = ref<HTMLDialogElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const panel = ref<'none' | 'details' | 'source'>('details');
const background = ref<'grid' | 'dark' | 'light' | 'checker'>('grid');
const hideBackdrop = ref(false);
const showScanline = ref(true);
const source = ref('');
const imageUrl = ref('');
const loading = ref(false);
const imageReady = ref(false);
const error = ref('');
const message = ref('');
const backdropAvailable = ref(false);
const isFullscreen = ref(false);
const canFullscreen = document.fullscreenEnabled;
const sourceArea = ref<HTMLTextAreaElement | null>(null);

const selectedIndex = computed(() => props.views.findIndex(a => a.id === props.asset.id));
const sourceUrl = computed(() => import.meta.env.BASE_URL + props.asset.url);
const serviceMeta = computed(() => getServiceMeta(props.equipment.service));
const factionMeta = computed(() => getFactionMeta(props.equipment.faction));

const {
  camera,
  fitting,
  dragging,
  transform,
  fit,
  zoom,
  pointerDown,
  pointerMove,
  pointerUp,
  keydown,
} = usePanZoom(stage, () => props.asset);

let abort: AbortController | undefined;
let requestId = 0;
let objectUrl = '';
let savedOverflow = '';
let returnFocus: HTMLElement | null = null;
let mounted = false;

function rebuildImage() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
  imageUrl.value = '';
  imageReady.value = false;
  if (!source.value) return;
  const doc = new DOMParser().parseFromString(source.value, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') {
    error.value = 'SVG 无法解析，请打开详情检查源文件。';
    return;
  }
  const backdrop = doc.querySelector('[id="layer-backdrop"]');
  backdropAvailable.value = !!backdrop;
  if (hideBackdrop.value) backdrop?.remove();
  // Render only through an <img> image context. Never inject SVG markup into the host DOM.
  objectUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }),
  );
  imageUrl.value = objectUrl;
}

async function load() {
  abort?.abort();
  abort = new AbortController();
  const controller = abort;
  const current = ++requestId;
  loading.value = true;
  error.value = '';
  message.value = '';
  source.value = '';
  backdropAvailable.value = false;
  rebuildImage();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(sourceUrl.value, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (current !== requestId) return;
    source.value = text;
    rebuildImage();
  } catch (e) {
    if (current === requestId) {
      error.value = controller.signal.aborted
        ? '图纸加载超时，请重试。'
        : `图纸加载失败：${e instanceof Error ? e.message : String(e)}`;
    }
  } finally {
    clearTimeout(timeout);
    if (current === requestId) loading.value = false;
  }
}

async function copySource() {
  const copiedId = props.asset.id;
  try {
    await navigator.clipboard.writeText(source.value);
    if (copiedId === props.asset.id) {
      message.value = '已复制原始 SVG 源码（不受底板开关影响）。';
    }
  } catch {
    if (copiedId !== props.asset.id) return;
    panel.value = 'source';
    message.value = '自动复制不可用，请在源码面板中按 Ctrl/Cmd+C 手动复制。';
    await nextTick();
    sourceArea.value?.focus();
    sourceArea.value?.select();
  }
}

async function copyAssetId() {
  try {
    await navigator.clipboard.writeText(props.asset.id);
    message.value = `已复制稳定 Asset ID：${props.asset.id}`;
  } catch {
    message.value = `Asset ID：${props.asset.id}`;
  }
}

async function fullscreen() {
  try {
    if (document.fullscreenElement === dialog.value) await document.exitFullscreen();
    else await dialog.value?.requestFullscreen();
  } catch {
    message.value = '浏览器未允许全屏；当前大窗口仍可正常检视。';
  }
}

function fullscreenChanged() {
  isFullscreen.value = document.fullscreenElement === dialog.value;
}
function close() {
  emit('close');
}
function cancel(event: Event) {
  event.preventDefault();
  if (document.fullscreenElement === dialog.value) void document.exitFullscreen();
  else close();
}
function step(delta: number) {
  const next = props.views[selectedIndex.value + delta];
  if (next) emit('select', next.id);
}
function togglePanel(value: 'details' | 'source') {
  panel.value = panel.value === value ? 'none' : value;
}

onMounted(() => {
  mounted = true;
  if (window.innerWidth <= 900) {
    panel.value = 'none';
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  savedOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value!.showModal();
  closeButton.value?.focus();
  document.addEventListener('fullscreenchange', fullscreenChanged);
  fit();
  void load();
});

watch(
  () => props.asset.id,
  () => {
    if (mounted) void load();
  },
);
watch(hideBackdrop, rebuildImage);

onBeforeUnmount(() => {
  requestId++;
  abort?.abort();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  document.removeEventListener('fullscreenchange', fullscreenChanged);
  if (document.fullscreenElement === dialog.value) void document.exitFullscreen().catch(() => {});
  dialog.value?.close();
  document.body.style.overflow = savedOverflow;
  returnFocus?.focus({ preventScroll: true });
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="inspector"
      aria-labelledby="inspector-title"
      aria-describedby="inspector-help"
      @cancel="cancel"
    >
      <span class="corner tl" aria-hidden="true"></span>
      <span class="corner tr" aria-hidden="true"></span>
      <span class="corner bl" aria-hidden="true"></span>
      <span class="corner br" aria-hidden="true"></span>

      <!-- 顶部指挥栏 -->
      <header class="inspector-head">
        <div class="inspector-title">
          <div class="inspector-tags">
            <span class="tag focus">
              <b>LIGHT TABLE</b>
              <i>{{ serviceMeta.code }}-{{ String(equipment.sourceOrder).padStart(2, '0') }} · {{ factionMeta.en }}</i>
            </span>
            <span class="tag">
              <b>{{ equipment.categoryLabel }}</b>
              <i>{{ equipment.subtypeLabel || serviceMeta.en }}</i>
            </span>
          </div>
          <h2 id="inspector-title">{{ equipment.name }}</h2>
        </div>

        <div class="inspector-head-actions">
          <button type="button" :aria-pressed="panel === 'details'" @click="togglePanel('details')">
            SPEC // 档案详情
          </button>
          <button type="button" :aria-pressed="panel === 'source'" :disabled="!source" @click="togglePanel('source')">
            XML // 原始源码
          </button>
          <button v-if="canFullscreen" type="button" @click="fullscreen">
            {{ isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN // 全屏' }}
          </button>
          <button
            ref="closeButton"
            type="button"
            class="close-inspector"
            aria-label="关闭检视，返回图库"
            @click="close"
          >
            CLOSE ×
          </button>
        </div>
      </header>

      <!-- 同装备多视角/多构型切换条 -->
      <nav class="inspector-views" aria-label="同装备图纸视图切换">
        <span class="views-prefix">VIEWS // 视角与构型 ({{ views.length }})</span>
        <button
          v-for="(view, i) in views"
          :key="view.id"
          type="button"
          :aria-pressed="view.id === asset.id"
          :title="view.file"
          @click="emit('select', view.id)"
        >
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          {{ view.label }}
          <em v-if="view.configuration" class="view-cfg">[{{ view.configuration.toUpperCase() }}]</em>
        </button>
      </nav>

      <!-- 光桌精密控制工具栏 -->
      <div class="inspector-toolbar" aria-label="光桌工具">
        <div class="tool-group">
          <button type="button" :aria-pressed="fitting" title="适应窗口（快捷键 F / 0）" @click="fit">
            FIT // 适应窗口
          </button>
          <button type="button" title="100% 像素显示" @click="zoom(1)">
            1:1 (100%)
          </button>
          <button type="button" aria-label="缩小" @click="zoom(camera.scale / 1.25)">−</button>
          <output class="zoom-readout" aria-label="缩放比例">{{ Math.round(camera.scale * 100) }}%</output>
          <button type="button" aria-label="放大" @click="zoom(camera.scale * 1.25)">+</button>
        </div>

        <div class="tool-group">
          <label class="backdrop-control">
            <input v-model="hideBackdrop" type="checkbox" :disabled="!backdropAvailable">
            <span>剥离工程图框 (#layer-backdrop)</span>
          </label>
          <label class="backdrop-control">
            <input v-model="showScanline" type="checkbox">
            <span>光桌扫描束</span>
          </label>
          <label class="background-control">
            <span>STAGE // 底板</span>
            <select v-model="background" aria-label="光桌底色">
              <option value="grid">OBLIVION 战术网格</option>
              <option value="dark">VOID 纯深空黑</option>
              <option value="light">PAPER 浅色审阅</option>
              <option value="checker">ALPHA 透明棋盘</option>
            </select>
          </label>
        </div>

        <div class="tool-group export-tools">
          <button type="button" @click="copyAssetId">COPY ID</button>
          <button type="button" :disabled="!source || !!error" @click="copySource">COPY SVG // 复制源码</button>
          <a :href="sourceUrl" :download="asset.file" class="button-link">DOWNLOAD ↓</a>
        </div>
      </div>

      <!-- 主体舞台与右侧规格舱 -->
      <div class="inspector-body" :class="{ 'has-panel': panel !== 'none' }">
        <div class="stage-container">
          <!-- 顶部与左侧微缩坐标卡尺 (GMUNK Tick Rulers) -->
          <div class="ruler ruler-top" aria-hidden="true"></div>
          <div class="ruler ruler-left" aria-hidden="true"></div>

          <!-- 左上角浮动实时遥测 HUD -->
          <div class="hud-overlay hud-tl" aria-hidden="true">
            <div><b>ASSET_ID:</b> {{ asset.id }}</div>
            <div>
              <b>CANVAS:</b> {{ asset.width }} × {{ asset.height }} PX · {{ (asset.bytes / 1024).toFixed(1) }} KB
              <template v-if="asset.configuration"> · <em>CFG={{ asset.configuration.toUpperCase() }}</em></template>
            </div>
            <div>
              <b>CAMERA:</b> ZOOM {{ Math.round(camera.scale * 100) }}% · PAN ({{ Math.round(camera.x) }}, {{ Math.round(camera.y) }})
            </div>
          </div>

          <!-- 右下角 SHA-256 完整性浮标 -->
          <div class="hud-overlay hud-br" aria-hidden="true">
            <span>SHA-256 // {{ asset.sha256.slice(0, 16).toUpperCase() }}… · ORTHOGRAPHIC 1:1 CAD</span>
          </div>

          <!-- 常驻扫描线 -->
          <div v-if="showScanline && background !== 'light'" class="scan" aria-hidden="true"></div>

          <!-- 光桌交互画布 -->
          <div
            ref="stage"
            :class="['light-table', `bg-${background}`, { dragging }]"
            tabindex="0"
            role="group"
            aria-label="图纸检视画布"
            aria-describedby="inspector-help"
            @pointerdown="pointerDown"
            @pointermove="pointerMove"
            @pointerup="pointerUp"
            @pointercancel="pointerUp"
            @lostpointercapture="pointerUp"
            @keydown="keydown"
            @dblclick="fit"
          >
            <img
              v-if="imageUrl"
              :key="imageUrl"
              class="inspection-image"
              :src="imageUrl"
              :alt="equipment.name + ' ' + asset.label"
              :style="{ width: asset.width + 'px', height: asset.height + 'px', transform }"
              draggable="false"
              @load="imageReady = true"
              @error="error = '图纸渲染失败，请重试或下载源文件检查。'"
            >
          </div>

          <div v-if="loading || (!imageReady && !error)" class="stage-state" role="status">
            <span class="tag focus"><b>LOADING</b><i>STREAMING VECTOR BLUEPRINT…</i></span>
            <span>正在载入高精度工程蓝图…</span>
          </div>

          <div v-if="error" class="stage-state stage-error" role="alert">
            <p class="alert-txt">{{ error }}</p>
            <button type="button" @click="load">RETRY // 重新加载</button>
          </div>

          <span class="corner tl" aria-hidden="true"></span>
          <span class="corner tr" aria-hidden="true"></span>
          <span class="corner bl" aria-hidden="true"></span>
          <span class="corner br" aria-hidden="true"></span>
        </div>

        <!-- 右侧规格与源码抽屉面板 -->
        <aside
          v-if="panel !== 'none'"
          class="inspector-panel"
          :aria-label="panel === 'details' ? '图纸详情' : '原始SVG源码'"
        >
          <div class="panel-heading">
            <span class="tag">
              <b>{{ panel === 'details' ? 'SPEC SHEET' : 'RAW XML' }}</b>
              <i>{{ panel === 'details' ? '图纸技术档案' : '只读矢量源码' }}</i>
            </span>
            <button type="button" aria-label="收起辅助面板" @click="panel = 'none'">HIDE ×</button>
          </div>

          <div class="rule"></div>

          <template v-if="panel === 'details'">
            <dl class="spec-dl">
              <dt>ASSET ID // 全局稳定标识</dt>
              <dd class="mono-val">{{ asset.id }}</dd>

              <dt>FACTION &amp; SERVICE // 阵营与军种</dt>
              <dd>{{ factionMeta.label }} ({{ factionMeta.en }}) · {{ serviceMeta.label }}</dd>

              <dt>CLASSIFICATION // 装备分类</dt>
              <dd>{{ equipment.categoryLabel }}<template v-if="equipment.subtypeLabel"> / {{ equipment.subtypeLabel }}</template></dd>

              <dt>VIEW &amp; CONFIG // 视角与构型</dt>
              <dd>{{ asset.label }} ({{ asset.kind }})<template v-if="asset.configuration"> · [{{ asset.configuration }}]</template></dd>

              <dt>SOURCE PATH // 仓库源文件路径</dt>
              <dd class="mono-val">{{ asset.sourcePath }}</dd>

              <dt>VIEWBOX &amp; BYTES // 画布尺寸与体积</dt>
              <dd class="mono-val">{{ asset.width }} × {{ asset.height }} PX · {{ (asset.bytes / 1024).toFixed(2) }} KB ({{ asset.bytes }} B)</dd>

              <dt>PROVENANCE // 考证与建模说明</dt>
              <dd>{{ equipment.sourceStatus }}</dd>

              <dt>SHA-256 // 字节级防篡改摘要</dt>
              <dd class="digest">{{ asset.sha256 }}</dd>
            </dl>
            <div class="rule"></div>
            <p class="muted">
              100% 代表 1 个 SVG 画布单位对应 1 个 CSS 像素。剥离底板开关仅作用于光桌实时预览，复制与下载始终保持原始无损文件。
            </p>
          </template>

          <template v-else>
            <label class="source-label" for="svg-source">
              READONLY XML // 共 {{ source.length.toLocaleString() }} 字符，可全选复制
            </label>
            <textarea
              id="svg-source"
              ref="sourceArea"
              :value="source"
              readonly
              spellcheck="false"
            ></textarea>
          </template>
        </aside>
      </div>

      <!-- 底部快捷键说明与步进器 -->
      <footer class="inspector-footer">
        <p id="inspector-help">
          CONTROLS // 滚轮无级缩放 · 按住拖拽平移 · 双击画布复位 · 聚焦画布支持 [+] [−] [方向键] [F] · [Esc] 退出光桌
        </p>
        <div class="view-step">
          <button type="button" aria-label="上一张图纸" :disabled="selectedIndex <= 0" @click="step(-1)">
            ← PREV
          </button>
          <span>{{ String(selectedIndex + 1).padStart(2, '0') }} / {{ String(views.length).padStart(2, '0') }}</span>
          <button
            type="button"
            aria-label="下一张图纸"
            :disabled="selectedIndex >= views.length - 1"
            @click="step(1)"
          >
            NEXT →
          </button>
        </div>
      </footer>

      <p v-if="message" class="inspector-message" role="status">
        {{ message }}
      </p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.inspector {
  position: fixed;
  inset: 0;
  width: calc(100vw - 28px);
  height: calc(100dvh - 28px);
  max-width: none;
  max-height: none;
  margin: auto;
  padding: 0;
  border: 1px solid var(--hi);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}
.inspector[open] {
  display: flex;
  flex-direction: column;
}
.inspector::backdrop {
  background: rgba(4, 7, 9, 0.88);
}
.inspector:fullscreen {
  width: 100vw;
  height: 100dvh;
  border: 0;
}

.inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  gap: 16px;
  border-bottom: 1px solid var(--dim);
  background: var(--panel);
  flex: none;
}
.inspector-title {
  min-width: 0;
}
.inspector-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.inspector-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--hi);
  letter-spacing: 0.06em;
  margin-top: 6px;
}

.inspector-head-actions,
.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.inspector-head-actions button {
  font-family: var(--f-num);
  font-size: 11.5px;
  letter-spacing: 0.12em;
}
.close-inspector {
  border-color: var(--alert);
  color: var(--alert);
}
.close-inspector:hover {
  background: var(--alert);
  color: #120604 !important;
  border-color: var(--alert) !important;
}

.inspector-views {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 7px 18px;
  flex: none;
  border-bottom: 1px solid var(--dim);
  background: rgba(12, 17, 19, 0.9);
}
.views-prefix {
  font-family: var(--f-num);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: var(--muted);
  margin-right: 6px;
  white-space: nowrap;
}
.inspector-views button {
  white-space: nowrap;
  min-height: 32px;
  font-family: var(--f-num);
  font-size: 11.5px;
  padding: 5px 12px;
}
.inspector-views button span {
  color: var(--line);
  margin-right: 5px;
}
.inspector-views button .view-cfg {
  font-style: normal;
  font-size: 10px;
  color: var(--alert);
  margin-left: 5px;
}
.inspector-views button[aria-pressed="true"] {
  border-color: var(--hi);
  background: rgba(212, 227, 230, 0.08);
  color: var(--hi);
}
.inspector-views button[aria-pressed="true"] span {
  color: var(--focus);
}

.inspector-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 7px 18px;
  border-bottom: 1px solid var(--dim);
  background: var(--panel);
  flex: none;
}
.inspector-toolbar button,
.button-link {
  padding: 5px 10px;
  min-height: 32px;
  font-family: var(--f-num);
  font-size: 11.5px;
  letter-spacing: 0.1em;
}
.button-link {
  border: 1px solid var(--dim);
  display: inline-flex;
  align-items: center;
  color: var(--hi);
}
.export-tools {
  margin-left: auto;
}
.zoom-readout {
  min-width: 54px;
  text-align: center;
  font-family: var(--f-num);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--focus);
  border: 1px solid var(--dim);
  padding: 4px 8px;
  background: var(--bg);
}

.backdrop-control,
.background-control {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-num);
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--text);
  min-height: 32px;
}
.background-control select {
  font: 11.5px var(--f-num);
  background: var(--bg);
  color: var(--hi);
  border: 1px solid var(--dim);
  padding: 5px 8px;
}

.inspector-body {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 10px 18px;
  gap: 12px;
}

.stage-container {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--line);
  background: #06090b;
  overflow: hidden;
}

/* GMUNK 顶部与左侧微缩坐标刻度尺 */
.ruler {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}
.ruler-top {
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  border-bottom: 1px solid rgba(95, 124, 132, 0.35);
  background-image: repeating-linear-gradient(
    90deg,
    rgba(212, 227, 230, 0.35) 0 1px,
    transparent 1px 20px
  );
}
.ruler-left {
  top: 0;
  bottom: 0;
  left: 0;
  width: 8px;
  border-right: 1px solid rgba(95, 124, 132, 0.35);
  background-image: repeating-linear-gradient(
    180deg,
    rgba(212, 227, 230, 0.35) 0 1px,
    transparent 1px 20px
  );
}

/* 舞台浮动遥测 HUD */
.hud-overlay {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  font-family: var(--f-num);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--muted);
  background: rgba(8, 10, 11, 0.82);
  border: 1px solid var(--dim);
  padding: 6px 10px;
  line-height: 1.55;
}
.hud-tl {
  top: 14px;
  left: 14px;
}
.hud-tl b {
  color: var(--hi);
  font-weight: 600;
}
.hud-tl em {
  font-style: normal;
  color: var(--alert);
}
.hud-br {
  right: 14px;
  bottom: 12px;
  padding: 4px 8px;
}

.light-table {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: grab;
}
.light-table.dragging {
  cursor: grabbing;
}

.bg-grid {
  background-color: #06090b;
  background-image:
    linear-gradient(rgba(44, 59, 64, 0.32) 1px, transparent 1px),
    linear-gradient(90deg, rgba(44, 59, 64, 0.32) 1px, transparent 1px),
    linear-gradient(rgba(95, 124, 132, 0.22) 1px, transparent 1px),
    linear-gradient(90deg, rgba(95, 124, 132, 0.22) 1px, transparent 1px);
  background-size: 20px 20px, 20px 20px, 100px 100px, 100px 100px;
}
.bg-dark {
  background: #05080a;
}
.bg-light {
  background: #dfe6ea;
}
.bg-checker {
  background-color: #1f2b33;
  background-image: conic-gradient(#2f3e47 25%, transparent 0 50%, #2f3e47 0 75%, transparent 0);
  background-size: 24px 24px;
}

.inspection-image {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  pointer-events: none;
}

.stage-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  background: rgba(8, 10, 11, 0.9);
  font-family: var(--f-num);
  font-size: 13px;
  letter-spacing: 0.12em;
  pointer-events: none;
  z-index: 4;
}
.stage-error {
  pointer-events: auto;
  padding: 20px;
  text-align: center;
}

.inspector-panel {
  width: 340px;
  flex: none;
  overflow: auto;
  min-height: 0;
  padding: 14px;
  background: var(--panel);
  border: 1px solid var(--dim);
  display: flex;
  flex-direction: column;
}
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.panel-heading button {
  min-height: 28px;
  padding: 3px 8px;
  font-family: var(--f-num);
  font-size: 11px;
}

.spec-dl dt {
  font-family: var(--f-num);
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.16em;
  margin-top: 12px;
}
.spec-dl dt:first-child {
  margin-top: 0;
}
.spec-dl dd {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--hi);
  overflow-wrap: anywhere;
}
.mono-val,
.digest {
  font-family: var(--f-num);
  font-size: 11.5px !important;
  color: var(--focus) !important;
}

.source-label {
  margin: 0 0 8px;
  font-family: var(--f-num);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.inspector-panel textarea {
  flex: 1;
  min-height: 160px;
  width: 100%;
  resize: none;
  font: 11px/1.55 var(--f-num);
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--dim);
  padding: 10px;
}

.inspector-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 18px 10px;
  flex: none;
}
.inspector-footer p {
  font-family: var(--f-num);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.view-step {
  display: flex;
  gap: 8px;
  align-items: center;
  font-family: var(--f-num);
  font-size: 12px;
  color: var(--hi);
  flex: none;
}
.view-step button {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 11px;
}

.inspector-message {
  flex: none;
  padding: 7px 18px;
  background: rgba(56, 189, 248, 0.12);
  border-top: 1px solid var(--focus);
  color: var(--hi);
  font-family: var(--f-num);
  font-size: 12px;
  letter-spacing: 0.08em;
}

@media (max-width: 960px) {
  .inspector-panel {
    position: absolute;
    right: 18px;
    top: 170px;
    bottom: 52px;
    width: min(360px, calc(100% - 36px));
    z-index: 6;
    box-shadow: 0 0 0 1px var(--hi);
  }
  .export-tools {
    margin-left: 0;
  }
}

@media (max-width: 680px) {
  .inspector {
    width: 100vw;
    height: 100dvh;
    border: 0;
  }
  .inspector-head {
    padding: 8px 12px;
    align-items: flex-start;
    gap: 8px;
  }
  .inspector-title h2 {
    font-size: 15px;
  }
  .inspector-head-actions {
    gap: 4px;
  }
  .inspector-head-actions button {
    padding: 6px 8px;
    min-height: 38px;
    font-size: 11px;
  }
  .inspector-views,
  .inspector-toolbar {
    padding: 6px 12px;
  }
  .inspector-body {
    padding: 8px 12px;
  }
  .hud-tl {
    max-width: calc(100% - 28px);
    font-size: 9.5px;
  }
  .hud-br {
    display: none;
  }
  .inspector-footer {
    padding: 0 12px 8px;
  }
  .inspector-footer p {
    max-width: 210px;
    font-size: 9.5px;
  }
  .inspector-panel {
    top: 86px;
    bottom: 56px;
    right: 12px;
    width: calc(100% - 24px);
  }
}
</style>
