<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ThemeType } from '../../types/theme';
import CreateBookSection from './CreateBookSection.vue';
import ManageBooksSection from './ManageBooksSection.vue';
import ActivateModal from './ActivateModal.vue';
import SettingsModal from './SettingsModal.vue';
import '../../types/database';

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
}>();

const emit = defineEmits<{
  (e: 'create-book', data: { eventName: string; eventDate: string; theme: ThemeType }): void;
  (e: 'open-book', path: string): void;
  (e: 'edit-book', data: { path: string; name: string; eventDate: string; theme: ThemeType }): void;
  (e: 'import-book'): void;
  (e: 'open-file'): void;
  (e: 'minimize'): void;
  (e: 'close'): void;
}>();

// ==================== 响应式状态 ====================
const showActivateModal = ref(false);
const showSettingsModal = ref(false);
const recentBooks = ref<RecentBook[]>([]);

// 编辑弹窗相关
// const showEditModal = ref(false);
// const editForm = ref({
//   name: '',
//   eventDate: '',
//   theme: 'wedding' as 'wedding' | 'funeral'
// });

// 编辑状态 - 直接显示在创建区域
const editingBook = ref<{
  path: string;
  name: string;
  eventDate: string;
  theme: ThemeType;
} | null>(null);

// ==================== 方法函数 ====================

// 加载最近礼薄列表
const loadRecentBooks = async () => {
  try {
    const response = await window.electronAPI.getRecentDatabases();
    console.log('getRecentDatabases response:', response);
    if (response.success && response.data) {
      console.log('Recent databases:', response.data.recentDatabases);
      recentBooks.value = response.data.recentDatabases.map(db => ({
        name: db.name,
        path: db.path,
        createdAt: db.createdAt,
        lastModified: db.lastModified,
        lastOpened: db.lastOpened,
        theme: db.theme,
        eventName: db.eventName,
        eventDate: db.eventDate
      }));
      console.log('Processed recentBooks:', recentBooks.value);
    }
  } catch (error) {
    console.error('加载最近礼薄失败:', error);
  }
};

// 处理创建礼薄
const handleCreateBook = (data: { eventName: string; eventDate: string; theme: ThemeType }) => {
  emit('create-book', data);
};

// 处理打开礼薄
const handleOpenBook = (path: string) => {
  emit('open-book', path);
};

// 处理导入礼薄
const handleImportBook = () => {
  emit('import-book');
};

// 处理打开文件
const handleOpenFile = () => {
  emit('open-file');
};

