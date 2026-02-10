<template>
  <div class="record-list-container">
    <!-- 标题栏 -->
    <div class="list-header">
      <h2 class="list-title">礼金簿</h2>
      <div class="page-indicator">
        第 {{ currentPage }} / {{ totalPages }} 页
      </div>
    </div>

    <!-- 竖排展示区域 -->
    <div class="list-content" ref="listContent">
      <div
        v-for="record in paginatedRecords"
        :key="record.id || record.Id"
        class="record-column"
        :class="{ 'deleted': record.isDeleted || record.IsDeleted }"
      >
        <!-- 姓名 -->
        <div class="record-cell name-cell">
          <span class="cell-label">姓名</span>
          <span class="cell-value">{{ record.GuestName || record.guestName }}</span>
        </div>

        <!-- 金额大写 -->
        <div class="record-cell amount-cell">
          <span class="cell-label">金额</span>
          <span class="cell-value">{{ record.AmountChinese || record.amountChinese || numberToChinese(record.Amount || record.amount) }}</span>
          <span class="cell-amount">¥{{ formatAmount(record.Amount || record.amount) }}</span>
        </div>

        <!-- 支付方式标记 -->
        <div class="record-cell payment-cell">
          <span class="cell-label">方式</span>
          <span
            class="payment-badge"
            :class="`payment-${record.PaymentType ?? record.paymentType}`"
          >
            {{ getPaymentLabel(record.PaymentType ?? record.paymentType) }}
          </span>
        </div>

        <!-- 物品 -->
        <div v-if="record.ItemDescription || record.itemDescription" class="record-cell item-cell">
          <span class="cell-label">物品</span>
          <span class="cell-value">{{ record.ItemDescription || record.itemDescription }}</span>
        </div>

        <!-- 备注 -->
        <div v-if="record.Remark || record.remark" class="record-cell remark-cell">
          <span class="cell-label">备注</span>
          <span class="cell-value">{{ record.Remark || record.remark }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="record-actions">
          <button
            class="action-btn edit-btn"
            @click="$emit('edit', record)"
            title="编辑"
          >
            ✏️
          </button>
          <button
            class="action-btn delete-btn"
            @click="$emit('delete', record.id || record.Id)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="paginatedRecords.length === 0" class="empty-state">
        <div class="empty-icon">📖</div>
        <div class="empty-text">暂无记录</div>
        <div class="empty-hint">请在左侧录入礼金</div>
      </div>
    </div>

    <!-- 分页控制 -->
    <div class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="currentPage--"
      >
        ← 上一页
      </button>
      <div class="page-info">
        共 {{ records.length }} 条记录
      </div>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
      >
        下一页 →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Record } from '../types/database';
import { numberToChinese, formatAmount } from '../utils/amountConverter';

// Props
const props = defineProps<{
  records: Record[];
  pageSize?: number;
}>();

// Emits
const emit = defineEmits<{
  (e: 'edit', record: Record): void;
  (e: 'delete', id: number): void;
}>();

// 当前页码
const currentPage = ref(1);

// 每页显示条数
const pageSize = computed(() => props.pageSize || 10);

// 总页数
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.records.length / pageSize.value));
});

// 当前页的数据
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return props.records.slice(start, end);
});

// 监听记录变化，重置页码
watch(() => props.records.length, () => {
  currentPage.value = 1;
});

// 获取支付方式标签
const getPaymentLabel = (type: number): string => {
  const labels: Record<number, string> = {
    0: '现',
    1: '微',
    2: '内',
  };
  return labels[type] || '现';
};

// 暴露方法
defineExpose({
  currentPage,
  totalPages,
  goToPage: (page: number) => {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value));
  },
  goToLastPage: () => {
    currentPage.value = totalPages.value;
  },
});
</script>

<style scoped>
.record-list-container {
  background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 3px solid #DAA520;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(218, 165, 32, 0.5);
}

