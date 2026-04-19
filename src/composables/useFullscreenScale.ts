import { ref } from 'vue'

const BASELINE_WIDTH = 1650
const BASELINE_HEIGHT = 1170
const MIN_WINDOW_WIDTH = 1650
const MIN_WINDOW_HEIGHT = 1080
const MIN_SCALE = 0.7
const MAX_SCALE = 1.5
const scale = ref(1)

function updateScale(): void {
  const w = window.innerWidth
  const h = window.innerHeight

  // 限制最小宽高
  const constrainedWidth = Math.max(w, MIN_WINDOW_WIDTH)
  const constrainedHeight = Math.max(h, MIN_WINDOW_HEIGHT)
  
  const scaleX = constrainedWidth / BASELINE_WIDTH
  const scaleY = constrainedHeight / BASELINE_HEIGHT

  // 使用较小的缩放比例，确保内容不会超出窗口
  const finalScale = Math.min(scaleX, scaleY)

  scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, finalScale))
  document.documentElement.style.setProperty('--fullscreen-scale', scale.value.toString())
}

function getCurrentScale(): number {
  return scale.value
}

function getBaseline(): { width: number; height: number } {
  return {
    width: BASELINE_WIDTH,
    height: BASELINE_HEIGHT,
  }
}

function initFullscreenScale(): void {
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
    getBaseline,
  }
}

export default useFullscreenScale
