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
          <div class="export-options">
            <button
              class="export-option-btn"
              @click="emit('export', 'excel')"
              :disabled="isExporting || totalRecords === 0"
            >
              <IconSvg name="table" :size="32" />
              <span class="export-label">导出为 Excel</span>
              <span class="export-desc">表格格式，适合数据分析</span>
            </button>
            <button
              class="export-option-btn"
              @click="emit('export', 'pdf')"
              :disabled="isExporting || totalRecords === 0"
            >
              <IconSvg name="file-text" :size="32" />
              <span class="export-label">导出为 PDF</span>
              <span class="export-desc">礼金簿样式，适合打印存档</span>
            </button>
          </div>
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
import IconSvg from '../IconSvg.vue'

interface Props {
  visible: boolean
  isExporting: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'export', format: 'excel' | 'pdf'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const recordsStore = useRecordsStore()
const { totalRecords } = storeToRefs(recordsStore)

const handleClose = () => {
  emit('close')
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