// 处理删除礼薄
const handleDeleteBook = async (path: string) => {
  console.log('收到删除请求:', path);
  try {
    // 再次确认，确保删除操作只在用户确认后执行
    const confirmed = await window.confirmDialog('确定要删除这个礼薄吗？此操作不可恢复。');
    console.log('二次确认结果:', confirmed);
    if (!confirmed) {
      console.log('用户取消删除');
      return;
    }
    
    console.log('调用 deleteDatabase:', path);
    const response = await window.electronAPI.deleteDatabase(path);
    console.log('删除响应:', response);
    if (response.success) {
      console.log('删除成功，重新加载礼薄列表');
      await loadRecentBooks();
    } else {
      alert('删除失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除礼薄失败:', error);
    alert('删除失败，请重试');
  }
};

// 处理编辑礼薄
const handleEditBook = (data: { path: string; name: string; eventDate: string; theme: ThemeType }) => {
  editingBook.value = {
    path: data.path,
    name: data.name,
    eventDate: data.eventDate,
    theme: data.theme
  };
};

// 保存编辑
const handleSaveEdit = async (data: {
  path: string;
  name: string;
  eventDate: string;
  theme: ThemeType;
}) => {
  try {
    // 修改数据库文件名
    const oldPath = data.path;
    const dir = oldPath.substring(0, oldPath.lastIndexOf('\\') + 1);
    const newName = data.name.replace(/[\\/:*?"<>|]/g, '_'); // 清理非法文件名字符
    const newPath = dir + newName + '.db';

    // 更新事件日期
    await window.electronAPI.updateDatabaseEventDate(oldPath, data.eventDate);

    // 如果需要重命名文件
    if (oldPath !== newPath) {
      // 关闭当前连接并移动文件
      await window.electronAPI.switchDatabase(newPath);
    }

    // 刷新礼簿列表
    await loadRecentBooks();
    
    // 取消编辑状态
    editingBook.value = null;
  } catch (error) {
    alert('编辑失败: ' + (error as Error).message);
  }
};

// 取消编辑
const handleCancelEdit = () => {
  editingBook.value = null;
};

// 窗口控制
// const handleMinimize = () => {
//   emit('minimize');
// };

// const handleClose = () => {
//   emit('close');
// };

// ==================== 生命周期 ====================
onMounted(() => {
  loadRecentBooks();
});
</script>

<template>
  <div class="home-view">
    <!-- 主内容区 -->
    <div class="home-content">
      <div class="main-sections">
        <!-- 创建礼薄区域 -->
        <CreateBookSection 
          :default-theme="props.defaultTheme"
          :editing-book="editingBook"
          @create="(data) => handleCreateBook(data)"
          @save-edit="(data) => handleSaveEdit(data)"
          @cancel-edit="handleCancelEdit"
        />

        <!-- 礼薄管理区域 -->
        <ManageBooksSection
          :books="recentBooks"
          @open="handleOpenBook"
          @delete="handleDeleteBook"
          @edit="handleEditBook"
          @import="handleImportBook"
          @open-file="handleOpenFile"
        />

        <!-- 使用说明区域 -->
        <div class="usage-section">
          <div class="section-header">
            <h2 class="section-title">使用说明</h2>
          </div>
          <div class="usage-content">
            <div class="usage-item">
              <div class="usage-icon">📝</div>
              <div class="usage-info">
                <div class="usage-title">创建礼簿</div>
                <div class="usage-desc">填写事务名称和日期，选择主题样式</div>
              </div>
            </div>
            <div class="usage-item">
              <div class="usage-icon">📁</div>
              <div class="usage-info">
                <div class="usage-title">管理礼簿</div>
                <div class="usage-desc">查看、打开和删除已创建的礼簿</div>
              </div>
            </div>
            <div class="usage-item">
              <div class="usage-icon">📊</div>
              <div class="usage-info">
                <div class="usage-title">记录礼金</div>
                <div class="usage-desc">添加、编辑和删除礼金记录</div>
              </div>
            </div>
            <div class="usage-item">
              <div class="usage-icon">📈</div>
              <div class="usage-info">
                <div class="usage-title">数据统计</div>
                <div class="usage-desc">查看礼金收支统计和报表</div>
              </div>
            </div>
            <div class="usage-item">
              <div class="usage-icon">📋</div>
              <div class="usage-info">
                <div class="usage-title">导出数据</div>
                <div class="usage-desc">导出为PDF或Excel格式</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮区域 -->
      <div class="bottom-actions">
        <div class="action-card" @click="showActivateModal = true">
          <div class="action-icon">🔐</div>
          <div class="action-title">激活窗口</div>
          <div class="action-desc">查看激活信息</div>
        </div>
        <div class="action-card" @click="showSettingsModal = true">
          <div class="action-icon">⚙️</div>
          <div class="action-title">设置</div>
          <div class="action-desc">数据路径等设置</div>
        </div>
      </div>
    </div>

    <!-- 激活弹窗 -->
    <ActivateModal
      v-model:show="showActivateModal"
    />

    <!-- 设置弹窗 -->
    <SettingsModal
      v-model:show="showSettingsModal"
    />
  </div>
</template>

<style scoped>
.home-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  overflow: hidden;
}

/* 主内容区 */
.home-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  gap: 16px;
  overflow-y: auto;
}

/* 主要区域 - 三栏布局 */
.main-sections {
  display: grid;
  grid-template-columns: 420px 1fr 300px;
  gap: 16px;
  flex: 1;
}

/* 底部操作区 */
.bottom-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: rgba(199, 91, 57, 0.2);
}

.action-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 12px;
  color: #999;
}

/* 滚动条样式 */
.home-content::-webkit-scrollbar {
  width: 6px;
}

.home-content::-webkit-scrollbar-track {
  background: transparent;
}

.home-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.home-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 使用说明区域 */
.usage-section {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.usage-section .section-header {
  margin-bottom: 8px;
}

.usage-section .section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.usage-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: background 0.2s ease;
}

.usage-item:hover {
  background: #f0f2f5;
}

.usage-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.usage-info {
  flex: 1;
  min-width: 0;
}

.usage-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.usage-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .main-sections {
    grid-template-columns: 380px 1fr 280px;
  }
}

@media (max-width: 992px) {
  .main-sections {
    grid-template-columns: 1fr 1fr;
  }
  .usage-section {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .main-sections {
    grid-template-columns: 1fr;
  }
  .usage-section {
    grid-column: 1;
  }
}
</style>