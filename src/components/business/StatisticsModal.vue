<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-content statistics-modal">
        <div class="modal-header">
          <h3 class="modal-title">统计详情</h3>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
          <div class="stat-detail-grid">
            <div class="stat-detail-item">
              <span class="stat-detail-label">人数</span>
              <span class="stat-detail-value">{{ statistics.totalCount }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">总金额</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.totalAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">现金</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.cashAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">微信</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.wechatAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">内收</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.internalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Statistics } from '../../types/database'

interface Props {
  statistics: Statistics
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.modal-content {
  min-width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);
  border-bottom: 1px solid var(--theme-border);
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
}

.stat-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--theme-spacing-md);
}

.stat-detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-md);
  background: rgba(235, 86, 74, 0.1);
  border-radius: var(--theme-border-radius);
  gap: 8px;
}

.stat-detail-item:first-child,
.stat-detail-item:nth-child(2) {
  grid-column: span 2;
}

.stat-detail-label {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

.stat-detail-value {
  font-size: var(--theme-font-size-lg);
  font-weight: bold;
  color: var(--theme-text-primary);
}
</style>