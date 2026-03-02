<template>
  <!-- 
    ========================================
    礼金簿展示组件
    ========================================
    整体结构：
    1. giftbook-content: 礼金表格展示区（含宣纸背景）
    2. pagination-bar: 分页控制栏
    
    调整建议：
    - 修改列宽：调整 theme.css 中的 --grid-column-width
    - 修改列间距：调整 theme.css 中的 --grid-column-gap
    - 修改每页显示数量：修改 page-size 属性（默认15）
  -->
  <div class="giftbook-container">
    
    <!-- 
      礼金簿内容区
      - paper-background: 宣纸肌理背景（绝对定位）
      - records-grid: 礼金表格网格（横向滚动）
    -->
    <div class="giftbook-content" ref="giftbookContent">
      
      <!-- 宣纸背景层 -->
      <div class="paper-background"></div>
      
      <!-- 
        礼金表格网格
        - 使用 flex 布局，横向排列
        - 支持横向滚动（overflow-x: auto）
        - 每列宽度由 CSS 变量 --grid-column-width 控制（默认72px）
      -->
      <div class="records-grid">
        <!-- 
          数据列
          每列包含：姓名标签、姓名、备注、礼金标签、礼金大写、支付方式+小写金额
          支持右键菜单：编辑、删除
          使用 v-memo 优化渲染，仅当记录数据变化时才重新渲染
        -->
        <div
          v-for="record in paginatedRecords"
          :key="record.id"
          v-memo="[record.id, record.guestName, record.amount, record.itemDescription, record.paymentType, record.remark, record.isDeleted, record.id === highlightedRecordId, record.id ? newRecordIds.has(record.id) : false]"
          class="record-column"
          :class="{ 
            'deleted': record.isDeleted, 
            'highlighted': record.id === highlightedRecordId,
            'new-record': record.id && newRecordIds.has(record.id)
          }"
          @contextmenu.prevent="showContextMenu($event, record)"
        >
          <!-- 姓名标签 -->
          <div class="cell label-cell">
            <span class="label-text">姓名</span>
          </div>
          
          <!-- 姓名展示框（竖排文字） -->
          <div class="cell name-cell">
            <span class="name-text" :style="{ fontSize: getAdaptiveFontSize(record.guestName, true) + 'px' }">{{ record.guestName }}</span>
          </div>
          
          <!-- 备注（固定显示，无数据留空） -->
          <div class="cell remark-cell">
            <span class="remark-text">{{ record.remark || '\u00A0' }}</span>
          </div>
          
          <!-- 礼金标签 -->
          <div class="cell label-cell">
            <span class="label-text">礼金</span>
          </div>
          
          <!-- 礼金展示框（大写金额和物品，左右并排竖排） -->
          <div class="cell amount-cell">
            <div class="amount-content-horizontal">
              <span class="amount-chinese" :style="{ fontSize: getAdaptiveFontSize(numberToChinese(record.amount), false, !!record.itemDescription) + 'px' }">
                {{ numberToChinese(record.amount) }}
              </span>
              <span v-if="record.itemDescription" class="item-description">{{ record.itemDescription }}</span>
            </div>
          </div>
          
          <!-- 支付方式和金额小写 -->
          <div class="cell payment-cell">
            <img 
              :src="getPaymentIcon(record.paymentType)" 
              :alt="getPaymentLabel(record.paymentType)"
              class="payment-icon"
            />
            <span class="amount-number">¥{{ formatAmount(record.amount) }}</span>
          </div>
          
        </div>
        
        <!-- 
          空白列填充
          用于保持每页固定显示15格，不足时显示空白占位
          使用 v-show 控制显示，避免 DOM 频繁创建销毁导致闪烁
        -->
        <div 
          v-for="n in pageSize" 
          :key="'empty-' + n" 
          v-show="n <= emptyColumns"
          class="record-column empty-column"
        >
          <div class="cell label-cell"><span class="label-text">姓名</span></div>
          <div class="cell name-cell"><span class="name-text"></span></div>
          <div class="cell remark-cell"><span class="remark-text">&nbsp;</span></div>
          <div class="cell label-cell"><span class="label-text">礼金</span></div>
          <div class="cell amount-cell"><span class="amount-chinese"></span></div>
          <div class="cell payment-cell">
            <div class="payment-placeholder"></div>
            <span class="amount-number"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 
      ========================================
      分页控制栏
      ========================================
      包含：上一页按钮、页码信息、下一页按钮
    -->
    <div class="pagination-bar">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="goToPrevPage"
      >
        ← 上一页
      </button>
      
      <div class="page-info">
        <div class="page-input-wrapper">
          <span>第</span>
          <input
            type="number"
            class="page-input"
            :value="currentPage"
            min="1"
            :max="totalPages"
            @keydown.enter="handlePageInput"
            @blur="handlePageInput"
          />
          <span>/ {{ totalPages }} 页</span>
        </div>
        <span class="record-count">共 {{ records.length }} 条记录</span>
      </div>
      
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="goToNextPage"
      >
        下一页 →
      </button>
    </div>

    <!-- 右键菜单 - 使用 Teleport 传送到 body，避免 transform 影响 fixed 定位 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="context-menu-item" @click="handleEditClick">
          <IconSvg name="edit" :size="14" />
          <span class="menu-text">编辑</span>
        </div>
        <div class="context-menu-item delete" @click="handleDeleteClick">
          <IconSvg name="trash" :size="14" color="#EF4444" />
          <span class="menu-text">删除</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import IconSvg from './IconSvg.vue';
