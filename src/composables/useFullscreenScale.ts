import { ref, watch } from 'vue'

// 基准宽度：15 列表格宽度（1290px）
const BASELINE_WIDTH = 1650

// 基准高度（根据布局模式动态选择）
// 依据：根据 1920×1009 窗口下用户实测 scale=0.84 才刚好不溢出，
// 反推内容实际总高度 = 1009/0.84 ≈ 1200（而非之前的 1100）。
// 简洁紧凑型列高 650 / 完整型 770 = 0.844，按比例取 1015。
const BASELINE_HEIGHT_FULL = 1200
const BASELINE_HEIGHT_COMPACT = 1015

const MAX_SCALE = 1.5
// 矮窗口（720p）下允许收缩的最低比例，确保 scale=0.6 也能生效
const MIN_SCALE = 0.55

const displayStyle = ref<'full' | 'compact'>('full')
const scale = ref(1)

function getBaselineHeight(): number {
  return displayStyle.value === 'compact' ? BASELINE_HEIGHT_COMPACT : BASELINE_HEIGHT_FULL
}

function updateScale(): void {
  const w = window.innerWidth
  const h = window.innerHeight

  const baselineHeight = getBaselineHeight()

  // 直接用窗口尺寸除以基准尺寸；不在此步做最小窗口钳制，
  // 以保证小窗口时能按比例缩小，避免页码栏被挤出
  const scaleX = w / BASELINE_WIDTH
  const scaleY = h / baselineHeight

  // 使用较小的缩放比例，保证两个方向都能放下
  const finalScale = Math.min(scaleX, scaleY)

  scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, finalScale))
  document.documentElement.style.setProperty('--fullscreen-scale', scale.value.toString())
}

function setDisplayStyle(style: 'full' | 'compact'): void {
  if (style !== displayStyle.value) {
    displayStyle.value = style
    // 布局模式改变后立即重新计算缩放
    updateScale()
  }
}

function getCurrentScale(): number {
  return scale.value
}

function getBaseline(): { width: number; height: number } {
  return {
    width: BASELINE_WIDTH,
    height: getBaselineHeight(),
  }
}

function initFullscreenScale(): void {
  updateScale()
  window.addEventListener('resize', updateScale)
  // 当布局模式变化时，自动更新缩放
  watch(displayStyle, () => updateScale())
}

function destroyFullscreenScale(): void {
  window.removeEventListener('resize', updateScale)
}

export function useFullscreenScale() {
  return {
    scale,
    displayStyle,
    getCurrentScale,
    getBaseline,
    initFullscreenScale,
    destroyFullscreenScale,
    updateScale,
    setDisplayStyle,
  }
}

export default useFullscreenScale
