<template>
  <Teleport to="body">
    <div v-if="visible" class="export-overlay" @click.self="handleClose">
      <div class="export-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">导出数据</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
          <p class="export-description">
            选择导出格式，共 {{ totalRecords }} 条记录
          </p>
          
          <!-- 导出选项 -->
          <div class="export-options">
            <button
              class="export-option-btn"
              @click="handleExcelExport"
              :disabled="isExporting"
            >
              <IconSvg name="table" :size="32" />
              <span class="export-label">导出为 Excel</span>
              <span class="export-desc">表格格式，适合数据分析</span>
            </button>
            <button
              class="export-option-btn"
              @click="showPdfTemplateSelect = true"
              :disabled="isExporting"
            >
              <IconSvg name="file-text" :size="32" />
              <span class="export-label">导出为 PDF</span>
              <span class="export-desc">礼金簿样式，适合打印存档</span>
            </button>
          </div>
          
          <!-- PDF 模板选择 -->
          <div v-if="showPdfTemplateSelect" class="pdf-template-select">
            <h4 class="template-select-title">选择 PDF 模板</h4>
            
            <!-- 主题选择 -->
            <div class="template-option-group">
              <label class="option-label">主题</label>
              <div class="option-buttons">
                <button
                  v-for="theme in themes"
                  :key="theme.value"
                  class="theme-btn"
                  :class="{ active: selectedTheme === theme.value }"
                  @click="selectedTheme = theme.value"
                >
                  {{ theme.label }}
                </button>
              </div>
            </div>
            
            <!-- 布局选择 -->
            <div class="template-option-group">
              <label class="option-label">布局</label>
              <div class="option-buttons">
                <button
                  v-for="layout in layouts"
                  :key="layout.value"
                  class="layout-btn"
                  :class="{ active: selectedLayout === layout.value }"
                  @click="selectedLayout = layout.value"
                >
                  {{ layout.label }}
                </button>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="template-actions">
              <button class="action-btn cancel" @click="showPdfTemplateSelect = false">取消</button>
              <button class="action-btn confirm" @click="handlePdfExport" :disabled="isExporting">确认导出</button>
            </div>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="isExporting" class="export-loading">
            <span class="loading-text">正在导出，请稍候...</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useRecordsStore } from '../../stores/useRecordsStore'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import IconSvg from '../IconSvg.vue'

interface Props {
  visible: boolean
  isExporting: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'export', format: 'excel' | 'pdf', options?: any): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const recordsStore = useRecordsStore()
const { totalRecords } = storeToRefs(recordsStore)

// PDF 模板选择相关
const showPdfTemplateSelect = ref(false)
const selectedTheme = ref<'red' | 'gray' | 'golden'>('red')
const selectedLayout = ref<'h' | 'v'>('h')

// 主题选项
const themes = [
  { label: '喜庆红', value: 'red' as const },
  { label: '肃穆灰', value: 'gray' as const },
  { label: '寿宴金', value: 'golden' as const }
]

// 布局选项
const layouts = [
  { label: '紧凑型', value: 'h' as const },
  { label: '大字完整版', value: 'v' as const }
]

const handleClose = () => {
  emit('close')
  showPdfTemplateSelect.value = false
}

const handleExcelExport = () => {
  if (totalRecords.value === 0) {
    alert('没有可导出的记录')
    return
  }
  emit('export', 'excel')
}

const handlePdfExport = () => {
  if (totalRecords.value === 0) {
    alert('没有可导出的记录')
    return
  }
  emit('export', 'pdf', {
    theme: selectedTheme.value,
    layout: selectedLayout.value
  })
  showPdfTemplateSelect.value = false
}
</script>

<style scoped>
/* 遮罩层 */
.export-overlay {
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
.export-dialog {
  width: 480px;
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

.export-description {
  text-align: center;
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
  margin-bottom: 24px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 2px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  background: white;
  cursor: pointer;
  transition: all 0.25s ease;
}

.export-option-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  background: rgba(235, 86, 74, 0.05);
  transform: translateY(-2px);
  box-shadow: var(--theme-shadow-sm);
}

.export-option-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-label {
  font-size: var(--theme-font-size-lg);
  font-weight: 600;
  color: var(--theme-text-primary);
}

.export-desc {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

.export-loading {
  text-align: center;
  padding: 16px;
  margin-top: 16px;
}

.loading-text {
  color: var(--theme-primary);
  font-size: var(--theme-font-size-md);
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

/* PDF 模板选择 */
.pdf-template-select {
  margin-top: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: var(--theme-border-radius);
  border: 1px solid var(--theme-border);
}

.template-select-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0 0 16px 0;
  text-align: center;
}

.template-option-group {
  margin-bottom: 20px;
}

.option-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  margin-bottom: 8px;
}

.option-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-btn,
.layout-btn {
  padding: 8px 16px;
  border: 2px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text-primary);
  transition: all 0.2s;
}

.theme-btn:hover,
.layout-btn:hover {
  border-color: var(--theme-accent);
  background: rgba(var(--theme-primary-rgb), 0.05);
}

.theme-btn.active,
.layout-btn.active {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: white;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  padding: 10px 24px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.action-btn.cancel {
  background: transparent;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.action-btn.cancel:hover {
  background: rgba(var(--theme-primary-rgb), 0.04);
  color: var(--theme-text-primary);
}

.action-btn.confirm {
  background: var(--theme-accent);
  color: white;
}

.action-btn.confirm:hover:not(:disabled) {
  background: var(--theme-primary);
  transform: translateY(-1px);
  box-shadow: var(--theme-shadow-sm);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
