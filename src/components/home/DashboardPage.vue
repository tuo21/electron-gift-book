<script setup lang="ts">
import type { ThemeType } from '../../types/theme';
import CreateBookSection from './CreateBookSection.vue';
import ManageBooksSection from './ManageBooksSection.vue';

// ==================== 类型定义 ====================
interface RecentBook {
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
  defaultTheme?: ThemeType;
  recentBooks: RecentBook[];
  editingBook?: {
    path: string;
    name: string;
    eventDate: string;
    theme: ThemeType;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'create-book', data: { eventName: string; eventDate: string; theme: ThemeType }): void;
  (e: 'open-book', path: string): void;
  (e: 'edit-book', data: { path: string; name: string; eventDate: string; theme: ThemeType }): void;
  (e: 'delete-book', path: string): void;
  (e: 'import-book'): void;
  (e: 'open-file'): void;
  (e: 'show-activate'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-edit', data: { path: string; name: string; eventDate: string; theme: ThemeType }): void;
  (e: 'export-book', data: { path: string; name: string; eventDate?: string }): void;
}>();

// ==================== 方法函数 ====================
const handleCreateBook = (data: { eventName: string; eventDate: string; theme: ThemeType }) => {
  emit('create-book', data);
};

const handleOpenBook = (path: string) => {
  emit('open-book', path);
};

const handleEditBook = (data: { path: string; name: string; eventDate: string; theme: ThemeType }) => {
  emit('edit-book', data);
};

const handleDeleteBook = (path: string) => {
  emit('delete-book', path);
};

const handleImportBook = () => {
  emit('import-book');
};

const handleOpenFile = () => {
  emit('open-file');
};

const handleShowActivate = () => {
  emit('show-activate');
};

const handleExportBook = (data: { path: string; name: string; eventDate?: string }) => {
  emit('export-book', data);
};

const handleCancelEdit = () => {
  emit('cancel-edit');
};

const handleSaveEdit = (data: { path: string; name: string; eventDate: string; theme: ThemeType }) => {
  emit('save-edit', data);
};
</script>

<template>
  <div class="dashboard-page">
    <!-- 创建礼薄区域 -->
    <CreateBookSection 
      :default-theme="props.defaultTheme"
      :editing-book="props.editingBook"
      @create="handleCreateBook"
      @save-edit="handleSaveEdit"
      @cancel-edit="handleCancelEdit"
      @show-activate="handleShowActivate"
    />

    <!-- 礼薄管理区域 -->
    <ManageBooksSection
      :books="props.recentBooks"
      @open="handleOpenBook"
      @delete="handleDeleteBook"
      @edit="handleEditBook"
      @import="handleImportBook"
      @open-file="handleOpenFile"
      @show-activate="handleShowActivate"
      @export-book="handleExportBook"
    />
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条 */
.dashboard-page::-webkit-scrollbar {
  width: 6px;
}

.dashboard-page::-webkit-scrollbar-track {
  background: transparent;
}

.dashboard-page::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.dashboard-page::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}
</style>
