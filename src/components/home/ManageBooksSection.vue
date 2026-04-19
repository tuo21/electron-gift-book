<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ThemeType } from '../../types/theme';
import { getThemeById, normalizeTheme } from '../../types/theme';
import '../../types/database';

// ==================== 类型定义 ====================
interface Book {
  name: string;
  path: string;
  createdAt: string;
  lastModified: string;
  lastOpened: string;
  theme?: string;
  eventName?: string;
  eventDate?: string;
}

// ==================== Props & Emits ====================
const props = defineProps<{
  books: Book[];
}>();

const emit = defineEmits<{
  (e: 'open', path: string): void;
  (e: 'delete', path: string): void;
  (e: 'edit', data: { path: string; name: string; eventDate: string; theme: ThemeType }): void;
  (e: 'import'): void;
  (e: 'open-file'): void;
}>();

// ==================== 响应式状态 ====================
const showManageMenu = ref(false);

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  book: null as Book | null
});

// ==================== 工具函数 ====================

// 获取礼簿列表项的CSS类
const getBookItemClass = (theme?: string): string => {
  const normalized = normalizeTheme(theme || 'red');
  switch (normalized) {
    case 'red': return 'book-item-red';
    case 'gray': return 'book-item-gray';
    case 'golden': return 'book-item-golden';
    default: return 'book-item-red';
  }
};

// 获取主题标签的CSS类
const getThemeTagClass = (theme: string): string => {
  const normalized = normalizeTheme(theme);
  switch (normalized) {
    case 'red': return 'theme-tag-red';
    case 'gray': return 'theme-tag-gray';
    case 'golden': return 'theme-tag-golden';
    default: return 'theme-tag-red';
  }
};

// 获取主题的显示名称
const getThemeDisplayName = (theme: string): string => {
  const normalized = normalizeTheme(theme);
  const meta = getThemeById(normalized);
  return meta ? meta.displayName : '未知主题';
};

// 格式化事务日期（显示为 YYYY-MM-DD 格式）
const formatEventDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr;
};

// 格式化显示日期
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '未知日期';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return dateStr;
  }
};

// ==================== 计算属性 ====================
const hasBooks = computed(() => props.books.length > 0);

const formattedBooks = computed(() => {
  console.log('Props books:', props.books);
  return props.books.map(book => {
    console.log('Processing book:', book);
    console.log('book.createdAt:', book.createdAt, 'book.lastModified:', book.lastModified);
    const result = {
      ...book,
      createdDate: formatDisplayDate(book.createdAt),
      lastModifiedDate: formatDisplayDate(book.lastModified),
      displayName: book.eventDate ? `${book.name}（${formatEventDate(book.eventDate)}）` : book.name
    };
    console.log('Processed book:', result);
    return result;
  });
});

// 格式化日期（保留待未来使用）
// const formatDate = (dateStr: string): string => {
//   try {
//     if (!dateStr || dateStr.trim() === '') {
//       return '未知日期';
//     }
//     
//     console.log('原始日期字符串:', dateStr);
//     
//     // 尝试解析不同格式的日期字符串
//     let date: Date;
//     
//     // 尝试直接解析 RFC3339 或 ISO 格式
//     date = new Date(dateStr);
//     
//     console.log('解析后的 Date 对象:', date, 'isNaN:', isNaN(date.getTime()));
//     
//     // 检查是否是有效日期
//     if (isNaN(date.getTime())) {
//       // 尝试其他格式 - 替换 T 和 Z
//       const cleanedDateStr = dateStr
//         .replace('T', ' ')
//         .replace('Z', '')
//         .replace(/\.[\d]+$/, ''); // 移除毫秒
//       console.log('清理后的日期字符串:', cleanedDateStr);
//       date = new Date(cleanedDateStr);
//     }
//     
//     // 再次检查
//     if (isNaN(date.getTime())) {
//       console.log('无法解析日期，返回原始字符串');
//       return dateStr;
//     }
//     
//     const formatted = date.toLocaleDateString('zh-CN', {
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//     console.log('格式化后的日期:', formatted);
//     return formatted;
//   } catch (error) {
//     console.error('日期格式化错误:', error);
//     return dateStr;
//   }
// };

// 处理打开
const handleOpen = (path: string) => {
  emit('open', path);
};

// 处理删除（保留但不再从按钮调用）
const handleDelete = async (book: Book, event: Event) => {
  event.stopPropagation();
  
  const confirmed = await window.confirmDialog(`确定要删除"${book.name}"吗？此操作不可恢复。`);
  if (confirmed) {
    emit('delete', book.path);
  }
};

// 处理导入
const handleImport = () => {
  emit('import');
};

// 处理打开文件
const handleOpenFile = () => {
  emit('open-file');
};

// 处理双击打开礼簿
const handleDoubleClick = (book: Book) => {
  emit('open', book.path);
};

// 处理右键菜单
const handleContextMenu = (book: Book, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    book
  };
};

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.book = null;
};

// 从右键菜单执行删除
const handleDeleteFromMenu = async () => {
  const book = contextMenu.value.book;
  if (!book) return;
  
  closeContextMenu();
  
  const confirmed = await window.confirmDialog(`确定要删除"${book.name}"吗？此操作不可恢复。`);
  if (confirmed) {
    emit('delete', book.path);
  }
};

