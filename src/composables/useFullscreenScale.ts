import { ref } from 'vue'

// 方案：基准尺寸打开时为 1.0 倍，随后仅在界面放大时等比放大，保持最小/最大缩放
let baselineWidth = 0
let baselineHeight = 0
const scale = ref(1)

function setBaseline(width: number, height: number): void {
  baselineWidth = width
  baselineHeight = height
}

function getBaseline(): { width: number; height: number } {
  return {
    width: baselineWidth || 1440,
    height: baselineHeight || 900,
  }
}

function calculateScale(): number {
  const w = window.innerWidth
  const h = window.innerHeight
  if (baselineWidth <= 0 || baselineHeight <= 0) {
    return 1
  }
  const sx = w / baselineWidth
  const sy = h / baselineHeight
  const candidate = Math.min(sx, sy)
  // 仅放大，不缩小，最大放大到 3 倍以适应 2K/4K 屏幕
  if (candidate > 1) return Math.min(3, candidate)
  return 1
}

function updateScale(): void {
  const newScale = calculateScale()
  scale.value = newScale
  document.documentElement.style.setProperty('--fullscreen-scale', scale.value.toString())
}

function getCurrentScale(): number {
  return scale.value
}

function initFullscreenScale(): void {
  setBaseline(window.innerWidth, window.innerHeight)
  updateScale()
  window.addEventListener('resize', updateScale)
}

function destroyFullscreenScale(): void {
  window.removeEventListener('resize', updateScale)
}

export function useFullscreenScale() {
  return {
    scale,
    getCurrentScale,
    initFullscreenScale,
    destroyFullscreenScale,
    updateScale,
    setBaseline,
    getBaseline,
  }
}

export default useFullscreenScale
