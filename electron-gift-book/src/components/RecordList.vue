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
        -->
        <div
          v-for="(record, index) in paginatedRecords"
          :key="record.id || index"
          class="record-column"
          :class="{ 'deleted': record.isDeleted }"
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
        -->
        <div 
          v-for="n in emptyColumns" 
          :key="'empty-' + n" 
          class="record-column empty-column"
        >
          <div class="cell label-cell"><span class="label-text">姓名</span></div>
          <div class="cell name-cell"><span class="name-text">-</span></div>
          <div class="cell remark-cell"><span class="remark-text"> </span></div>
          <div class="cell label-cell"><span class="label-text">礼金</span></div>
          <div class="cell amount-cell"><span class="amount-chinese">-</span></div>
          <div class="cell payment-cell">
            <div class="payment-placeholder"></div>
            <span class="amount-number">-</span>
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
        @click="currentPage--"
      >
        ← 上一页
      </button>
      
      <div class="page-info">
        <span class="page-number">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <span class="record-count">共 {{ records.length }} 条记录</span>
      </div>
      
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
      >
        下一页 →
      </button>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="handleEditClick">
        <span class="menu-icon">✏️</span>
        <span class="menu-text">编辑</span>
      </div>
      <div class="context-menu-item delete" @click="handleDeleteClick">
        <span class="menu-icon">🗑️</span>
        <span class="menu-text">删除</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Record } from '../types/database';
import { numberToChinese, formatAmount } from '../utils/amountConverter';
import { PaymentType, getPaymentTypeText } from '../constants';

// ==================== Props & Emits ====================
const props = defineProps<{
  records: Record[];
  pageSize?: number;  // 每页显示条数，默认15
}>();

const emit = defineEmits<{
  (e: 'edit', record: Record): void;
  (e: 'delete', id: number): void;
}>();

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
const currentPage = ref(1);
const pageSize = computed(() => props.pageSize || 15);

// 总页数
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.records.length / pageSize.value));
});

// 当前页数据（切片）- 使用缓存避免重复计算
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  // 返回切片后的数据（不反转，保持原始顺序）
  return props.records.slice(start, end);
});

// 空白列数量（用于填充到固定格数）
const emptyColumns = computed(() => {
  const currentCount = paginatedRecords.value.length;
  return Math.max(0, pageSize.value - currentCount);
});

// 监听记录变化，重置到第一页
watch(() => props.records.length, () => {
  currentPage.value = 1;
});

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
  padding: var(--theme-spacing-lg);  /* 24px */
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
  opacity: 0.85;
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
  gap: var(--grid-column-gap);       /* 16px，在theme.css中定义 */
  overflow-x: auto;
  overflow-y: hidden;
  padding: var(--theme-spacing-md);  /* 16px */
}

/* 
  ========================================
  单列样式
  ========================================
  - width: 列宽（CSS变量控制，默认72px）
  - background: 半透明白色背景
  - border: 边框
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
  border: 1px solid var(--theme-border-color);
  border-radius: var(--theme-border-radius);  /* 8px */
  display: flex;
  flex-direction: column;
  padding: var(--theme-spacing-sm);   /* 8px */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* 悬停效果：上浮+阴影增强 */
.record-column:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

/* 已删除记录样式 */
.record-column.deleted {
  opacity: 0.5;
  background: rgba(200, 200, 200, 0.8);
}

/* 空白列样式 */
.empty-column {
  opacity: 0.4;
  background: rgba(255, 255, 255, 0.5);
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
  border-bottom: 1px dashed rgba(235, 86, 74, 0.2);  /* 虚线分隔 */
}

.cell:last-child { border-bottom: none; }

/* 标签单元格 */
.label-cell { padding: var(--theme-spacing-xs) 0; }

.label-text {
  font-size: var(--theme-font-size-xs);  /* 12px */
  color: var(--theme-primary);
  font-weight: bold;
  writing-mode: horizontal-tb;  /* 水平文字 */
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
  font-weight: bold;
  color: var(--theme-text-primary);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 4px;
  transition: font-size 0.2s ease;
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
  font-weight: bold;
  color: var(--theme-text-primary);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 2px;
  line-height: 1.6;
  transition: font-size 0.2s ease;
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
