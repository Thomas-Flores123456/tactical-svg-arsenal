<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { AssetView, Equipment } from '../types';
import { usePanZoom } from '../composables/usePanZoom';

const props = defineProps<{ asset: AssetView; equipment: Equipment; views: AssetView[] }>();
const emit = defineEmits<{ close: []; select: [id: string] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const panel = ref<'none' | 'details' | 'source'>('none');
const background = ref('dark');
const hideBackdrop = ref(false);
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
const { camera, fitting, dragging, transform, fit, zoom, pointerDown, pointerMove, pointerUp, keydown } = usePanZoom(stage, () => props.asset);
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
  objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
  imageUrl.value = objectUrl;
}

async function load() {
  abort?.abort();
  abort = new AbortController();
  const controller = abort;
  const current = ++requestId;
  loading.value = true;
  error.value = ''; message.value = ''; source.value = '';
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
    if (current === requestId) error.value = controller.signal.aborted ? '图纸加载超时，请重试。' : `图纸加载失败：${e instanceof Error ? e.message : String(e)}`;
  } finally {
    clearTimeout(timeout);
    if (current === requestId) loading.value = false;
  }
}

async function copySource() {
  const copiedId = props.asset.id;
  try {
    await navigator.clipboard.writeText(source.value);
    if (copiedId === props.asset.id) message.value = '已复制原始 SVG 源码（不受底板开关影响）。';
  } catch {
    if (copiedId !== props.asset.id) return;
    panel.value = 'source';
    message.value = '自动复制不可用，请在源码面板中按 Ctrl/Cmd+C 手动复制。';
    await nextTick();
    sourceArea.value?.focus();
    sourceArea.value?.select();
  }
}

async function fullscreen() {
  try {
    if (document.fullscreenElement === dialog.value) await document.exitFullscreen();
    else await dialog.value?.requestFullscreen();
  } catch { message.value = '浏览器未允许全屏；当前大窗口仍可正常检视。'; }
}

function fullscreenChanged() { isFullscreen.value = document.fullscreenElement === dialog.value; }
function close() { emit('close'); }
function cancel(event: Event) {
  event.preventDefault();
  if (document.fullscreenElement === dialog.value) void document.exitFullscreen();
  else close();
}
function step(delta: number) {
  const next = props.views[selectedIndex.value + delta];
  if (next) emit('select', next.id);
}
function togglePanel(value: 'details' | 'source') { panel.value = panel.value === value ? 'none' : value; }

