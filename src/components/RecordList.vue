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
          class="record-column"
          :class="{ 
            'deleted': record.isDeleted, 
            'highlighted': record.id === highlightedRecordId,
            'new-record': record.id && newRecordIds.has(record.id),
            'compact': displayStyle === 'compact'
          }"
          @contextmenu.prevent="showContextMenu($event, record)"
        >
        <!-- ==================== 完整大字型模板 ==================== -->
        <template v-if="displayStyle !== 'compact'">
          <!-- 姓名标签 -->
          <div class="cell label-cell">
            <span class="label-text">姓名</span>
          </div>

          <!-- 姓名展示框（竖排文字） -->
          <div class="cell name-cell">
            <div class="name-text" :style="{ fontSize: getAdaptiveFontSize(record.guestName, true) + 'px' }">
              <span
                v-for="(char, index) in record.guestName.split('')"
                :key="index"
                class="name-char"
                :style="getCharStyle(record.guestName.length, index)"
              >
                {{ char }}
              </span>
            </div>
          </div>

          <!-- 礼金标签 -->
          <div class="cell label-cell">
            <span class="label-text">礼金</span>
          </div>

          <!-- 礼金展示框（仅大写金额，竖排） -->
          <div class="cell amount-cell">
            <span class="amount-chinese" :style="{ fontSize: getAdaptiveFontSize(numberToChinese(record.amount), false) + 'px' }">
              {{ numberToChinese(record.amount) }}
            </span>
          </div>

          <!-- 小写金额 + 支付方式小字标签 -->
          <div class="cell payment-cell">
            <span class="amount-number">¥{{ formatAmount(record.amount) }}</span>
            <span class="payment-short-label">{{ getPaymentShortLabel(record.paymentType) }}</span>
          </div>

          <!-- 礼品标签 -->
          <div class="cell label-cell">
            <span class="label-text">礼品</span>
          </div>

          <!-- 礼品展示框（竖排文字） -->
          <div class="cell gift-cell">
            <div v-if="record.itemDescription" class="vertical-text" :style="{ fontSize: getAdaptiveFontSize(record.itemDescription, false) + 'px' }">
              <span
                v-for="(char, index) in record.itemDescription.split('')"
                :key="'g'+index"
                class="vertical-char"
                :style="getCharStyle(record.itemDescription.length, index)"
              >
                {{ char }}
              </span>
            </div>
            <span v-else class="empty-placeholder">&nbsp;</span>
          </div>

          <!-- 地址标签 -->
          <div class="cell label-cell">
            <span class="label-text">地址</span>
          </div>

          <!-- 地址展示框（竖排文字） -->
          <div class="cell address-cell">
            <div v-if="record.remark" class="vertical-text" :style="{ fontSize: getAdaptiveFontSize(record.remark, false) + 'px' }">
              <span
                v-for="(char, index) in record.remark.split('')"
                :key="'a'+index"
                class="vertical-char"
                :style="getCharStyle(record.remark.length, index)"
              >
                {{ char }}
              </span>
            </div>
            <span v-else class="empty-placeholder">&nbsp;</span>
          </div>
        </template>

        <!-- ==================== 简洁紧凑型模板 ==================== -->
        <template v-else>
          <!-- 姓名标签 -->
          <div class="cell label-cell">
            <span class="label-text">姓名</span>
          </div>

          <!-- 姓名展示框（竖排大字，两端对齐） -->
          <div class="cell name-cell">
            <div class="name-text" :style="{ fontSize: getAdaptiveFontSize(record.guestName, true) + 'px' }">
              <span
                v-for="(char, index) in record.guestName.split('')"
                :key="index"
                class="name-char"
                :style="getCharStyle(record.guestName.length, index)"
              >
                {{ char }}
              </span>
            </div>
          </div>

          <!-- 备注展示框（水平显示，在姓名右侧） -->
          <div class="cell remark-cell">
            <span v-if="record.remark" class="remark-text">
              {{ record.remark }}
            </span>
            <span v-else class="empty-placeholder">&nbsp;</span>
          </div>

          <!-- 礼金标签 -->
          <div class="cell label-cell">
            <span class="label-text">礼金</span>
          </div>

          <!-- 礼金展示框（横向布局：大写+物品竖排） -->
          <div class="cell amount-cell compact-amount-cell">
            <div class="amount-vertical-row">
              <!-- 大写金额竖排 -->
              <div class="amount-chinese-vertical">
                <span 
                  class="amount-chinese-char"
                  :style="{ fontSize: getAdaptiveFontSize(numberToChinese(record.amount), false) + 'px' }"
                >
                  {{ numberToChinese(record.amount) }}
                </span>
              </div>
              <!-- 物品竖排（在金额右侧） -->
              <div v-if="record.itemDescription" class="item-vertical">
                <span
                  v-for="(char, index) in record.itemDescription.split('')"
                  :key="index"
                  class="item-char"
                >
                  {{ char }}
                </span>
              </div>
            </div>
          </div>

          <!-- 支付方式单元格 -->
          <div class="cell payment-cell">
            <span class="payment-label-text">{{ getPaymentShortLabel(record.paymentType) }}</span>
            <span class="amount-number">¥{{ formatAmount(record.amount) }}</span>
          </div>
        </template>
        
        </div>
        
        <!-- 
          空白列填充
          用于保持每页固定显示15格，不足时显示空白占位
          使用 v-show 控制显示，避免 DOM 频繁创建销毁导致闪烁
          根据 displayStyle 显示不同的空白列结构
        -->
        <template v-for="n in pageSize" :key="'empty-' + n">
          <!-- 完整大字型空白列 -->
          <div
            v-if="displayStyle !== 'compact'"
            v-show="n <= emptyColumns"
            class="record-column empty-column"
          >
            <div class="cell label-cell"><span class="label-text">姓名</span></div>
            <div class="cell name-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell label-cell"><span class="label-text">礼金</span></div>
            <div class="cell amount-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell payment-cell">
              <span class="amount-number"></span>
              <span class="payment-short-label"></span>
            </div>
            <div class="cell label-cell"><span class="label-text">礼品</span></div>
            <div class="cell gift-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell label-cell"><span class="label-text">地址</span></div>
            <div class="cell address-cell"><span class="empty-placeholder">&nbsp;</span></div>
          </div>
          <!-- 简洁紧凑型空白列 -->
          <div
            v-else
            v-show="n <= emptyColumns"
            class="record-column empty-column compact"
          >
            <div class="cell label-cell"><span class="label-text">姓名</span></div>
            <div class="cell name-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell remark-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell label-cell"><span class="label-text">礼金</span></div>
            <div class="cell amount-cell"><span class="empty-placeholder">&nbsp;</span></div>
            <div class="cell payment-cell">
              <span class="amount-number"></span>
            </div>
          </div>
        </template>
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
        <div class="context-menu-item" @click.stop="handleEditClick">
          <IconSvg name="edit" :size="14" />
          <span class="menu-text">编辑</span>
        </div>
        <div class="context-menu-item delete" @click.stop="handleDeleteClick">
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
import '../types/database';
import type { Record } from '../types/database';
import { numberToChinese, formatAmount } from '../utils/amountConverter';
import { getPaymentTypeText } from '../constants';

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
  displayStyle?: 'full' | 'compact';
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
const handleDeleteClick = async () => {
  console.log('handleDeleteClick 被调用');
  
  if (!contextMenu.value.record) {
    console.log('没有选中记录，隐藏菜单');
    hideContextMenu();
    return;
  }
  
  const record = contextMenu.value.record;
  console.log('选中记录:', record);
  
  hideContextMenu();
  console.log('菜单已隐藏');
  
  const confirmed = await window.confirmDialog(`确定要删除 ${record.guestName} 的记录吗？`);
  console.log('用户确认结果:', confirmed);
  
  if (confirmed) {
    console.log('用户确认删除，emit delete 事件');
    emit('delete', record.id || 0);
  } else {
    console.log('用户取消删除');
  }
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

// 支付方式全称标签（用于小字标记）
const getPaymentShortLabel = (type: number): string => {
  return getPaymentTypeText(type);
};

// 根据文字长度计算自适应字号（最大28，最小20）
const getAdaptiveFontSize = (text: string, isName: boolean = false): number => {
  const maxSize = isName ? 28 : 28;   /* 姓名和金额最大28px */
  const minSize = 20;
  const maxLength = isName ? 3 : 4;  /* 姓名3字内最大，金额4字内最大 */

  if (!text || text.length <= maxLength) {
    return maxSize;
  }

  const reduceSize = (text.length - maxLength) * 6;  /* 每超1字减6px */
  return Math.max(minSize, maxSize - reduceSize);
};

// 计算每个字符的位置样式，实现两端对齐
const getCharStyle = (length: number, index: number) => {
  // 所有字符都水平居中
  const baseStyle = { position: 'absolute' as const, left: '50%', transform: 'translateX(-50%)' };

  if (length === 1) {
    // 单字姓名垂直居中
    return { ...baseStyle, top: '50%', transform: 'translate(-50%, -50%)' };
  }

  // 计算每个字符的位置，实现两端对齐
  // 第一个字符在顶部(5%)，最后一个字符在底部(75%)，留出边距
  const startOffset = 5;  // 顶部边距 5%
  const endOffset = 75;   // 底部边距 75%
  const availableSpace = endOffset - startOffset;
  const step = availableSpace / (length - 1);
  const top = startOffset + step * index;
  return { ...baseStyle, top: `${top}%` };
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
  礼金簿展示 - 日式极简风格
  ========================================
  数据列表布局保持不变
*/

/* 通用样式 */
/* ======================================== */

/* 礼金簿容器 */
.giftbook-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  overflow: hidden;
  border: 1px solid var(--theme-border);
  position: relative;
}

/* 礼金簿内容区 */
.giftbook-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  padding: var(--theme-spacing-lg);
  width: 100%;
  max-width: 1290px;
}

