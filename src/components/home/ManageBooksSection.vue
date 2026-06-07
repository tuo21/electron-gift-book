<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ThemeType } from '../../types/theme';
import { normalizeTheme, getThemeById } from '../../types/theme';
import '../../types/database';
import { useActivation } from '../../composables/useActivation';
import IconSvg from '../IconSvg.vue';

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
  (e: 'show-activate'): void;
  (e: 'export-book', data: { path: string; name: string; eventDate?: string }): void;
}>();

const { checkActivation } = useActivation();

// ==================== 响应式状态 ====================
const searchKeyword = ref('');
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  book: null as Book | null
});

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

// ==================== 计算属性 ====================
const filteredBooks = computed(() => {
  if (!searchKeyword.value.trim()) return props.books;
  const keyword = searchKeyword.value.toLowerCase();
  return props.books.filter(book => 
    book.name.toLowerCase().includes(keyword) ||
    (book.eventName && book.eventName.toLowerCase().includes(keyword))
  );
});

const totalPages = computed(() => Math.ceil(filteredBooks.value.length / pageSize.value));

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredBooks.value.slice(start, end);
});

const hasBooks = computed(() => props.books.length > 0);

// ==================== 工具函数 ====================
const getThemeTagClass = (theme?: string): string => {
  const normalized = normalizeTheme(theme || 'red');
  return `theme-tag-${normalized}`;
};

const getThemeDisplayName = (theme?: string): string => {
  const normalized = normalizeTheme(theme || 'red');
  const themeMeta = getThemeById(normalized);
  return themeMeta?.displayName || '喜庆红';
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return dateStr;
  }
};

// ==================== 方法函数 ====================
const handleSearch = () => {
  currentPage.value = 1;
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
};

const handleImport = async () => {
  const isActivated = await checkActivation();
  if (!isActivated) {
    emit('show-activate');
    return;
  }
  emit('import');
};

const handleOpenFile = async () => {
  const isActivated = await checkActivation();
  if (!isActivated) {
    emit('show-activate');
    return;
  }
  emit('open-file');
};



const handleDoubleClick = async (book: Book) => {
  const isActivated = await checkActivation();
  if (!isActivated) {
    emit('show-activate');
    return;
  }
  emit('open', book.path);
};

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

const closeContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.book = null;
};

const handleDeleteFromMenu = async () => {
  const book = contextMenu.value.book;
  if (!book) return;
  
  const isActivated = await checkActivation();
  if (!isActivated) {
    closeContextMenu();
    emit('show-activate');
    return;
  }
  
  closeContextMenu();
  
  const confirmed = await window.confirmDialog(`确定要删除"${book.name}"吗？此操作不可恢复。`);
  if (confirmed) {
    emit('delete', book.path);
  }
};

const handleEditFromMenu = async () => {
  const book = contextMenu.value.book;
  if (!book) return;
  
  const isActivated = await checkActivation();
  if (!isActivated) {
    closeContextMenu();
    emit('show-activate');
    return;
  }
  
  closeContextMenu();
  
  const themeType: ThemeType = normalizeTheme(book.theme || 'red');
  
  emit('edit', {
    path: book.path,
    name: book.name,
    eventDate: book.eventDate || new Date().toISOString().split('T')[0],
    theme: themeType
  });
};

const handleExportFromMenu = async () => {
  const book = contextMenu.value.book;
  if (!book) return;
  
  const isActivated = await checkActivation();
  if (!isActivated) {
    closeContextMenu();
    emit('show-activate');
    return;
  }
  
  closeContextMenu();
  emit('export-book', { path: book.path, name: book.name, eventDate: book.eventDate });
};

