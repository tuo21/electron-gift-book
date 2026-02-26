<template>
  <!-- 
    ========================================
    主内容区 (main-content)
    ========================================
    布局：左右两栏
    - giftbook-section: 左侧礼金簿（自适应宽度）
    - sidebar-section: 右侧边栏（固定宽度320px）
  -->
  <main class="main-content">
    <!-- 左侧：礼金簿展示 -->
    <section class="giftbook-section">
      <RecordList 
        ref="recordListRef" 
        :records="records" 
        :page-size="pageSize" 
        :current-page="currentPage" 
        :total-pages="totalPages"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @update:current-page="emit('update:currentPage', $event)"
      />
    </section>

    <!-- 
      右侧：信息录入和统计
      包含两个面板：
      1. form-panel: 录入表单面板（上方）
      2. statistics-panel: 统计信息面板（下方）
    -->
    <aside class="sidebar-section">
      <!-- 录入表单面板 -->
      <div class="form-panel">
        <RecordForm 
          ref="recordFormRef" 
          @submit="emit('submit', $event)" 
          @update="emit('update', $event)" 
        />
      </div>

      <!-- 统计面板 -->
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
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RecordList from '../RecordList.vue'
import RecordForm from '../RecordForm.vue'
import type { Record, Statistics } from '../../types/database'

interface Props {
  records: Record[]
  pageSize: number
  currentPage: number
  totalPages: number
  statistics: Statistics
  hideAmount: boolean
}

interface Emits {
  (e: 'edit', record: Record): void
  (e: 'delete', id: number): void
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void
  (e: 'update', record: Record): void
  (e: 'update:currentPage', page: number): void
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

// 暴露组件方法给父组件
defineExpose({
  // 跳转到最后一页
  goToLastPage: () => {
    // 通过emit触发页码更新
    emit('update:currentPage', props.totalPages)
  }
})
</script>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--theme-spacing-lg);
  padding: var(--theme-spacing-lg);
  overflow: auto;
}

/* 【左侧】礼金簿展示区 */
.giftbook-section {
  flex: 1;        /* 自适应宽度 */
  min-width: 0;   /* 防止内容撑开 */
  max-width: 1163px; /* 最大宽度限制 */
  overflow: hidden;
}

/* 【右侧】边栏 */
.sidebar-section {
  width: 208px;   /* 固定宽度，可调整 */
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-lg);          /* 面板间距 24px */
  overflow-y: auto;
}

/*
  ========================================
  【统计面板】
  ========================================
  - background: 背景色（使用主题纸张色）
  - border-radius: 圆角
  - padding: 内边距
  - box-shadow: 阴影
*/
.statistics-panel {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);   /* 8px */
  padding: 11px;            /* 11px */
  box-shadow: var(--theme-shadow);
}

/* 统计垂直布局：上下排列 */
.stat-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-xs);    /* 4px */
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
  font-size: var(--theme-font-size-md);   /* 16px */
  font-weight: bold;
  color: var(--theme-text-primary);
}

.amount-total {
  font-size: var(--theme-font-size-md);   /* 16px */
  color: var(--theme-primary);
}

/* 【录入表单面板】 */
.form-panel {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-lg);
  box-shadow: var(--theme-shadow);
  flex: 1;        /* 占据剩余空间 */
}

/* ==================== 滚动条样式 ==================== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: var(--theme-accent); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--theme-accent-dark); }
</style>