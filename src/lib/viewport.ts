export interface Camera { scale: number; x: number; y: number }
export const MIN_SCALE = 0.02;
export const MAX_SCALE = 8;

export function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number.isFinite(value) ? value : 1));
}

export function fitCamera(width: number, height: number, imageWidth: number, imageHeight: number): Camera {
  const scale = clampScale(Math.min(Math.max(1, width - 48) / imageWidth, Math.max(1, height - 48) / imageHeight));
  return { scale, x: (width - imageWidth * scale) / 2, y: (height - imageHeight * scale) / 2 };
}

// The image point beneath the cursor stays fixed when the camera scale changes.
export function zoomCamera(camera: Camera, desiredScale: number, anchorX: number, anchorY: number): Camera {
  const scale = clampScale(desiredScale);
  const ratio = scale / camera.scale;
  return { scale, x: anchorX - (anchorX - camera.x) * ratio, y: anchorY - (anchorY - camera.y) * ratio };
}
