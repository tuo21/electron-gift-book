import { ref } from 'vue'

const BASELINE_WIDTH = 1522
const BASELINE_HEIGHT = 930
const MIN_SCALE = 0.7
const MAX_SCALE = 3
const scale = ref(1)

function calculateScale(): number {
  const w = window.innerWidth
  const h = window.innerHeight

  const sx = w / BASELINE_WIDTH
  const sy = h / BASELINE_HEIGHT

  const candidate = Math.min(sx, sy)

  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, candidate))
}

function updateScale(): void {
  const newScale = calculateScale()
  scale.value = newScale
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
