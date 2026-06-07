import { ref, watch } from 'vue'

// 基准宽度：15 列表格宽度（1290px）
const BASELINE_WIDTH = 1650

// 基准高度（根据布局模式动态选择）
// 完整大字型：
//   - 窗口 1920×1009 → available 747px，grid 自然 770px（record-column=770px）→ scale=1.0 刚好 fit
//   - 窗口 2560×1369 → scale=1.244，grid=958px，available=1129px → fit
//   - 窗口 1280×720 → scale=0.78，grid=601px，available=491px → overflow 由 max-height 滚动兜底
// 简洁紧凑型：列高 650px → grid 自然 650px，available 更大，fit 更轻松
const BASELINE_HEIGHT_FULL = 1100
const BASELINE_HEIGHT_COMPACT = 1143

const MAX_SCALE = 1.5
// 矮窗口（720p）下允许收缩的最低比例；内容在 0.78 下仍然可读
const MIN_SCALE = 0.78

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
