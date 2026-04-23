<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ImportDialog from './ImportDialog.vue';
import IconSvg from './IconSvg.vue';
import type { ImportPreview, ParsedRecord } from '../utils/import';
import { matchFields } from '../utils/import';
import type { ThemeType } from '../types/theme';
import { THEME_CONFIG } from '../types/theme';

// ==================== 类型定义 ====================
interface RecentFile {
  name: string;
  path: string;
  lastOpened: string;
}

interface SplashScreenProps {
  defaultEventName?: string;
  defaultTheme?: ThemeType;
  recentFiles?: RecentFile[];
}

interface SplashScreenEmits {
  (e: 'start', data: { eventName: string; theme: ThemeType; eventDate: string; action: 'new' | 'open' | 'import'; filePath?: string }): void;
  (e: 'delete-file', filePath: string): void;
  (e: 'import', data: { eventName: string; records: ParsedRecord[]; eventDate: string }): void;
}

// ==================== Props & Emits ====================
const props = withDefaults(defineProps<SplashScreenProps>(), {
  defaultEventName: '',
  defaultTheme: 'red',
  recentFiles: () => []
});

const emit = defineEmits<SplashScreenEmits>();

// ==================== 右键菜单 ====================
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuFile = ref<RecentFile | null>(null);

// 显示右键菜单
const handleContextMenu = (file: RecentFile, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  contextMenuFile.value = file;

  // 计算菜单位置，确保不超出视口边界
  const menuWidth = 120;
  const menuHeight = 40;
  let x = event.clientX;
  let y = event.clientY;

  // 检查右边界
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10;
  }

  // 检查下边界
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10;
  }

  contextMenuPosition.value = { x, y };
  showContextMenu.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false;
  contextMenuFile.value = null;
};

// ==================== 删除确认弹窗 ====================
const showDeleteConfirm = ref(false);
const fileToDelete = ref<RecentFile | null>(null);

// 显示删除确认弹窗
const showDeleteDialog = () => {
  if (!contextMenuFile.value) return;
  fileToDelete.value = contextMenuFile.value;
  showDeleteConfirm.value = true;
  closeContextMenu();
};

// 关闭删除确认弹窗
const closeDeleteDialog = () => {
  showDeleteConfirm.value = false;
  fileToDelete.value = null;
};

