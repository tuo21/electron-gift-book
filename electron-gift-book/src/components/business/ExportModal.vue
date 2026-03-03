<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-content export-modal">
        <div class="modal-header">
          <h3 class="modal-title">导出数据</h3>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
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
  </div>
</template>

<script setup lang="ts">
import { useRecordsStore } from '../../stores/useRecordsStore'
import { storeToRefs } from 'pinia'
import IconSvg from '../IconSvg.vue'

interface Props {
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
</script>

<style scoped>
.export-modal {
  min-width: 400px;
  max-width: 90vw;
}

.modal-content {
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);
  border-bottom: 1px solid var(--theme-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--theme-font-size-lg);
  color: var(--theme-text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--theme-border-radius);
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--theme-text-primary);
}

.modal-body {
  padding: var(--theme-spacing-lg);
  flex: 1;
}

.export-description {
  text-align: center;
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
  margin-bottom: var(--theme-spacing-lg);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-md);
}

.export-option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-xs);
  padding: var(--theme-spacing-lg);
  border: 2px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  background: var(--theme-paper);
  cursor: pointer;
  transition: all 0.3s;
}

.export-option-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  background: rgba(235, 86, 74, 0.05);
  transform: translateY(-2px);
}

.export-option-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-label {
  font-size: var(--theme-font-size-lg);
  font-weight: bold;
  color: var(--theme-text-primary);
}

.export-desc {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

.export-loading {
  text-align: center;
  padding: var(--theme-spacing-md);
  margin-top: var(--theme-spacing-md);
}

.loading-text {
  color: var(--theme-primary);
  font-size: var(--theme-font-size-md);
}
</style>