import type { Record } from '../types/database';
import { numberToChinese, formatAmount } from '../utils/amountConverter';
import { PaymentType, getPaymentTypeText } from '../constants';

// ==================== 动画相关 ====================
// 使用响应式 Set 跟踪新记录动画状态（更高效）
const newRecordIds = ref<Set<number>>(new Set());

// 添加新记录动画标记
const markNewRecord = (recordId: number) => {
  newRecordIds.value.add(recordId);
  // 触发响应式更新
  newRecordIds.value = new Set(newRecordIds.value);
  // 动画完成后移除标记（与CSS动画时长匹配）
  setTimeout(() => {
    newRecordIds.value.delete(recordId);
    newRecordIds.value = new Set(newRecordIds.value);
  }, 400);
};

// ==================== 缓存优化 ====================
// 使用 shallowRef 缓存分页数据，避免不必要的重新渲染
const cachedPaginatedRecords = shallowRef<Record[]>([]);

// ==================== Props & Emits ====================
const props = defineProps<{
  records: Record[];
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'edit', record: Record): void;
  (e: 'delete', id: number): void;
}>();

// ==================== 高亮记录 ====================
const highlightedRecordId = ref<number | null>(null);

const highlightRecord = (recordId: number) => {
  highlightedRecordId.value = recordId;
  // 3秒后取消高亮
  setTimeout(() => {
    highlightedRecordId.value = null;
  }, 3000);
};

// ==================== 右键菜单逻辑 ====================
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  record: null as Record | null,
});

// 显示右键菜单（带边界检查）
const showContextMenu = (event: MouseEvent, record: Record) => {
  // 菜单尺寸估算
  const menuWidth = 120;
  const menuHeight = 80;

  // 获取窗口尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 计算菜单位置，确保不超出窗口边界
  let x = event.clientX;
  let y = event.clientY;

  // 检查右边界
  if (x + menuWidth > windowWidth) {
    x = windowWidth - menuWidth - 10;
  }

  // 检查下边界
  if (y + menuHeight > windowHeight) {
    y = windowHeight - menuHeight - 10;
  }

  contextMenu.value = {
    visible: true,
    x,
    y,
    record,
  };
};

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.value.visible = false;
};

// 点击编辑
const handleEditClick = () => {
  if (contextMenu.value.record) {
    emit('edit', contextMenu.value.record);
  }
  hideContextMenu();
};

// 点击删除
const handleDeleteClick = () => {
  if (contextMenu.value.record) {
    const confirmed = confirm(`确定要删除 ${contextMenu.value.record.guestName} 的记录吗？`);
    if (confirmed) {
      emit('delete', contextMenu.value.record.id || 0);
    }
  }
  hideContextMenu();
};

// 点击其他地方隐藏菜单
onMounted(() => {
  document.addEventListener('click', hideContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu);
});

// ==================== 分页逻辑 ====================
const pageSize = computed(() => props.pageSize || 15);

// 当前页码（支持外部控制）
const currentPage = computed({
  get: () => props.currentPage ?? 1,
  set: (value) => emit('update:currentPage', value)
});