// 确认删除
const confirmDelete = async () => {
  if (!fileToDelete.value) return;

  try {
    const response = await window.electronAPI.deleteDatabase(fileToDelete.value.path);
    if (response.success) {
      // 从列表中移除 - 使用 emit 通知父组件更新
      emit('delete-file', fileToDelete.value.path);
      closeDeleteDialog();
    } else {
      alert('删除失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    alert('删除文件失败，请重试');
  }
};

// ==================== 响应式数据 ====================
const eventName = ref(props.defaultEventName);
const selectedTheme = ref<ThemeType>(props.defaultTheme);
const eventDate = ref(new Date().toISOString().split('T')[0]); // 默认当前日期，格式 YYYY-MM-DD
const isAnimating = ref(false);
const showContent = ref(false);
const isImporting = ref(false);

// 导入对话框状态
const showImportDialog = ref(false);
const importFilePath = ref('');
const importPreview = ref<ImportPreview | null>(null);
const defaultImportName = ref('');

// ==================== 计算属性 ====================

// 主题样式配置 - 日式极简风格
const themeStyles = computed(() => {
  const theme = selectedTheme.value;
  if (theme === 'red') {
    return {
      background: 'linear-gradient(135deg, #A0522D 0%, #8B4513 100%)',
      cardBg: '#FFFFFF',
      primaryColor: '#C75B39',
      accentColor: '#CD853F',
      textColor: '#2C2416',
      subtitleColor: '#6B5D4D',
      btnGradient: 'linear-gradient(135deg, #C75B39 0%, #A0522D 100%)'
    };
  } else if (theme === 'gray') {
    return {
      background: 'linear-gradient(135deg, #4A4A4A 0%, #333333 100%)',
      cardBg: '#F8F8F8',
      primaryColor: '#5A5A5A',
      accentColor: '#888888',
      textColor: '#2A2A2A',
      subtitleColor: '#5A5A5A',
      btnGradient: 'linear-gradient(135deg, #5A5A5A 0%, #4A4A4A 100%)'
    };
  } else {
    // golden theme
    return {
      background: 'linear-gradient(135deg, #D4A017 0%, #B8860B 100%)',
      cardBg: '#FEFCF5',
      primaryColor: '#B8860B',
      accentColor: '#D4A017',
      textColor: '#3D3015',
      subtitleColor: '#7A6B4D',
      btnGradient: 'linear-gradient(135deg, #D4A017 0%, #B8860B 100%)'
    };
  }
});

// 所有主题配置（用于UI渲染）
const allThemes = THEME_CONFIG;

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ==================== 方法函数 ====================

// 选择主题
const selectTheme = (theme: ThemeType) => {
  selectedTheme.value = theme;
};

// 新建礼金簿
const handleCreateNew = async () => {
  if (isAnimating.value) return;

  isAnimating.value = true;

  // 触发开始事件
  emit('start', {
    eventName: eventName.value.trim(),
    theme: selectedTheme.value,
    eventDate: eventDate.value,
    action: 'new'
  });
};

// 打开最近文件
const handleOpenRecentFile = async (file: RecentFile) => {
  if (isAnimating.value) return;

  // 检查文件路径是否有效
  if (!file.path) {
    alert('文件路径无效');
    isAnimating.value = false;
    return;
  }

  isAnimating.value = true;
  emit('start', {
    eventName: '',
    theme: selectedTheme.value,
    eventDate: eventDate.value,
    action: 'open',
    filePath: file.path
  });
};

// 从文件名提取默认事务名称
const extractEventNameFromFileName = (filePath: string): string => {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  // 移除扩展名
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  // 移除日期后缀（如 _20240101）
  return nameWithoutExt.replace(/_\d{8}$/, '').replace(/_\d{6}$/, '') || '导入的礼金簿';
};

// 导入数据
const handleImport = async () => {
  if (isAnimating.value || isImporting.value) return;

  isImporting.value = true;

  try {
    // 打开文件对话框选择要导入的 Excel 文件
    const response = await window.electronAPI.openImportFile();
    if (response.success && response.data?.filePath) {
      // 通过 IPC 调用主进程解析文件
      const parseResponse = await window.electronAPI.parseImportFile(response.data.filePath);
      if (!parseResponse.success) {
        alert('解析文件失败: ' + (parseResponse.error || '未知错误'));
        return;
      }

      // 使用解析结果进行字段匹配
      const { headers, data, totalRows } = parseResponse.data!;
      const mappings = matchFields(headers);

      // 获取未匹配的表头
      const matchedIndices = new Set(mappings.map(m => m.excelIndex));
      const unmatchedHeaders = headers.filter((_: any, index: number) => !matchedIndices.has(index));

      // 获取预览数据（前5行）
      const previewData = data.slice(0, 5).map((row: any) => {
        const obj: Record<string, any> = {};
        mappings.forEach(mapping => {
          obj[mapping.standardLabel] = row[mapping.excelIndex];
        });
        return obj;
      });

      importFilePath.value = response.data.filePath;
      importPreview.value = {
        headers,
        mappings,
        previewData,
        totalRows,
        unmatchedHeaders
      };
      defaultImportName.value = extractEventNameFromFileName(response.data.filePath);
      showImportDialog.value = true;
    }
  } catch (error) {
    console.error('导入文件失败:', error);
    alert('导入文件失败: ' + (error as Error).message);
  } finally {
    isImporting.value = false;
  }
};

// 关闭导入对话框
const handleCloseImportDialog = () => {
  showImportDialog.value = false;
  importFilePath.value = '';
  importPreview.value = null;
  defaultImportName.value = '';
};

// 确认导入
const handleConfirmImport = (data: { eventName: string; records: ParsedRecord[] }) => {
  showImportDialog.value = false;
  isAnimating.value = true;

  // 发送导入事件，包含解析后的数据
  emit('import', {
    eventName: data.eventName,
    records: data.records,
    eventDate: eventDate.value
  });
};

// ==================== 生命周期 ====================
onMounted(() => {
  // 延迟显示内容，实现淡入动画
  setTimeout(() => {
    showContent.value = true;
  }, 100);

  // 点击其他地方关闭右键菜单
  document.addEventListener('click', closeContextMenu);
});

</script>

<template>
  <div 
    class="splash-screen"
    :style="{ background: themeStyles.background }"
  >
    <!-- 装饰背景 -->
    <div class="bg-decoration">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>

    <div 
      class="splash-content"
      :class="{ 'show': showContent, 'hide': isAnimating }"
    >
      <!-- Logo 和标题区域 -->
      <div class="header-section">
        <div class="logo-container">
          <img src="/images/logo.png" alt="Logo" class="app-logo" />
        </div>
        <h1 class="app-title">电子礼金簿</h1>
        <p class="app-subtitle">记录人情往来，传承中华礼仪</p>
      </div>

      <!-- 事务名称输入 -->
      <div class="input-section">
        <label class="input-label">事务名称</label>
        <input
          v-model="eventName"
          type="text"
          class="event-name-input"
          placeholder="请输入事务名称"
          :style="{ 
            borderColor: 'transparent',
            '--focus-color': themeStyles.primaryColor 
          }"
        />
      </div>

      <!-- 日期选择 -->
      <div class="input-section">
        <label class="input-label">事务日期</label>
        <input
          v-model="eventDate"
          type="date"
          class="event-date-input"
          :style="{ 
            borderColor: 'transparent',
            '--focus-color': themeStyles.primaryColor 
          }"
        />
      </div>

      <!-- 主题选择 -->
      <div class="theme-section">
        <label class="input-label">选择主题</label>
        <div class="theme-options">
          <div
            v-for="theme in allThemes"
            :key="theme.id"
            class="theme-card"
            :class="{ 'selected': selectedTheme === theme.id }"
            :style="{ 
              borderColor: selectedTheme === theme.id ? themeStyles.primaryColor : 'transparent',
              backgroundColor: themeStyles.cardBg
            }"
            @click="selectTheme(theme.id)"
          >
            <div class="theme-icon" :class="`theme-icon-${theme.id}`">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path v-if="theme.id === 'red'" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                <circle v-else-if="theme.id === 'gray'" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                <path v-else d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
              </svg>
            </div>
            <div class="theme-name" :class="`theme-name-${theme.id}`">{{ theme.displayName }}</div>
            <div class="theme-desc">{{ theme.description.substring(0, 10) }}...</div>
            <div v-if="selectedTheme === theme.id" class="selected-indicator" :class="`selected-indicator-${theme.id}`">
              <IconSvg name="check" :size="14" color="#FFFFFF" />
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button
          class="action-btn primary-btn"
          :style="{ 
            background: themeStyles.btnGradient,
            '--hover-color': selectedTheme === 'red' ? '#8B4513' : '#333333'
          }"
          @click="handleCreateNew"
          :disabled="isAnimating"
        >
          <IconSvg name="book-plus" :size="18" color="#FFFFFF" />
          <span class="btn-text">新建礼金簿</span>
        </button>

        <button
          class="action-btn import-btn"
          :style="{ 
            borderColor: 'transparent',
            color: themeStyles.subtitleColor,
            '--hover-bg': selectedTheme === 'red' ? 'rgba(160, 82, 45, 0.06)' : 'rgba(74, 74, 74, 0.06)'
          }"
          @click="handleImport"
          :disabled="isAnimating || isImporting"
        >
          <IconSvg name="download" :size="18" :color="themeStyles.primaryColor" />
          <span class="btn-text">{{ isImporting ? '导入中...' : '导入数据' }}</span>
        </button>
      </div>

      <!-- 历史礼金簿 -->
      <div class="recent-files-section">
        <label class="input-label">历史礼金簿</label>
        <div class="recent-files-list">
          <div v-if="recentFiles.length === 0" class="empty-files">
            <IconSvg name="folder" :size="32" color="#CCCCCC" />
            <span class="empty-text">暂无历史礼金簿</span>
          </div>
          <div
            v-for="file in recentFiles"
            :key="file.path"
            class="recent-file-item"
            @click="handleOpenRecentFile(file)"
            @contextmenu.prevent="handleContextMenu(file, $event)"
          >
            <IconSvg name="folder" :size="18" :color="themeStyles.primaryColor" />
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-date">{{ formatDate(file.lastOpened) }}</span>
            </div>
            <IconSvg name="chevron-right" :size="16" color="#CCCCCC" />
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="footer-section">
        <p class="footer-text">数据自动保存，安全可靠</p>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item delete-item" @click="showDeleteDialog">
        <IconSvg name="trash" :size="16" color="#C75B39" />
        <span class="menu-text">删除</span>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="closeDeleteDialog">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">确认删除</h3>
          <button class="modal-close" @click="closeDeleteDialog">×</button>
        </div>
        <div class="modal-body">
          <p class="delete-message">
            确定要删除礼金簿 <strong>{{ fileToDelete?.name }}</strong> 吗？<br>
            <span class="delete-warning">此操作不可恢复！</span>
          </p>
          <div class="delete-actions">
            <button class="delete-btn cancel-btn" @click="closeDeleteDialog">取消</button>
            <button class="delete-btn confirm-btn" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入对话框 -->
    <ImportDialog
      :show="showImportDialog"
      :file-path="importFilePath"
      :default-event-name="defaultImportName"
      :preview="importPreview"
      @close="handleCloseImportDialog"
      @confirm="handleConfirmImport"
    />
  </div>
