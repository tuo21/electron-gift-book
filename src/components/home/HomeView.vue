<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ThemeType } from '../../types/theme';
import DashboardPage from './DashboardPage.vue';
import InstructionsPage from './InstructionsPage.vue';
import SettingsPage from './SettingsPage.vue';
import AboutPage from './AboutPage.vue';
import IconSvg from '../IconSvg.vue';
import { useActivation } from '../../composables/useActivation';
import { getVersion } from '@tauri-apps/api/app';

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

interface NavItem {
  id: string;
  label: string;
  icon: string;
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
  (e: 'show-activate'): void;
}>();

// ==================== 响应式状态 ====================
const currentPage = ref('dashboard');
const recentBooks = ref<RecentBook[]>([]);
const editingBook = ref<{
  path: string;
  name: string;
  eventDate: string;
  theme: ThemeType;
} | null>(null);

// 激活相关
const { checkActivation, isActivated } = useActivation();

// 应用版本号
const appVersion = ref('');

// 导航菜单
const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页', icon: 'home' },
  { id: 'instructions', label: '使用说明', icon: 'help' },
  { id: 'settings', label: '设置', icon: 'settings' },
  { id: 'about', label: '关于', icon: 'info' },
];

// ==================== 方法函数 ====================

// 检查激活状态
const checkIsActivated = async () => {
  isActivated.value = await checkActivation();
};

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
    const oldPath = data.path;
    const dir = oldPath.substring(0, oldPath.lastIndexOf('\\') + 1);
    const newName = data.name.replace(/[\\/:*?"<>|]/g, '_');
    const newPath = dir + newName + '.db';

    let finalPath = oldPath;

    if (oldPath !== newPath) {
      const renameResult = await window.electronAPI.renameDatabase(oldPath, newName);
      if (!renameResult.success) {
        if (renameResult.error?.includes('已存在')) {
          alert('礼簿名称已存在，请使用其他名称');
        } else {
          alert('重命名失败: ' + (renameResult.error || '未知错误'));
        }
        return;
      }
      finalPath = newPath;
    }

    await window.electronAPI.updateDatabaseEventDate(finalPath, data.eventDate);
    await window.electronAPI.updateDatabaseTheme(finalPath, data.theme as any);
    await window.electronAPI.switchDatabase(finalPath);
    await loadRecentBooks();
    editingBook.value = null;
  } catch (error) {
    alert('编辑失败: ' + (error as Error).message);
  }
};

// 取消编辑
const handleCancelEdit = () => {
  editingBook.value = null;
};

// 处理显示激活
const handleShowActivate = () => {
  emit('show-activate');
};

// 处理导航切换
const handleNavClick = (navId: string) => {
  currentPage.value = navId;
};

// ==================== 生命周期 ====================
onMounted(async () => {
  loadRecentBooks();
  checkIsActivated();
  
  // 获取应用版本号
  try {
    const version = await getVersion();
    appVersion.value = `v${version}`;
  } catch (error) {
    console.error('获取版本号失败:', error);
    appVersion.value = '';
  }
});
</script>