.list-title {
  color: #FFD700;
  font-size: 28px;
  font-weight: bold;
  font-family: 'KaiTi', 'STKaiti', serif;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin: 0;
}

.page-indicator {
  color: #FFD700;
  font-size: 14px;
  font-family: 'KaiTi', 'STKaiti', serif;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
}

.list-content {
  flex: 1;
  display: flex;
  flex-direction: row-reverse; /* 竖排从右到左 */
  gap: 20px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 20px;
  background: rgba(139, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(218, 165, 32, 0.3);
}

/* 竖排样式 */
.record-column {
  writing-mode: vertical-rl;
  text-orientation: upright;
  width: 72px;
  min-width: 72px;
  background: rgba(255, 248, 220, 0.95);
  border-radius: 8px;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: 2px solid #DAA520;
  position: relative;
  transition: all 0.3s ease;
}

.record-column:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.record-column.deleted {
  opacity: 0.5;
  background: rgba(200, 200, 200, 0.8);
}

.record-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 2px dashed rgba(139, 0, 0, 0.3);
  min-height: 40px;
}

.record-cell:last-of-type {
  border-bottom: none;
}

/* 姓名单元格突出显示 */
.name-cell {
  background: rgba(139, 0, 0, 0.05);
  border-radius: 4px;
  padding: 12px 4px;
  margin: -4px 0;
}

/* 金额单元格突出显示 */
.amount-cell {
  background: rgba(218, 165, 32, 0.1);
  border-radius: 4px;
  padding: 12px 4px;
  margin: -4px 0;
}

.cell-label {
  font-size: 11px;
  color: #8B4513;
  font-weight: 600;
  font-family: 'KaiTi', 'STKaiti', serif;
  opacity: 0.8;
  margin-bottom: 2px;
}

.cell-value {
  font-size: 16px;
  color: #000;
  font-weight: bold;
  font-family: 'KaiTi', 'STKaiti', serif;
  letter-spacing: 4px;
  line-height: 1.4;
}

.cell-amount {
  font-size: 13px;
  color: #8B0000;
  font-family: 'KaiTi', 'STKaiti', serif;
  font-weight: 600;
  margin-top: 4px;
}

.name-cell .cell-value {
  font-size: 22px;
  color: #8B0000;
  letter-spacing: 6px;
}

.amount-cell .cell-value {
  font-size: 15px;
  color: #000;
  letter-spacing: 3px;
  font-weight: 700;
}

.payment-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  font-family: 'KaiTi', 'STKaiti', serif;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.payment-0 {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
}

.payment-1 {
  background: linear-gradient(135deg, #2196F3 0%, #1565C0 100%);
}

.payment-2 {
  background: linear-gradient(135deg, #FF9800 0%, #E65100 100%);
}

.record-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(139, 0, 0, 0.2);
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: rgba(139, 0, 0, 0.1);
}

.action-btn:hover {
  transform: scale(1.1);
}

.edit-btn:hover {
  background: #4CAF50;
}

.delete-btn:hover {
  background: #f44336;
}

.empty-state {
  writing-mode: horizontal-tb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 215, 0, 0.6);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 24px;
  font-family: 'KaiTi', 'STKaiti', serif;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.7;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 2px solid rgba(218, 165, 32, 0.5);
}

.page-btn {
  padding: 10px 20px;
  border: 2px solid #DAA520;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
  font-size: 14px;
  font-family: 'KaiTi', 'STKaiti', serif;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: rgba(255, 215, 0, 0.3);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #FFD700;
  font-size: 14px;
  font-family: 'KaiTi', 'STKaiti', serif;
}

/* 滚动条样式 */
.list-content::-webkit-scrollbar {
  height: 8px;
}

.list-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.list-content::-webkit-scrollbar-thumb {
  background: #DAA520;
  border-radius: 4px;
}

.list-content::-webkit-scrollbar-thumb:hover {
  background: #FFD700;
}
</style>