/* 宣纸背景 - 降低透明度，更加淡雅 */
.paper-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/images/洒金宣纸肌理.png');
  background-size: cover;
  background-position: center;
  opacity: 0.20;
  pointer-events: none;
}

/* 礼金表格网格 */
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

/* 单列基础样式 - 新配色方案 */
.record-column {
  width: var(--grid-column-width);
  min-width: var(--grid-column-width);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(139, 41, 66, 0.15);
  border-right: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  padding: var(--theme-spacing-sm);
  box-shadow: none;
  transition: all 0.3s ease;
}

/* 最后一列补上右边框 */
.record-column:last-child {
  border-right: 1px solid rgba(139, 41, 66, 0.12);
}

/* 悬停效果 */
.record-column:hover {
  box-shadow: none;
  transform: none;
  background: rgba(255, 255, 255, 0.90);
}

/* 已删除记录样式 */
.record-column.deleted {
  opacity: 0.5;
  background: rgba(230, 230, 230, 0.7);
  border-color: rgba(90, 90, 90, 0.10);
}

/* 高亮动画 - 朱砂红 */
@keyframes highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(199, 62, 58, 0.6);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(199, 62, 58, 0);
  }
}

.record-column.highlighted {
  animation: highlight-pulse 1s ease-in-out 1;
  border: 2px solid var(--theme-accent);
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
}