onMounted(() => {
  mounted = true;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  savedOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value!.showModal();
  closeButton.value?.focus();
  document.addEventListener('fullscreenchange', fullscreenChanged);
  fit();
  void load();
});
watch(() => props.asset.id, () => { if (mounted) void load(); });
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
    <dialog ref="dialog" class="inspector" aria-labelledby="inspector-title" aria-describedby="inspector-help" @cancel="cancel">
      <header class="inspector-head">
        <div class="inspector-title"><p class="eyebrow">LIGHT TABLE / 大幅面光桌</p><h2 id="inspector-title">{{ equipment.name }}</h2></div>
        <div class="inspector-head-actions">
          <button :aria-pressed="panel === 'details'" @click="togglePanel('details')">详情</button>
          <button v-if="canFullscreen" @click="fullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</button>
          <button ref="closeButton" class="close-inspector" aria-label="关闭检视，返回图库" @click="close">关闭 <span aria-hidden="true">×</span></button>
        </div>
      </header>

      <nav class="inspector-views" aria-label="同装备图纸视图">
        <button v-for="(view, i) in views" :key="view.id" :aria-pressed="view.id === asset.id" :title="view.file" @click="emit('select', view.id)"><span>{{ String(i + 1).padStart(2, '0') }}</span> {{ view.label }}</button>
      </nav>

      <div class="inspector-toolbar" aria-label="光桌工具">
        <div class="tool-group">
          <button :aria-pressed="fitting" title="适应窗口（光桌聚焦时 F / 0）" @click="fit">适应窗口</button>
          <button title="100%像素显示，不代表真实物理比例" @click="zoom(1)">100%</button>
          <button aria-label="缩小" @click="zoom(camera.scale / 1.25)">−</button>
          <output class="zoom-readout" aria-label="缩放比例">{{ Math.round(camera.scale * 100) }}%</output>
          <button aria-label="放大" @click="zoom(camera.scale * 1.25)">+</button>
        </div>
        <div class="tool-group">
          <label class="backdrop-control"><input v-model="hideBackdrop" type="checkbox" :disabled="!backdropAvailable">隐藏工程底板</label>
          <label class="background-control">底色 <select v-model="background" aria-label="光桌底色"><option value="dark">深空黑</option><option value="light">浅色</option><option value="checker">透明棋盘</option></select></label>
        </div>
        <div class="tool-group export-tools">
          <button :disabled="!source || !!error" @click="copySource">复制 SVG</button>
          <button :aria-pressed="panel === 'source'" :disabled="!source" @click="togglePanel('source')">源码</button>
          <a :href="sourceUrl" :download="asset.file" class="button-link">下载原图</a>
        </div>
      </div>

      <div class="inspector-body" :class="{ 'has-panel': panel !== 'none' }">
        <div class="stage-container">
          <div ref="stage" :class="['light-table', `bg-${background}`, { dragging }]" tabindex="0" role="group" aria-label="图纸检视画布" aria-describedby="inspector-help" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @lostpointercapture="pointerUp" @keydown="keydown" @dblclick="fit">
            <img v-if="imageUrl" :key="imageUrl" class="inspection-image" :src="imageUrl" :alt="equipment.name + ' ' + asset.label" :style="{ width: asset.width + 'px', height: asset.height + 'px', transform }" draggable="false" @load="imageReady = true" @error="error = '图纸渲染失败，请重试或下载源文件检查。'">
          </div>
          <div v-if="loading || (!imageReady && !error)" class="stage-state" role="status">正在载入图纸…</div>
          <div v-if="error" class="stage-state stage-error" role="alert"><p>{{ error }}</p><button @click="load">重新加载</button></div>
          <span class="stage-corner corner-tl" aria-hidden="true"></span><span class="stage-corner corner-br" aria-hidden="true"></span>
        </div>
        <aside v-if="panel !== 'none'" class="inspector-panel" :aria-label="panel === 'details' ? '图纸详情' : '原始SVG源码'">
          <div class="panel-heading"><h3>{{ panel === 'details' ? '图纸档案' : '原始 SVG' }}</h3><button aria-label="收起辅助面板" @click="panel = 'none'">收起</button></div>
          <template v-if="panel === 'details'">
            <dl><dt>Asset ID</dt><dd>{{ asset.id }}</dd><dt>源文件位置</dt><dd>{{ asset.sourcePath }}</dd><dt>画布 / 大小</dt><dd>{{ asset.width }} × {{ asset.height }} px · {{ (asset.bytes / 1024).toFixed(1) }} KB</dd><dt>来源状态</dt><dd>{{ equipment.sourceStatus }}</dd><dt>SHA-256</dt><dd class="digest">{{ asset.sha256 }}</dd></dl>
            <p class="muted">100% 是一个 SVG 画布单位对应一个 CSS 像素，不代表装备真实物理比例。底板开关只影响预览，复制和下载始终使用原始文件。</p>
          </template>
          <template v-else><label class="source-label" for="svg-source">只读源码，可选中复制</label><textarea id="svg-source" ref="sourceArea" :value="source" readonly spellcheck="false"></textarea></template>
        </aside>
      </div>

      <footer class="inspector-footer">
        <p id="inspector-help">滚轮缩放 · 拖拽平移 · 双击适应 · 聚焦画布后可用 + / −、方向键、F · Esc 关闭</p>
        <div class="view-step"><button aria-label="上一张图纸" :disabled="selectedIndex <= 0" @click="step(-1)">←</button><span>{{ selectedIndex + 1 }} / {{ views.length }}</span><button aria-label="下一张图纸" :disabled="selectedIndex >= views.length - 1" @click="step(1)">→</button></div>
      </footer>
      <p v-if="message" class="inspector-message" role="status">{{ message }}</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.inspector { position: fixed; inset: 0; width: calc(100vw - 32px); height: calc(100dvh - 32px); max-width: none; max-height: none; margin: auto; padding: 0; border: 1px solid #46606c; background: #0a1116; color: var(--text); overflow: hidden; }
.inspector[open] { display: flex; flex-direction: column; }
.inspector::backdrop { background: rgb(0 5 9 / 86%); }
.inspector:fullscreen { width: 100vw; height: 100dvh; border: 0; }
.inspector-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 16px; border-bottom: 1px solid var(--line); flex: none; }
.inspector-title { min-width: 0; }
.inspector-title h2 { font-size: 20px; margin-top: 5px; }
.inspector-head-actions, .tool-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.inspector-head-actions { flex: none; }
.close-inspector { border-color: #65828f; }
.inspector-views { display: flex; gap: 6px; overflow-x: auto; padding: 8px 20px; flex: none; border-bottom: 1px solid var(--line); }
.inspector-views button { white-space: nowrap; min-height: 36px; font-size: 12px; padding: 6px 14px; }
.inspector-views button span { color: var(--muted); margin-right: 5px; }
.inspector-views button[aria-pressed=true] { border-color: var(--accent); background: #18303a; }
.inspector-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 20px; padding: 8px 20px; border-bottom: 1px solid var(--line); flex: none; }
.inspector-toolbar button, .button-link { padding: 7px 11px; font-size: 12px; }
.button-link { border: 1px solid var(--line); display: inline-flex; min-height: 40px; align-items: center; }
.export-tools { margin-left: auto; }
.zoom-readout { min-width: 48px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--accent); }
.backdrop-control, .background-control { display: flex; align-items: center; gap: 6px; font-size: 12px; min-height: 40px; }
.background-control select { font: inherit; background: #132129; color: var(--text); border: 1px solid var(--line); padding: 8px; }
.inspector-body { flex: 1; min-height: 0; display: flex; padding: 12px 20px; gap: 12px; }
.stage-container { position: relative; flex: 1; min-width: 0; min-height: 0; border: 1px solid var(--line); }
.light-table { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; cursor: grab; }
.light-table.dragging { cursor: grabbing; }
.bg-dark { background: #060a0d; }
.bg-light { background: #e1e7eb; }
.bg-checker { background-color: #24313a; background-image: conic-gradient(#38464f 25%, transparent 0 50%, #38464f 0 75%, transparent 0); background-size: 24px 24px; }
.inspection-image { position: absolute; top: 0; left: 0; max-width: none; transform-origin: 0 0; pointer-events: none; }
.stage-state { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; background: #0c141dee; font-size: 14px; pointer-events: none; }
.stage-error { pointer-events: auto; padding: 20px; text-align: center; }
.stage-corner { position: absolute; width: 14px; height: 14px; pointer-events: none; border-color: var(--accent); }
.corner-tl { left: -1px; top: -1px; border-left: 2px solid; border-top: 2px solid; }
.corner-br { right: -1px; bottom: -1px; border-right: 2px solid; border-bottom: 2px solid; }
.inspector-panel { width: 320px; flex: none; overflow: auto; min-height: 0; padding: 14px; background: #111e25; border: 1px solid var(--line); display: flex; flex-direction: column; }
.panel-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.panel-heading h3 { margin: 0; font-size: 14px; }
.inspector-panel dt { color: var(--muted); font-size: 11px; margin-top: 18px; }
.inspector-panel dd { margin: 6px 0 0; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.digest { font-family: Consolas, monospace; font-size: 11px !important; }
.source-label { margin: 15px 0 10px; font-size: 12px; color: var(--muted); }
.inspector-panel textarea { flex: 1; min-height: 120px; width: 100%; resize: none; font: 11px/1.6 Consolas, monospace; background: #070d12; color: var(--text); border: 1px solid var(--line); padding: 10px; }
.inspector-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 0 20px 10px; flex: none; }
.inspector-footer p { font-size: 11px; color: var(--muted); }
.view-step { display: flex; gap: 10px; align-items: center; font-size: 12px; flex: none; }
.view-step button { min-height: 32px; padding: 5px 12px; }
.inspector-message { flex: none; padding: 8px 20px; background: #17333e; font-size: 12px; }
button:disabled { opacity: .4; cursor: not-allowed; }
@media (max-width: 900px) {
  .inspector-panel { position: absolute; right: 20px; top: 190px; bottom: 60px; width: min(360px, calc(100% - 40px)); z-index: 2; box-shadow: 0 0 0 1px #4b6874; }
  .export-tools { margin-left: 0; }
}
@media (max-width: 600px) {
  .inspector { width: 100vw; height: 100dvh; border: 0; }
  .inspector-head { padding: 10px 12px; align-items: start; gap: 8px; }
  .inspector-title h2 { font-size: 15px; }
  .inspector-title .eyebrow { font-size: 9px; }
  .inspector-head-actions { gap: 4px; }
  .inspector-head-actions button { padding: 8px; min-height: 44px; font-size: 12px; }
  .inspector-views { padding: 8px 12px; }
  .inspector-views button { min-height: 44px; }
  .inspector-toolbar { padding: 6px 12px; gap: 6px 12px; }
  .inspector-toolbar button { min-height: 44px; }
  .inspector-body { padding: 8px 12px; }
  .inspector-footer { padding: 0 12px 8px; }
  .inspector-footer p { max-width: 220px; font-size: 10px; }
  .inspector-panel { top: 90px; bottom: 65px; right: 12px; width: calc(100% - 24px); }
}
@media (max-height: 540px) {
  .inspector { overflow-y: auto; }
  .inspector-body { min-height: 220px; }
}
</style>
