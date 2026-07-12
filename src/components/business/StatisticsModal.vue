<template>
  <Teleport to="body">
    <div v-if="visible" class="statistics-overlay" @click.self="handleClose">
      <div class="statistics-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">统计详情</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
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
            <div class="stat-detail-item group-expense">
              <span class="stat-detail-label">开支</span>
              <span class="stat-detail-value expense">{{ formatMoney(statistics.groupTotalExpense) }}</span>
            </div>
            <div class="stat-detail-item group-balance">
              <span class="stat-detail-label">结余</span>
              <span class="stat-detail-value balance">{{ formatMoney(statistics.groupTotalBalance) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import IconSvg from '../IconSvg.vue'
import type { Statistics } from '../../types/database'

interface Props {
  visible: boolean
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

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
/* 遮罩层 */
.statistics-overlay {
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
.statistics-dialog {
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

.stat-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(235, 86, 74, 0.1);
  border-radius: var(--theme-border-radius);
  gap: 8px;
  transition: all 0.2s ease;
}

.stat-detail-item:hover {
  background: rgba(235, 86, 74, 0.15);
  transform: translateY(-2px);
  box-shadow: var(--theme-shadow-sm);
}

.stat-detail-item:first-child,
.stat-detail-item:nth-child(2) {
  grid-column: span 2;
}

.stat-detail-label {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
  font-weight: 500;
}

.stat-detail-value {
  font-size: var(--theme-font-size-lg);
  font-weight: 600;
  color: var(--theme-text-primary);
}

.stat-detail-value.expense {
  color: #ef4444;
}

.stat-detail-value.balance {
  color: #22c55e;
}

.group-expense {
  background: rgba(239, 68, 68, 0.1);
}

.group-balance {
  background: rgba(34, 197, 94, 0.1);
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
</style>