/* 新记录入场动画 */
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

/* GPU 加速 */
.record-column {
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* 空白列样式 */
.empty-column {
  opacity: 0.35;
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(139, 41, 66, 0.06);
}

.empty-column:last-child {
  border-right: 1px solid rgba(139, 41, 66, 0.06);
}

/* 单元格通用样式 */
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-xs) 0;
  border-bottom: 1px dotted rgba(139, 41, 66, 0.10);
}

.cell:last-child {
  border-bottom: none;
}

/* 标签单元格 */
.label-cell {
  padding: var(--theme-spacing-xs) 0;
}

.label-text {
  font-size: var(--theme-font-size-xs);
  color: var(--theme-primary);
  font-weight: bold;
  writing-mode: horizontal-tb;
  font-family: var(--font-family-fixed);
  letter-spacing: 1px;
}

/* 姓名文字样式 */
.name-text {
  color: var(--theme-text-primary);
  font-family: var(--font-name-amount);
  height: 100%;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.name-char {
  display: block;
  writing-mode: vertical-rl;
  text-orientation: upright;
}

/* 竖排文字通用容器 */
.vertical-text {
  color: var(--theme-text-primary);
  font-family: var(--font-name-amount);
  height: 100%;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.vertical-char {
  display: block;
  writing-mode: vertical-rl;
  text-orientation: upright;
}

/* 空白占位符 */
.empty-placeholder {
  color: transparent;
}

/* 支付方式单元格基础样式 */
.payment-cell {
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  padding: var(--theme-spacing-xs) 0;
}

.amount-number {
  font-size: var(--theme-font-size-xs);
  color: var(--theme-text-secondary);
}

/* 操作按钮单元格 */
.actions-cell {
  flex: 0 0 auto;
  flex-direction: row;
  justify-content: center;
  gap: var(--theme-spacing-xs);
  padding-top: var(--theme-spacing-sm);
  border-top: 1px dashed rgba(139, 41, 66, 0.15);
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
  background: rgba(199, 62, 58, 0.08);
  transform: scale(1.1);
}

/* 分页控制栏 */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background: rgba(var(--theme-primary-rgb), 0.02);
  border-top: 1px solid var(--theme-border);
  position: relative;
}

.pagination-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--theme-accent), transparent);
  opacity: 0.4;
}