// 总页数（优先使用外部传入的totalPages，否则基于records长度计算）
const totalPages = computed(() => {
  if (props.totalPages !== undefined) {
    return props.totalPages;
  }
  // 客户端分页模式：基于records长度计算
  return Math.max(1, Math.ceil(props.records.length / pageSize.value));
});

// 当前页数据（切片）- 使用缓存避免重复计算
// 只有当页码或记录数量真正变化时才重新计算
const paginatedRecords = computed(() => {
  // 如果提供了totalPages且records长度小于等于pageSize，假定records已经是当前页数据
  if (props.totalPages !== undefined && props.records.length <= pageSize.value) {
    // 只有当记录真正变化时才更新缓存
    if (props.records !== cachedPaginatedRecords.value) {
      cachedPaginatedRecords.value = props.records;
    }
    return cachedPaginatedRecords.value;
  }
  
  // 否则进行客户端切片
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const newSlice = props.records.slice(start, end);
  
  // 强制更新缓存，确保响应式更新
  cachedPaginatedRecords.value = newSlice;
  
  return cachedPaginatedRecords.value;
});

// 空白列数量（用于填充到固定格数）- 使用缓存确保稳定
const emptyColumns = computed(() => {
  const currentCount = paginatedRecords.value.length;
  const maxSlots = pageSize.value;
  const newEmptyCount = Math.max(0, maxSlots - currentCount);
  
  return newEmptyCount;
});

// 监听记录变化，重置到第一页（仅客户端分页模式）
// 注意：增量更新时不需要重置页码，只有在全量刷新时才重置
watch(() => props.records.length, () => {
  // 仅在未提供totalPages（客户端分页）时处理
  if (props.totalPages === undefined) {
    // 不再自动重置到第一页，保持当前页码
    // 由父组件控制页码逻辑
  }
});

// 分页操作
const goToPrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value = currentPage.value - 1;
  }
};
const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value = currentPage.value + 1;
  }
};

// 处理页码输入跳转
const handlePageInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let page = parseInt(target.value, 10);

  // 验证页码范围
  if (isNaN(page) || page < 1) {
    page = 1;
  } else if (page > totalPages.value) {
    page = totalPages.value;
  }

  // 跳转页码
  if (page !== currentPage.value) {
    currentPage.value = page;
  }

  // 更新输入框显示（防止非法值）
  target.value = page.toString();
};

// ==================== 辅助函数 ====================
const getPaymentIcon = (type: number): string => {
  const icons: { [key: number]: string } = {
    [PaymentType.CASH]: './images/现金收入icon.png',
    [PaymentType.WECHAT]: './images/微信收入icon.png',
    [PaymentType.INTERNAL]: './images/内收收入icon.png',
  };
  return icons[type] || icons[PaymentType.CASH];
};

const getPaymentLabel = (type: number): string => {
  return getPaymentTypeText(type);
};

// 根据文字长度计算自适应字号（最大40，最小20）
const getAdaptiveFontSize = (text: string, isName: boolean = false, hasItem: boolean = false): number => {
  const maxSize = 40;
  const minSize = 20;
  const maxLength = isName ? 3 : (hasItem ? 2 : 3);

  if (!text || text.length <= maxLength) {
    return maxSize;
  }

  const reduceSize = (text.length - maxLength) * 9;
  return Math.max(minSize, maxSize - reduceSize);
};

// ==================== 暴露方法 ====================
defineExpose({
  currentPage,
  totalPages,
  goToPage: (page: number) => {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value));
  },
  goToLastPage: () => {
    currentPage.value = totalPages.value;
  },
  // 跳转到指定记录所在的页面
  goToRecord: (recordId: number) => {
    const index = props.records.findIndex(r => r.id === recordId);
    if (index !== -1) {
      const page = Math.floor(index / pageSize.value) + 1;
      currentPage.value = page;
      return true;
    }
    return false;
  },
  // 高亮指定记录
  highlightRecord,
  // 标记新记录（触发动画）
  markNewRecord,
});
</script>

<style scoped>
/* 
  ========================================
  礼金簿容器
  ========================================
  - height: 100% 占满父容器高度
  - display: flex + flex-direction: column 垂直排列
*/
.giftbook-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  overflow: hidden;
}

/* 
  ========================================
  礼金簿内容区
  ========================================
  - flex: 1 占据剩余空间
  - position: relative 为宣纸背景定位
  - padding: 内边距
*/
.giftbook-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: var(--theme-spacing-lg);
  width: 100%;
  max-width: 1290px;
}