// ==================== 生命周期 ====================
onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <div class="manage-section" @click="closeContextMenu">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <IconSvg name="list" :size="20" />
        <h2 class="section-title">礼薄管理</h2>
        <span class="book-count" v-if="hasBooks">共 {{ filteredBooks.length }} 条</span>
      </div>
      
      <div class="toolbar-right">
        <!-- 搜索框 -->
        <div class="search-box">
          <IconSvg name="search" :size="16" />
          <input 
            v-model="searchKeyword"
            type="text"
            placeholder="搜索礼薄名称..."
            @input="handleSearch"
          />
          <button v-if="searchKeyword" class="clear-btn" @click="searchKeyword = ''">
            <IconSvg name="close" :size="14" />
          </button>
        </div>
        
        <button class="toolbar-btn refresh" title="刷新">
          <IconSvg name="refresh" :size="16" />
        </button>
      </div>
    </div>

    <!-- 礼薄列表表格 -->
    <div class="table-container">
      <table v-if="hasBooks" class="books-table">
        <thead>
          <tr>
            <th class="col-name">礼薄名称</th>
            <th class="col-theme">主题</th>
            <th class="col-date">事务日期</th>
            <th class="col-date">创建日期</th>
            <th class="col-date">最后修改</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="book in paginatedBooks"
            :key="book.path"
            @dblclick="handleDoubleClick(book)"
            @contextmenu="handleContextMenu(book, $event)"
          >
            <td class="col-name">
              <div class="name-cell">
                <span class="book-icon">📕</span>
                <span class="book-name">{{ book.name }}</span>
              </div>
            </td>
            <td class="col-theme">
              <span class="theme-tag" :class="getThemeTagClass(book.theme)">
                {{ getThemeDisplayName(book.theme) }}
              </span>
            </td>
            <td class="col-date">{{ formatDate(book.eventDate) }}</td>
            <td class="col-date">{{ formatDate(book.createdAt) }}</td>
            <td class="col-date">{{ formatDate(book.lastModified) }}</td>
            <td class="col-action">
              <button class="action-btn more" @click.stop="handleContextMenu(book, $event)">
                <IconSvg name="more-vertical" :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <IconSvg name="folder-open" :size="64" />
        </div>
        <p class="empty-text">暂无礼薄</p>
        <p class="empty-hint">创建一个新礼薄或导入已有数据</p>
        <div class="empty-actions">
          <button class="empty-btn primary" @click="handleImport">
            <IconSvg name="import" :size="16" />
            导入礼薄
          </button>
          <button class="empty-btn" @click="handleOpenFile">
            <IconSvg name="folder" :size="16" />
            打开文件
          </button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="hasBooks && totalPages > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="handlePageChange(currentPage - 1)"
      >
        <IconSvg name="chevron-left" :size="14" />
      </button>
      
      <div class="page-numbers">
        <button
          v-for="page in totalPages"
          :key="page"
          class="page-number"
          :class="{ active: currentPage === page }"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
      </div>
      
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="handlePageChange(currentPage + 1)"
      >
        <IconSvg name="chevron-right" :size="14" />
      </button>
      
      <div class="page-size-selector">
        <select v-model="pageSize" @change="currentPage = 1">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
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
            <IconSvg name="edit" :size="16" />
            <span>编辑</span>
          </div>
          <div class="context-menu-item" @click="handleExportFromMenu">
            <IconSvg name="export" :size="16" />
            <span>导出</span>
          </div>
          <div class="context-menu-item danger" @click="handleDeleteFromMenu">
            <IconSvg name="delete" :size="16" />
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
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #C75B39;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.book-count {
  font-size: 13px;
  color: #999;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  min-width: 200px;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #333;
  outline: none;
}

.search-box input::placeholder {
  color: #999;
}

.clear-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: #666;
  padding: 0;
}

/* 工具栏按钮 */
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  border-color: #C75B39;
  color: #C75B39;
}

/* 表格容器 */
.table-container {
  flex: 1;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  position: relative;
}

/* 表格 */
.books-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
}

.books-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

.books-table th {
  background: #fafafa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
  position: sticky;
  top: 0;
}

.books-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

.books-table tbody tr {
  transition: background 0.2s ease;
  cursor: pointer;
}

.books-table tbody tr:hover {
  background: rgba(199, 91, 57, 0.02);
}

/* 列宽 */
.col-name {
  min-width: 180px;
}

.col-theme {
  width: 100px;
}

.col-date {
  width: 120px;
  white-space: nowrap;
}

.col-action {
  width: 80px;
  text-align: center;
}

/* 名称单元格 */
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.book-icon {
  font-size: 18px;
}

.book-name {
  font-weight: 500;
}

/* 主题标签 */
.theme-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.theme-tag-red {
  background: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}

.theme-tag-gray {
  background: rgba(74, 74, 74, 0.1);
  color: #4A4A4A;
}

.theme-tag-golden {
  background: rgba(184, 134, 11, 0.1);
  color: #B8860B;
}

/* 操作按钮 */
.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f5f5f5;
  color: #333;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

.page-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: #C75B39;
  color: #C75B39;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 6px;
}

.page-number {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
}

.page-number:hover {
  border-color: #C75B39;
  color: #C75B39;
}

.page-number.active {
  background: #C75B39;
  border-color: #C75B39;
  color: white;
}

.page-size-selector select {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  outline: none;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  color: #ddd;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: #666;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: #999;
  margin: 0 0 24px 0;
}

.empty-actions {
  display: flex;
  gap: 12px;
}

.empty-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-btn:hover {
  border-color: #C75B39;
  color: #C75B39;
}

.empty-btn.primary {
  background: #C75B39;
  color: white;
  border-color: #C75B39;
}

.empty-btn.primary:hover {
  background: #A04530;
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

/* 滚动条 */
.table-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