.page-btn {
  padding: 8px 18px;
  border: none;
  border-radius: var(--theme-border-radius-sm);
  background: var(--theme-accent);
  color: white;
  font-size: var(--theme-font-size-sm);
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 500;
  font-family: inherit;
  box-shadow: 0 2px 6px rgba(var(--theme-primary-rgb), 0.2);
}

.page-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--theme-primary-rgb), 0.3);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--theme-border);
  color: var(--theme-text-muted);
  box-shadow: none;
}

.page-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.page-number {
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  color: var(--theme-text-primary);
}

.record-count {
  font-size: 12px;
  color: var(--theme-text-muted);
}

/* 页码输入框样式 */
.page-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.page-input {
  width: 50px;
  padding: 6px 10px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  text-align: center;
  font-size: 14px;
  background: white;
  color: var(--theme-text-primary);
  font-family: inherit;
  transition: all 0.25s ease;
}

.page-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), 0.08);
}

/* 隐藏数字输入框的上下箭头 */
.page-input::-webkit-outer-spin-button,
.page-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 滚动条样式 */
.records-grid::-webkit-scrollbar {
  height: 6px;
}

.records-grid::-webkit-scrollbar-track {
  background: rgba(var(--theme-primary-rgb), 0.04);
  border-radius: 3px;
}

.records-grid::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 3px;
  opacity: 0.7;
}

.records-grid::-webkit-scrollbar-thumb:hover {
  background: var(--theme-accent-dark);
  opacity: 1;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--theme-paper);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  box-shadow: var(--theme-shadow-lg);
  min-width: 120px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-sm);
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-primary);
}

.context-menu-item:hover {
  background: rgba(var(--theme-primary-rgb), 0.06);
  color: var(--theme-accent);
}

.context-menu-item.delete:hover {
  background: rgba(239, 68, 68, 0.06);
  color: #ef4444;
}

.menu-icon {
  font-size: 16px;
}

.menu-text {
  flex: 1;
}

/* 空白列透明背景 */
.empty-column .cell {
  background: transparent;
}

