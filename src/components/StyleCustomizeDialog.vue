<template>
  <Teleport to="body">
    <div v-if="visible" class="style-dialog-overlay" @click.self="handleClose">
      <div class="style-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">样式自定义</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
          <!-- 区块一：展示模板选择 -->
          <div class="section">
            <h4 class="section-title">
              <IconSvg name="layout" :size="16" />
              展示模板
            </h4>
            <div class="template-options">
              <!-- 完整大字型 -->
              <div
                class="template-card"
                :class="{ active: localStyle === 'full' }"
                @click="localStyle = 'full'"
              >
                <div class="template-preview-img">
                  <img src="/images/完整大字型.png" alt="完整大字型预览" />
                </div>
                <div class="template-info">
                  <span class="template-name">完整大字型</span>
                  <span class="template-desc">姓名、金额、礼品、地址各占一格</span>
                </div>
                <div class="check-mark" v-if="localStyle === 'full'">
                  <IconSvg name="check" :size="14" />
                </div>
              </div>

              <!-- 简洁紧凑型 -->
              <div
                class="template-card"
                :class="{ active: localStyle === 'compact' }"
                @click="localStyle = 'compact'"
              >
                <div class="template-preview-img">
                  <img src="/Img/简洁紧凑型.png" alt="简洁紧凑型预览" />
                </div>
                <div class="template-info">
                  <span class="template-name">简洁紧凑型</span>
                  <span class="template-desc">备注小字在姓名下，礼品与金额并排</span>
                </div>
                <div class="check-mark" v-if="localStyle === 'compact'">
                  <IconSvg name="check" :size="14" />
                </div>
              </div>
            </div>
          </div>

          <!-- 区块二：自定义字体（仅影响姓名和金额显示） -->
          <div class="section font-section">
            <h4 class="section-title">
              <IconSvg name="type" :size="16" />
              书法字体
            </h4>
            <div class="font-control">
          <div class="font-selector">
            <span class="font-label">选择字体：</span>
            <select v-model="localFontCssName" class="font-select" @change="handleFontChange">
              <option value="__default__">系统默认（演示春风楷）</option>
              <option v-for="font in systemFonts" :key="font.cssName" :value="font.cssName">
                {{ font.name }}{{ font.isDefault ? '（默认）' : '' }}
              </option>
            </select>
          </div>
          <button
            v-if="localFontCssName !== '__default__'"
            class="action-btn text"
            @click="handleResetFont"
          >
            恢复默认
          </button>
        </div>

            <!-- 字体预览区 -->
            <div class="font-preview-area">
              <div class="preview-hint">字体预览（仅影响姓名和金额区域）</div>
              <div class="preview-sample" :style="{ fontFamily: currentFontFamily }">
                <span class="sample-name">赵钱孙李</span>
                <span class="sample-amount">壹贰叁肆伍陆柒捌玖拾佰仟万元整</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="dialog-footer">
          <button class="footer-btn cancel" @click="handleClose">取消</button>
          <button class="footer-btn confirm" @click="handleConfirm">应用设置</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import IconSvg from './IconSvg.vue'
import { bridge } from '../api/bridge'
import type { FontInfo } from '../types/database'

const props = defineProps<{
  visible: boolean
  config: {
    displayStyle: 'full' | 'compact'
    customFontCssName: string | null  // CSS 字体名称
  }
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', style: 'full' | 'compact'): void
  (e: 'select-font', fontCssName: string): void  // 修改：传递字体名称
  (e: 'reset-font'): void
}>()

// 本地状态（未确认前的临时值）
const localStyle = ref<'full' | 'compact'>('full')
const localFontCssName = ref('__default__')  // __default__ 表示系统默认（演示春风楷）
const systemFonts = ref<FontInfo[]>([])
const isLoadingFonts = ref(false)
const originalFontCssName = ref('__default__')