</template>

<style scoped>
/*
  ========================================
  启动页 - 日式极简风格
  ========================================
*/

/* 整体布局 */
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s ease;
  overflow-y: auto;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰背景 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: white;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: white;
  bottom: -50px;
  left: -50px;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: white;
  top: 50%;
  left: 10%;
  opacity: 0.05;
}

.splash-content {
  width: 100%;
  max-width: 460px;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
  z-index: 1;
}

.splash-content.show {
  opacity: 1;
  transform: translateY(0);
}

.splash-content.hide {
  opacity: 0;
  transform: scale(0.95);
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-container {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #FEFCF8 0%, #F8F5F0 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(160, 82, 45, 0.15);
  border: 2px solid rgba(160, 82, 45, 0.08);
}

.app-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.app-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0 0 8px 0;
  font-family: var(--font-name-amount);
  letter-spacing: 6px;
}

.app-subtitle {
  font-size: 13px;
  color: var(--theme-text-muted);
  margin: 0;
  letter-spacing: 2px;
}

/* 输入区域 */
.input-section {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-text-muted);
  margin-bottom: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.event-name-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  border: 2px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-paper);
  color: var(--theme-text-primary);
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
}

.event-name-input:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 4px rgba(199, 91, 57, 0.1);
}

.event-name-input::placeholder {
  color: var(--theme-text-muted);
}