/* 支付方式圆点 */
.payment-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.payment-dot.cash { background: #10B981; }
.payment-dot.wechat { background: #07C160; }
.payment-dot.internal { background: #6366F1; }
.payment-dot.transfer { background: #8B5CF6; }


/* 完整型布局样式 */
/* ======================================== */
/* 布局类型: 完整型
   主要设计特点: 包含姓名、礼金、礼品、地址四个主要字段，垂直排列
   关键尺寸参数: 记录列高度770px，姓名单元格180px，礼金单元格160px，礼品和地址单元格各120px
   与其他布局的区别: 展示更多信息，布局更宽松，适合详细查看记录 */

/* 完整型布局记录列高度 */
.record-column {
  height: 770px;
  min-height: 770px;
}

/* 完整型姓名单元格 */
.record-column:not(.compact) .name-cell {
  flex: 0 0 auto;
  height: 180px;
  min-height: 160px;
  justify-content: space-between;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 完整型礼品单元格 */
.record-column:not(.compact) .gift-cell {
  flex: 0 0 auto;
  height: 120px;
  min-height: 100px;
  justify-content: space-between;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 完整型地址单元格 */
.record-column:not(.compact) .address-cell {
  flex: 0 0 auto;
  height: 120px;
  min-height: 100px;
  justify-content: flex-start;
  padding-top: var(--theme-spacing-xs);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 完整型礼金单元格 */
.record-column:not(.compact) .amount-cell {
  flex: 0 0 auto;
  height: 160px;
  min-height: 140px;
  justify-content: center;
}

/* 完整型礼金金额样式 */
.record-column:not(.compact) .amount-chinese {
  color: var(--theme-accent);
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 3px;
  line-height: 1.6;
  transition: font-size 0.2s ease;
  font-family: var(--font-name-amount);
}

/* 完整型支付方式短标签 */
.record-column:not(.compact) .payment-short-label {
  font-size: 10px;
  color: var(--theme-text-secondary);
  opacity: 0.6;
  font-family: var(--font-family-fixed);
}


/* 紧凑型布局样式 */
/* ======================================== */
/* 布局类型: 紧凑型
   主要设计特点: 紧凑布局，包含姓名、备注、礼金、支付方式四个字段，优化空间利用
   关键尺寸参数: 记录列高度650px，姓名单元格250px，礼金单元格250px，备注单元格35px
   与其他布局的区别: 布局更紧凑，信息密度更高，适合在有限空间内显示更多记录 */

/* 紧凑型布局记录列高度调整 */
.record-column.compact {
  height: 650px;
  min-height: 650px;
}

/* 紧凑型姓名单元格 - 高度250px */
.record-column.compact .name-cell {
  height: 250px;
  min-height: 230px;
  justify-content: space-between;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 紧凑型礼金单元格 - 高度250px */
.record-column.compact .amount-cell {
  height: 250px;
  min-height: 230px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--theme-spacing-xs) 0;
}

/* 礼金横向行容器（大写+物品并排） */
.record-column.compact .amount-vertical-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
}

/* 紧凑型大写金额竖排容器 */
.record-column.compact .amount-chinese-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: upright;
  height: 100%;
  font-family: var(--font-name-amount);
  color: var(--theme-accent);
}

/* 紧凑型大写金额字符 */
.record-column.compact .amount-chinese-char {
  font-family: var(--font-name-amount);
  color: var(--theme-accent);
}

/* 紧凑型物品竖排容器 */
.record-column.compact .item-vertical {
  display: block;
  writing-mode: vertical-rl;
  text-orientation: upright;
  height: 100%;
  font-family: var(--font-name-amount);
  color: var(--theme-text-secondary);
  font-size: 12px;
  letter-spacing: 1px;
  text-align: center;
}

/* 紧凑型物品字符 */
.record-column.compact .item-char {
  font-family: var(--font-name-amount);
  color: var(--theme-text-secondary);
  font-size: 12px;
  display: inline-block;
  margin: 0 2px;
}

/* 紧凑型备注单元格 */
.record-column.compact .remark-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--theme-spacing-xs) 0;
  border-bottom: 1px dotted rgba(139, 41, 66, 0.10);
  height: 35px;
  min-height: 35px;
}

/* 紧凑型备注文字（水平显示） */
.record-column.compact .remark-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
  font-family: var(--font-name-amount);
  text-align: center;
  word-break: break-all;
  max-height: 100px;
  overflow: hidden;
}

/* 紧凑型支付方式文字标签 */
.record-column.compact .payment-label-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
  font-family: var(--font-name-amount);
  margin-bottom: 4px;
}

/* 紧凑型支付单元格中的金额 */
.record-column.compact .payment-cell .amount-number {
  font-size: 12px;
  color: var(--theme-text-secondary);
  font-family: var(--font-family-fixed);
}
</style>