// 从右键菜单执行编辑
const handleEditFromMenu = () => {
  const book = contextMenu.value.book;
  if (!book) return;
  
  closeContextMenu();
  
  const themeType: ThemeType = normalizeTheme(book.theme || 'red');
  
  emit('edit', {
    path: book.path,
    name: book.name,
    eventDate: book.eventDate || new Date().toISOString().split('T')[0],
    theme: themeType
  });
};

// ==================== 生命周期 ====================
const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.value.visible) {
    closeContextMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="manage-section" @click="closeContextMenu">
    <div class="section-header">
      <div class="header-left">
        <h2 class="section-title">礼薄管理</h2>
        <span class="book-count" v-if="hasBooks">({{ books.length }})</span>
      </div>
    </div>

    <!-- 礼薄列表 -->
    <div class="books-card">
      <div v-if="hasBooks" class="books-list">
        <div
          v-for="book in formattedBooks"
          :key="book.path"
          class="book-item"
          :class="getBookItemClass(book.theme)"
          @dblclick="handleDoubleClick(book)"
          @contextmenu="handleContextMenu(book, $event)"
        >
          <div class="book-info">
            <span class="book-icon">📄</span>
            <div class="book-details">
              <span class="book-name">{{ book.displayName }}</span>
              <div class="book-dates">
                <span class="date-item">创建时间：{{ book.createdDate }}</span>
                <span class="date-separator"></span>
                <span class="date-item">最后修改时间：{{ book.lastModifiedDate }}</span>
              </div>
            </div>
          </div>
          <div class="book-actions">
            <button class="action-btn open" @click="handleOpen(book.path)">
              打开
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📂</div>
        <p class="empty-text">暂无礼薄</p>
        <p class="empty-hint">创建一个新礼薄或导入已有数据</p>
      </div>

      <!-- 底部操作 -->
      <div class="bottom-actions">
        <button class="bottom-btn" @click="handleImport">
          <span class="btn-icon">+</span>
          导入礼薄
        </button>
        <button class="bottom-btn" @click="handleOpenFile">
          <span class="btn-icon">📁</span>
          打开文件
        </button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <Transition name="context-menu">
        <div 
          v-if="contextMenu.visible" 
          class="context-menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        >
          <div class="context-menu-item" @click="handleEditFromMenu">
            <span class="menu-icon">✏️</span>
            <span>编辑</span>
          </div>
          <div class="context-menu-item danger" @click="handleDeleteFromMenu">
            <span class="menu-icon">🗑️</span>
            <span>删除</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.manage-section {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.book-count {
  font-size: 14px;
  color: #999;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manage-btn:hover {
  background: #e8e8e8;
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.arrow-icon.open {
  transform: rotate(180deg);
}

/* 礼薄卡片 */
.books-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  min-height: 0;
}

/* 礼薄列表 */
.books-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.book-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
  cursor: pointer;
  user-select: none;
  margin-bottom: 5px;
}

.book-item:last-child {
  margin-bottom: 0;
}

.book-item:hover {
  background: #f8f8f8;
}

/* 主题色标记 */
.book-item-red {
  background: rgba(199, 91, 57, 0.06);
}

.book-item-gray {
  background: #ffffff;
}

.book-item-golden {
  background: rgba(184, 134, 11, 0.06);
}

.book-item-red:hover {
  background: rgba(199, 91, 57, 0.12);
}

.book-item-gray:hover {
  background: #f0f0f0;
}

.book-item-golden:hover {
  background: rgba(184, 134, 11, 0.12);
}

.book-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.book-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.book-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.book-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主题标签 */
.book-theme-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  flex-shrink: 0;
}

.theme-tag-red {
  background: rgba(199, 91, 57, 0.1);
  color: #c75b39;
}

.theme-tag-gray {
  background: rgba(74, 74, 74, 0.1);
  color: #4a4a4a;
}

.theme-tag-golden {
  background: rgba(184, 134, 11, 0.1);
  color: #b8860b;
}

.book-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.book-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.book-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-dates {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.date-item {
  white-space: nowrap;
}

.date-separator {
  width: 1px;
  height: 12px;
  background-color: #e0e0e0;
}

.book-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.open {
  color: #c75b39;
  background: rgba(199, 91, 57, 0.1);
}

.action-btn.open:hover {
  background: rgba(199, 91, 57, 0.2);
}

.action-btn.edit {
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
}

.action-btn.edit:hover {
  background: rgba(24, 144, 255, 0.2);
}

.action-btn.delete {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.action-btn.delete:hover {
  background: rgba(255, 77, 79, 0.2);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 2000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 6px;
  min-width: 140px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
  color: #333;
}

.context-menu-item:hover {
  background: #f5f5f5;
}

.context-menu-item .menu-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.context-menu-item.danger {
  color: #ff4d4f;
}

.context-menu-item.danger:hover {
  background: rgba(255, 77, 79, 0.08);
}

/* 右键菜单动画 */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #666;
  margin: 0 0 4px 0;
}

.empty-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

/* 底部操作 */
.bottom-actions {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.bottom-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 14px;
  color: #666;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bottom-btn:hover {
  border-color: #c75b39;
  color: #c75b39;
  background: rgba(199, 91, 57, 0.02);
}

.btn-icon {
  font-size: 16px;
}

/* 滚动条 */
.books-list::-webkit-scrollbar {
  width: 4px;
}

.books-list::-webkit-scrollbar-track {
  background: transparent;
}

.books-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.books-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>