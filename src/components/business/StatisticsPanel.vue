<template>
  <div class="statistics-panel">
    <div class="stat-vertical">
      <div class="stat-row">
        <span class="stat-value">{{ statistics.totalCount }}</span>
      </div>
      <div class="stat-row">
        <span 
          class="stat-value amount-total" 
          @click="emit('toggle-amount')" 
          style="cursor: pointer;"
        >
          {{ displayAmount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Statistics } from '../../types/database'

interface Props {
  statistics: Statistics
  hideAmount: boolean
}

interface Emits {
  (e: 'toggle-amount'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 格式化金额显示
const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 计算显示的金额（支持隐藏）
const displayAmount = computed(() => {
  if (props.hideAmount) {
    return '****'
  }
  return formatMoney(props.statistics.totalAmount)
})
</script>

<style scoped>
/*
  ========================================
  统计面板 - 水墨古韵风格
  ========================================
*/

.statistics-panel {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  padding: 11px;
  box-shadow: var(--theme-shadow);
  border: 1px solid var(--theme-border);
}

/* 统计垂直布局 */
.stat-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-xs);
  margin-bottom: var(--theme-spacing-md);
}

.stat-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-xs);
  border-radius: var(--theme-border-radius);
  width: 100%;
}

.stat-value {
  font-size: var(--theme-font-size-md);
  font-weight: bold;
  color: var(--theme-text-primary);
  font-family: var(--theme-font-family);
}

.amount-total {
  font-size: var(--theme-font-size-xl);
  color: var(--theme-accent);
  font-family: var(--font-name-amount);
  transition: color 0.3s ease;
}

.amount-total:hover {
  color: var(--theme-accent-dark);
}
</style>