/* 
  ========================================
  宣纸背景
  ========================================
  - position: absolute 绝对定位覆盖整个区域
  - opacity: 0.18 透明度18%
  - pointer-events: none 不拦截鼠标事件
  
  调整建议：
  - 修改透明度：调整 opacity（0-1）
  - 修改背景图：更换 background-image
*/
.paper-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/洒金宣纸肌理.png');
  background-size: cover;
  background-position: center;
  opacity: 0.45;
  pointer-events: none;
}

/* 
  ========================================
  礼金表格网格
  ========================================
  - display: flex 弹性布局，横向排列
  - gap: 列间距（CSS变量控制）
  - overflow-x: auto 横向滚动
  
  调整建议：
  - 修改列间距：调整 theme.css 中的 --grid-column-gap
*/
.records-grid {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--theme-spacing-md);
  width: 100%;
  max-width: 1290px;
}

/* 
  ========================================
  单列样式
  ========================================
  - width: 列宽（CSS变量控制，默认72px）
  - background: 半透明白色背景
  - border: 边框（只保留左、上、下，右边框由相邻列共享）
  - writing-mode: vertical-rl 竖排文字
  
  调整建议：
  - 修改列宽：调整 theme.css 中的 --grid-column-width
  - 修改背景透明度：调整 rgba 的第四个值（0-1）
  - 修改圆角：调整 border-radius
*/
.record-column {
  width: var(--grid-column-width);    /* 72px */
  min-width: var(--grid-column-width);
  height: 507px;                      /* 固定高度507px */
  min-height: 507px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.185);  /* 白色90%不透明 */
  border: 1px solid rgba(235, 86, 74, 0.28);
  border-right: none;  /* 去掉右边框，由相邻列共享 */
  border-radius: 0;  /* 去掉圆角 */
  display: flex;
  flex-direction: column;
  padding: var(--theme-spacing-sm);   /* 8px */
  box-shadow: none;  /* 去掉阴影 */
  transition: all 0.3s ease;
}

/* 最后一列补上右边框 */
.record-column:last-child {
  border-right: 1px solid rgba(235, 86, 74, 0.15);
}

/* 悬停效果：去掉阴影和上浮 */
.record-column:hover {
  box-shadow: none;
  transform: none;
}

/* 已删除记录样式 */
.record-column.deleted {
  opacity: 0.5;
  background: rgba(200, 200, 200, 0.8);
}

/* 高亮动画 */
@keyframes highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(235, 86, 74, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(235, 86, 74, 0);
  }
}

.record-column.highlighted {
  animation: highlight-pulse 1s ease-in-out 1;
  border: 2px solid var(--theme-accent);
  z-index: 10;
}

/* 新记录入场动画 - 简化动画，提升流畅度 */
@keyframes slide-in-from-top {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.record-column.new-record {
  animation: slide-in-from-top 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  will-change: transform, opacity;
}

/* 优化性能：使用 GPU 加速 */
.record-column {
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 空白列样式 */
.empty-column {
  opacity: 0.4;
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(235, 86, 74, 0.08);  /* 空白列边框更淡 */
}

/* 空白列最后一列补上右边框 */
.empty-column:last-child {
  border-right: 1px solid rgba(235, 86, 74, 0.08);
}

/* 
  ========================================
  单元格通用样式
  ========================================
*/
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-xs) 0;  /* 4px */
  border-bottom: 1px dotted rgba(235, 86, 74, 0.12);  /* 点线分隔，更细更淡 */
}

.cell:last-child { border-bottom: none; }

/* 标签单元格 */
.label-cell { padding: var(--theme-spacing-xs) 0; }

.label-text {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-primary);
  font-weight: bold;
  writing-mode: horizontal-tb;  /* 水平文字 */
  font-family: var(--font-family-fixed);  /* 固定文字使用宋体 */
}

/* 
  ========================================
  姓名单元格
  ========================================
  - writing-mode: vertical-rl 竖排从右到左
  - text-orientation: upright 文字直立
  - letter-spacing: 字间距
  
  调整建议：
  - 修改字号：调整 font-size
  - 修改字间距：调整 letter-spacing
*/
.name-cell {
  flex: 0 0 auto;
  height: 170px;  /* 固定姓名框高度170px */
  min-height: 150px;
  justify-content: center;
}