// 内置字体列表（Rust 命令失败时的备用方案）
const BUILTIN_FONTS: FontInfo[] = [
  { name: '演示春风楷', cssName: '演示春风楷', isDefault: true },
  { name: '楷体', cssName: 'KaiTi', isDefault: false },
  { name: '宋体', cssName: 'SimSun', isDefault: false },
  { name: '黑体', cssName: 'SimHei', isDefault: false },
  { name: '微软雅黑', cssName: 'Microsoft YaHei', isDefault: false },
  { name: '仿宋', cssName: 'FangSong', isDefault: false },
  { name: '幼圆', cssName: 'YouYuan', isDefault: false },
  { name: '隶书', cssName: 'LiSu', isDefault: false },
]

// 处理字体名称，对于用 & 或其他分隔符连接的多个名称，只保留第一个
const processFontName = (name: string): string => {
  // 处理多种分隔符：&, &amp;, |, , 
  const separators = [' &amp; ', ' & ', '|', ',']
  for (const sep of separators) {
    if (name.includes(sep)) {
      const parts = name.split(sep).map(p => p.trim()).filter(p => p)
      if (parts.length > 0) {
        return parts[0]
      }
    }
  }
  return name.trim()
}

// 加载系统字体列表
const loadSystemFonts = async () => {
  // 先显示内置字体作为初始占位，保持列表始终有内容
  if (systemFonts.value.length === 0) {
    systemFonts.value = BUILTIN_FONTS
  }
  isLoadingFonts.value = true
  try {
    // 使用 Rust 命令获取系统字体
    const response = await bridge.getSystemFontsList()
    if (response.success && response.data) {
      console.log('Rust 枚举到系统字体:', response.data.length, '个')
      // 处理字体名称，同时处理name和cssName
      systemFonts.value = response.data.map(font => {
        const processedName = processFontName(font.name)
        const processedCssName = processFontName(font.cssName || font.name)
        return {
          ...font,
          name: processedName,
          cssName: processedCssName
        }
      })
    } else {
      console.warn('Rust 未返回字体，使用内置列表')
    }
  } catch (e) {
    console.error('Rust 字体枚举异常:', e)
    // 保持已有字体列表
  } finally {
    isLoadingFonts.value = false
  }
}

// 同步外部配置到本地
watch(() => props.config.displayStyle, (val) => {
  localStyle.value = val
}, { immediate: true })

watch(() => props.config.customFontCssName, (val) => {
  // null 或空值表示使用系统默认（演示春风楷）
  localFontCssName.value = val || '__default__'
}, { immediate: true })

watch(() => props.visible, (val) => {
  if (val) {
    // 保存当前字体，用于取消时恢复
    originalFontCssName.value = props.config.customFontCssName || '__default__'
    localStyle.value = props.config.displayStyle
    localFontCssName.value = originalFontCssName.value
    // 每次打开对话框都重新加载系统字体
    loadSystemFonts()
  } else {
    // 取消时恢复原字体
    localFontCssName.value = originalFontCssName.value
  }
})

// 计算属性

const currentFontFamily = computed(() => {
  if (localFontCssName.value === '__default__') {
    return "'演示春风楷', 'KaiTi', 'SimSun', serif"
  }
  return `'${localFontCssName.value}', 'KaiTi', 'SimSun', serif`
})

// 方法
const handleClose = () => {
  emit('update:visible', false)
}

const handleConfirm = () => {
  emit('confirm', localStyle.value)
  if (localFontCssName.value === '__default__') {
    emit('reset-font')
  } else {
    emit('select-font', localFontCssName.value)
  }
  emit('update:visible', false)
}

const handleFontChange = () => {
  // 只更新本地状态，不立即应用
  // 等用户点击确认按钮后才真正应用
}

const handleResetFont = () => {
  localFontCssName.value = '__default__'
  // 重置时不立即生效，等确认
}