<template>
  <div class="home-view">
    <!-- 背景层 -->
    <div class="bg-layer"></div>
    
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <!-- Logo区域 -->
      <div class="logo-section">
        <img src="/images/logo.png" alt="礼簿管理系统" class="logo-image" />
        <div class="app-info">
          <span class="app-name">礼簿管理系统</span>
          <span class="app-version">{{ appVersion || '电子礼金簿' }}</span>
        </div>
      </div>
      
      <!-- 导航菜单 -->
      <nav class="nav-menu">
        <button 
          v-for="item in navItems" 
          :key="item.id"
          class="nav-item"
          :class="{ active: currentPage === item.id }"
          @click="handleNavClick(item.id)"
        >
          <IconSvg :name="item.icon" :size="20" />
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>
      
      <!-- 底部激活状态 -->
      <div class="activation-section">
        <div class="activation-status" :class="{ activated: isActivated }">
          <span class="status-icon">
            <IconSvg :name="isActivated ? 'check' : 'warning'" :size="14" />
          </span>
          <span class="status-text">{{ isActivated ? '已激活' : '未激活' }}</span>
        </div>
        <p class="activation-desc">您当前使用的是{{ isActivated ? '已' : '未' }}激活版本</p>
        <button v-if="!isActivated" class="activate-btn" @click="handleShowActivate">
          去激活
        </button>
      </div>
    </aside>
    
    <!-- 右侧内容区 -->
    <main class="main-content">
      <!-- 动态页面内容 -->
      <div class="page-content">
        <DashboardPage 
          v-if="currentPage === 'dashboard'"
          :default-theme="props.defaultTheme"
          :recent-books="recentBooks"
          :editing-book="editingBook"
          @create-book="handleCreateBook"
          @open-book="handleOpenBook"
          @edit-book="handleEditBook"
          @delete-book="handleDeleteBook"
          @import-book="handleImportBook"
          @open-file="handleOpenFile"
          @show-activate="handleShowActivate"
          @cancel-edit="handleCancelEdit"
          @save-edit="handleSaveEdit"
        />
        <InstructionsPage v-else-if="currentPage === 'instructions'" />
        <SettingsPage 
          v-else-if="currentPage === 'settings'"
          @show-activate="handleShowActivate"
        />
        <AboutPage v-else-if="currentPage === 'about'" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* 背景层 - 纯色背景 */
.bg-layer {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #FFF5F5 0%, #FFEEEE 50%, #FFF0F0 100%);
  z-index: -1;
}

/* 左侧导航栏 */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: 
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(255, 250, 250, 0) 100%),
    var(--sidebar-bg-image, url('/Img/侧边栏背景.png'));
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  padding: 24px 0;
  z-index: 10;
}

/* Logo区域 */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.logo-image {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.25);
  object-fit: cover;
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.app-version {
  font-size: 12px;
  color: #999;
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
  overflow-y: auto;
}

.nav-menu::-webkit-scrollbar {
  width: 4px;
}

.nav-menu::-webkit-scrollbar-track {
  background: transparent;
}

.nav-menu::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.nav-item:hover {
  background: rgba(196, 30, 58, 0.04);
  color: #C41E3A;
}

.nav-item.active {
  background: rgba(196, 30, 58, 0.08);
  color: #C41E3A;
}

.nav-label {
  flex: 1;
}

/* 激活状态区域 */
.activation-section {
  padding: 16px;
  margin: 0 12px;
  background: rgb(255 255 255 / 91%);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.activation-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #999;
  margin-bottom: 6px;
}

.activation-status.activated {
  color: #52c41a;
}

.status-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(153, 153, 153, 0.1);
  border-radius: 50%;
}

.activation-status.activated .status-icon {
  background: rgba(82, 196, 26, 0.1);
}

.activation-desc {
  font-size: 12px;
  color: #999;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.activate-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid #C41E3A;
  border-radius: 8px;
  background: transparent;
  color: #C41E3A;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.activate-btn:hover {
  background: rgba(196, 30, 58, 0.05);
}

/* 右侧内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 页面内容区 */
.page-content {
  flex: 1;
  padding: 24px;
  overflow: hidden;
  min-height: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    width: 80px;
    padding: 16px 0;
  }
  
  .logo-section {
    padding: 0 10px 16px;
    justify-content: center;
  }
  
  .app-info,
  .nav-label,
  .activation-desc,
  .activate-btn {
    display: none;
  }
  
  .nav-item {
    justify-content: center;
    padding: 12px;
  }
  
  .activation-section {
    padding: 10px;
  }
  
  .activation-status {
    justify-content: center;
    margin-bottom: 0;
  }
  
  .status-text {
    display: none;
  }
}
</style>