.name-text {
  color: var(--theme-text-primary);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 4px;
  transition: font-size 0.2s ease;
  font-family: var(--font-name-amount);  /* 姓名使用演示春风楷 */
}

/* 备注单元格 */
.remark-cell {
  flex: 0 0 auto;
  height: 21px;                       /* 固定高度21px */
  min-height: 21px;
  max-height: 21px;
  justify-content: center;
  overflow: hidden;
}

.remark-text {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-text-secondary);
  /* 此处文字为横排，故注释掉此处代码 */
  /* writing-mode: vertical-rl;
  text-orientation: upright;*/
}

/* 礼金单元格（大写金额） */
.amount-cell {
  flex: 0 0 auto;
  height: 200px;  /* 固定礼金框高度200px */
  min-height: 180px;
  justify-content: center;
}

.amount-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 金额和物品左右并排 */
.amount-content-horizontal {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 0px;
  height: 100%;
}

.amount-chinese {
  color: var(--theme-text-primary);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 2px;
  line-height: 1.6;
  transition: font-size 0.2s ease;
  font-family: var(--font-name-amount);  /* 大写金额使用演示春风楷 */
}

.item-description {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-text-secondary);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 1px;
  max-height: 100%;
  overflow: hidden;
}

/* 支付方式单元格 */
.payment-cell {
  flex: 0 0 auto;
  gap: var(--theme-spacing-xs);
  padding: var(--theme-spacing-sm) 0;
}

.payment-icon {
  width: 24px;    /* 图标宽度 */
  height: 24px;   /* 图标高度 */
  object-fit: contain;
}

.payment-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
}

.amount-number {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-text-secondary);
}

/* 操作按钮单元格 */
.actions-cell {
  flex: 0 0 auto;
  flex-direction: row;
  justify-content: center;
  gap: var(--theme-spacing-xs);
  padding-top: var(--theme-spacing-sm);
  border-top: 1px solid rgba(235, 86, 74, 0.2);
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(235, 86, 74, 0.1);
  transform: scale(1.1);
}

/* 
  ========================================
  分页控制栏
  ========================================
*/
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);  /* 16px 24px */
  background: rgba(235, 86, 74, 0.05);
  border-top: 1px solid rgba(235, 86, 74, 0.2);
}

.page-btn {
  padding: var(--theme-spacing-sm) var(--theme-spacing-lg);  /* 8px 24px */
  border: 1px solid var(--theme-accent);
  border-radius: var(--theme-border-radius);
  background: transparent;
  color: var(--theme-accent);
  font-family: var(--theme-font-family);
  font-size: var(--theme-font-size-sm);  /* 14px */
  cursor: pointer;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: var(--theme-accent);
  color: var(--theme-text-light);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.page-number {
  font-size: var(--theme-font-size-md);  /* 16px */
  font-weight: bold;
  color: var(--theme-text-primary);
}

.record-count {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-text-secondary);
}

/* 页码输入框样式 */
.page-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.page-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid var(--theme-border-color);
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  background: white;
  color: var(--theme-text-primary);
  font-family: var(--theme-font-family);
}

.page-input:focus {
  outline: none;
  border-color: var(--theme-accent);
}

/* 隐藏数字输入框的上下箭头 */
.page-input::-webkit-outer-spin-button,
.page-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 滚动条样式 */
.records-grid::-webkit-scrollbar { height: 6px; }
.records-grid::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 3px; }
.records-grid::-webkit-scrollbar-thumb { background: var(--theme-accent); border-radius: 3px; }
.records-grid::-webkit-scrollbar-thumb:hover { background: var(--theme-accent-dark); }

/* 
  ========================================
  右键菜单
  ========================================
  - position: fixed 固定定位，相对于视口
  - z-index: 9999 确保在最上层
  - box-shadow: 阴影效果
*/
.context-menu {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid var(--theme-border-color);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  min-width: 120px;
  overflow: hidden;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-sm);
  padding: var(--theme-spacing-sm) var(--theme-spacing-md);
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--theme-font-family);
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-primary);
}

.context-menu-item:hover {
  background: rgba(235, 86, 74, 0.1);
}

.context-menu-item.delete:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
}

.menu-icon {
  font-size: 16px;
}

.menu-text {
  flex: 1;
}
</style>