// 组件挂载时加载字体
onMounted(() => {
  loadSystemFonts()
})
</script>

<style scoped>
/* 遮罩层 */
.style-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗主体 */
.style-dialog {
  width: 680px;
  max-height: 85vh;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  box-shadow: var(--theme-shadow-lg), 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 标题栏 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--theme-border);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-text-muted);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

/* 内容区 */
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

/* 区块 */
.section {
  margin-bottom: 28px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 模板选项 */
.template-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.template-card {
  position: relative;
  border: 2px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: white;
  overflow: hidden;
}

.template-card:hover {
  border-color: rgba(var(--theme-primary-rgb), 0.25);
  box-shadow: var(--theme-shadow-sm);
  transform: translateY(-2px);
}

.template-card.active {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.10), var(--theme-shadow-sm);
}

.check-mark {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--theme-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: checkPop 0.25s ease;
}

@keyframes checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* 模板预览缩略图 */
.template-preview-img {
  background: #FAF8F5;
  border-radius: var(--theme-border-radius-sm);
  padding: 10px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  position: relative;
  overflow: hidden;
}

.template-preview-img img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: 4px;
}

/* 模板信息 */
.template-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-text-primary);
}

.template-desc {
  font-size: 11px;
  color: var(--theme-text-muted);
}

/* 字体控制区 */
.font-section {
  background: rgba(var(--theme-primary-rgb), 0.03);
  border-radius: var(--theme-border-radius);
  padding: 18px;
  border: 1px solid var(--theme-border);
}

.font-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.font-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.font-label {
  font-size: 13px;
  color: var(--theme-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.font-select {
  flex: 1;
  min-width: 0;
  max-width: 320px;
  width: 280px;
  padding: 8px 32px 8px 12px;
  font-size: 13px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  background: white;
  color: var(--theme-text-primary);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all 0.2s;
  font-family: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-select:hover {
  border-color: var(--theme-accent);
}

.font-select:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.1);
}

.font-select option {
  padding: 8px 12px;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.font-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.action-btn.primary {
  background: var(--theme-accent);
  color: white;
  box-shadow: 0 2px 6px rgba(199, 91, 57, 0.25);
}

.action-btn.primary:hover {
  background: var(--theme-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(199, 91, 57, 0.35);
}

.action-btn.text {
  background: transparent;
  color: var(--theme-accent);
  border: 1px solid var(--theme-accent);
}

.action-btn.text:hover {
  background: rgba(199, 91, 57, 0.06);
}

/* 字体预览区 */
.font-preview-area {
  border-top: 1px dashed var(--theme-border);
  padding-top: 14px;
}

.preview-hint {
  font-size: 11px;
  color: var(--theme-text-muted);
  margin-bottom: 10px;
}

.preview-sample {
  background: white;
  border-radius: var(--theme-border-radius-sm);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--theme-border);
}

.sample-name {
  font-size: 36px;
  color: var(--theme-text-primary);
  letter-spacing: 8px;
  line-height: 1.4;
}

.sample-amount {
  font-size: 26px;
  color: var(--theme-accent);
  letter-spacing: 4px;
  line-height: 1.5;
}

/* 底部操作栏 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 28px 20px;
  border-top: 1px solid var(--theme-border);
}

.footer-btn {
  padding: 10px 28px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.footer-btn.cancel {
  background: transparent;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.footer-btn.cancel:hover {
  background: rgba(var(--theme-primary-rgb), 0.04);
  color: var(--theme-text-primary);
}

.footer-btn.confirm {
  background: var(--theme-accent);
  color: white;
  box-shadow: 0 2px 8px rgba(199, 91, 57, 0.25);
}

.footer-btn.confirm:hover {
  background: var(--theme-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.35);
}

/* 滚动条 */
.dialog-body::-webkit-scrollbar {
  width: 5px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: var(--theme-border-color);
  border-radius: 3px;
  opacity: 0.4;
}
</style>