/* 日期选择器样式 */
.event-date-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  font-size: 15px;
  border: 2px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-paper);
  color: var(--theme-text-primary);
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
  cursor: pointer;
  /* 确保日期选择器占满整个宽度 */
  box-sizing: border-box;
}

.event-date-input:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 4px rgba(199, 91, 57, 0.1);
}

/* 日期选择器伪元素样式 - 扩大点击区域 */
.event-date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

/* 日期选择器容器 */
.input-section:has(.event-date-input) {
  position: relative;
}

.event-date-input {
  position: relative;
}

/* 日期选择弹窗样式 - Webkit浏览器 */
.event-date-input::-webkit-datetime-edit {
  padding: 0;
}

.event-date-input::-webkit-date-and-time-value {
  text-align: left;
}

/* Firefox 日期选择器样式 */
.event-date-input::-moz-calendar-picker-indicator {
  cursor: pointer;
}

/* 控制日期选择弹窗的尺寸 */
input[type="date"]::-webkit-calendar-picker {
  width: 320px;
  min-width: 320px;
  max-width: 400px;
  font-size: 14px;
}

/* 调整日期选择弹窗内部元素 */
input[type="date"]::-webkit-date-and-time-value {
  font-size: 14px;
}

/* 尝试调整日历弹窗的大小 */
.event-date-input::-webkit-calendar-picker {
  transform: scale(1.2);
  transform-origin: top left;
}

/* 主题选择区域 */
.theme-section {
  margin-bottom: 20px;
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.theme-card {
  position: relative;
  padding: 20px 16px;
  border-radius: 16px;
  border: 2px solid transparent;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
  background: #FFFFFF;
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(160, 82, 45, 0.1);
}

.theme-card.selected {
  box-shadow: 0 4px 16px rgba(160, 82, 45, 0.15);
}

.theme-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-icon-red {
  color: #C75B39;
}

.theme-icon-gray {
  color: #5A5A5A;
}

.theme-icon-golden {
  color: #B8860B;
}

.theme-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  font-family: var(--font-name-amount);
}

