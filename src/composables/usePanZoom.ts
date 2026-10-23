import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { fitCamera, zoomCamera } from '../lib/viewport';

export function usePanZoom(stage: Ref<HTMLElement | null>, dimensions: () => { width: number; height: number; id: string }) {
  const camera = ref({ scale: 1, x: 0, y: 0 });
  const fitting = ref(true);
  const dragging = ref(false);
  const points = new Map<number, { x: number; y: number }>();
  let observer: ResizeObserver | undefined;

  function fit() {
    const el = stage.value;
    if (!el) return;
    const d = dimensions();
    camera.value = fitCamera(el.clientWidth, el.clientHeight, d.width, d.height);
    fitting.value = true;
  }

  function zoom(scale: number, x?: number, y?: number) {
    if (!stage.value) return;
    fitting.value = false;
    camera.value = zoomCamera(camera.value, scale, x ?? stage.value.clientWidth / 2, y ?? stage.value.clientHeight / 2);
  }

  function wheel(event: WheelEvent) {
    event.preventDefault();
    const r = stage.value!.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? r.height : 1);
    zoom(camera.value.scale * Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.002), event.clientX - r.left, event.clientY - r.top);
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    stage.value!.setPointerCapture(event.pointerId);
    stage.value!.focus({ preventScroll: true });
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging.value = true;
  }

  function pointerMove(event: PointerEvent) {
    const previous = points.get(event.pointerId);
    if (!previous) return;
    fitting.value = false;
    const other = [...points.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      const r = stage.value!.getBoundingClientRect();
      const oldX = (previous.x + other.x) / 2 - r.left;
      const oldY = (previous.y + other.y) / 2 - r.top;
      if (before > 0) zoom(camera.value.scale * after / before, oldX, oldY);
      camera.value.x += (event.clientX - previous.x) / 2;
      camera.value.y += (event.clientY - previous.y) / 2;
    } else {
      camera.value.x += event.clientX - previous.x;
      camera.value.y += event.clientY - previous.y;
    }
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function pointerUp(event: PointerEvent) {
    points.delete(event.pointerId);
    dragging.value = points.size > 0;
  }

  function keydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === 'f' || event.key === '0') fit();
    else if (event.key === '1') zoom(1);
    else if (event.key === '+' || event.key === '=') zoom(camera.value.scale * 1.25);
    else if (event.key === '-') zoom(camera.value.scale / 1.25);
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      fitting.value = false;
      camera.value.x += event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0;
      camera.value.y += event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0;
    } else return;
    event.preventDefault();
  }

  onMounted(() => {
    observer = new ResizeObserver(() => { if (fitting.value) fit(); });
    if (stage.value) {
      observer.observe(stage.value);
      stage.value.addEventListener('wheel', wheel, { passive: false });
    }
    fit();
  });
  watch(() => dimensions().id, async () => { points.clear(); dragging.value = false; await nextTick(); fit(); });
  onBeforeUnmount(() => { observer?.disconnect(); stage.value?.removeEventListener('wheel', wheel); points.clear(); });

  const transform = computed(() => `translate(${camera.value.x}px, ${camera.value.y}px) scale(${camera.value.scale})`);
  return { camera, fitting, dragging, transform, fit, zoom, pointerDown, pointerMove, pointerUp, keydown };
}