.theme-name-red {
  color: #C75B39;
}

.theme-name-gray {
  color: #4A4A4A;
}

.theme-name-golden {
  color: #B8860B;
}

.theme-desc {
  font-size: 11px;
  color: var(--theme-text-muted);
}

.selected-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  animation: scaleIn 0.3s ease;
}

.selected-indicator-red {
  background: linear-gradient(135deg, #C75B39 0%, #A0522D 100%);
  box-shadow: 0 2px 8px rgba(199, 91, 57, 0.4);
}

.selected-indicator-gray {
  background: linear-gradient(135deg, #5A5A5A 0%, #4A4A4A 100%);
  box-shadow: 0 2px 8px rgba(90, 90, 90, 0.4);
}

.selected-indicator-golden {
  background: linear-gradient(135deg, #D4A017 0%, #B8860B 100%);
  box-shadow: 0 2px 8px rgba(184, 134, 11, 0.4);
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* 最近文件列表区域 */
.recent-files-section {
  margin-bottom: 24px;
}

.recent-files-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-paper);
}

.empty-files {
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-files .empty-text {
  color: var(--theme-text-muted);
  font-size: 13px;
}

.recent-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--theme-border);
}

.recent-file-item:last-child {
  border-bottom: none;
}

.recent-file-item:hover {
  background: rgba(160, 82, 45, 0.04);
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: var(--theme-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-name-amount);
}

.file-date {
  font-size: 11px;
  color: var(--theme-text-muted);
  margin-top: 2px;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-family: inherit;
  letter-spacing: 2px;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  color: white;
  box-shadow: 0 4px 16px rgba(160, 82, 45, 0.3);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(160, 82, 45, 0.4);
}

.import-btn {
  background: white;
  border: 2px solid var(--theme-border);
  color: var(--theme-text-secondary);
}

.import-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
  transform: translateY(-2px);
}

.btn-text {
  font-size: 15px;
}

/* 底部区域 */
.footer-section {
  text-align: center;
}

.footer-text {
  font-size: 11px;
  color: var(--theme-text-muted);
  margin: 0;
  letter-spacing: 1px;
  opacity: 0.7;
}

/* 滚动条样式 */
.recent-files-list::-webkit-scrollbar {
  width: 4px;
}

.recent-files-list::-webkit-scrollbar-track {
  background: transparent;
}

.recent-files-list::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 2px;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: var(--theme-paper);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 6px 0;
  z-index: 3000;
  min-width: 120px;
  border: 1px solid var(--theme-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: var(--theme-text-primary);
}

.context-menu-item:hover {
  background: rgba(160, 82, 45, 0.06);
}

.context-menu-item.delete-item {
  color: #C75B39;
}

.context-menu-item.delete-item:hover {
  background: rgba(199, 91, 57, 0.08);
}

/* 删除确认弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 36, 22, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--theme-paper);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--theme-border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0;
  font-family: var(--font-name-amount);
  letter-spacing: 2px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--theme-text-muted);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(160, 82, 45, 0.08);
  color: var(--theme-accent);
}

.modal-body {
  padding: 24px 20px;
}

.delete-message {
  text-align: center;
  color: var(--theme-text-primary);
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.delete-warning {
  color: #C75B39;
  font-weight: 600;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-btn {
  padding: 12px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-family: inherit;
  letter-spacing: 1px;
}

.cancel-btn {
  background: white;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.cancel-btn:hover {
  background: rgba(44, 36, 22, 0.02);
  border-color: var(--theme-text-secondary);
}

.confirm-btn {
  background: #C75B39;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(199, 91, 57, 0.3);
}

.confirm-btn:hover {
  background: #A84832;
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.4);
}

/* 响应式适配 */
@media (max-width: 520px) {
  .splash-content {
    padding: 32px 24px;
  }

  .theme-options {
    grid-template-columns: 1fr;
  }

  .app-title {
    font-size: 24px;
    letter-spacing: 4px;
  }

  .recent-files-list {
    max-height: 120px;
  }
}
</style>
