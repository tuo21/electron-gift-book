<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ImportDialog from './ImportDialog.vue';
import type { ImportPreview, ParsedRecord } from '../utils/import';
import { matchFields } from '../utils/import';

// ==================== 类型定义 ====================
type ThemeType = 'wedding' | 'funeral';

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
  (e: 'start', data: { eventName: string; theme: ThemeType; action: 'new' | 'open' | 'import'; filePath?: string }): void;
  (e: 'delete-file', filePath: string): void;
  (e: 'import', data: { eventName: string; records: ParsedRecord[] }): void;
}

// ==================== Props & Emits ====================
const props = withDefaults(defineProps<SplashScreenProps>(), {
  defaultEventName: '',
  defaultTheme: 'wedding',
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
const isAnimating = ref(false);
const showContent = ref(false);
const isImporting = ref(false);

// 导入对话框状态
const showImportDialog = ref(false);
const importFilePath = ref('');
const importPreview = ref<ImportPreview | null>(null);
const defaultImportName = ref('');

// ==================== 计算属性 ====================
const isWeddingTheme = computed(() => selectedTheme.value === 'wedding');
const isFuneralTheme = computed(() => selectedTheme.value === 'funeral');

// 主题样式配置
const themeStyles = computed(() => {
  if (isWeddingTheme.value) {
    return {
      background: 'linear-gradient(135deg, #EB564A 0%, #D6453D 100%)',
      cardBg: '#FFFFFF',
      primaryColor: '#EB564A',
      accentColor: '#E6BA37',
      textColor: '#333333',
      subtitleColor: '#666666'
    };
  } else {
    return {
      background: 'linear-gradient(135deg, #4A4A4A 0%, #333333 100%)',
      cardBg: '#F5F5F5',
      primaryColor: '#4A4A4A',
      accentColor: '#888888',
      textColor: '#333333',
      subtitleColor: '#666666'
    };
  }
});

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
    action: 'new'
  });
};

// 打开最近文件
const handleOpenRecentFile = async (file: RecentFile) => {
  if (isAnimating.value) return;
  
  isAnimating.value = true;
  emit('start', {
    eventName: '',
    theme: selectedTheme.value,
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
    records: data.records
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
            borderColor: themeStyles.primaryColor,
            '--focus-color': themeStyles.primaryColor 
          }"
        />
      </div>

      <!-- 主题选择 -->
      <div class="theme-section">
        <label class="input-label">选择主题</label>
        <div class="theme-options">
          <!-- 红事主题 -->
          <div
            class="theme-card"
            :class="{ 'selected': isWeddingTheme }"
            :style="{ 
              borderColor: isWeddingTheme ? '#EB564A' : 'transparent',
              backgroundColor: '#FFF5F5'
            }"
            @click="selectTheme('wedding')"
          >
            <div class="theme-icon wedding-icon">🎊</div>
            <div class="theme-name">红事</div>
            <div class="theme-desc">喜庆婚礼、满月酒等</div>
            <div v-if="isWeddingTheme" class="selected-indicator" style="background: #EB564A;">
              <span>✓</span>
            </div>
          </div>

          <!-- 白事主题 -->
          <div
            class="theme-card"
            :class="{ 'selected': isFuneralTheme }"
            :style="{ 
              borderColor: isFuneralTheme ? '#4A4A4A' : 'transparent',
              backgroundColor: '#F8F8F8'
            }"
            @click="selectTheme('funeral')"
          >
            <div class="theme-icon funeral-icon">🕯️</div>
            <div class="theme-name">白事</div>
            <div class="theme-desc">肃穆庄重</div>
            <div v-if="isFuneralTheme" class="selected-indicator" style="background: #4A4A4A;">
              <span>✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button
          class="action-btn primary-btn"
          :style="{ 
            backgroundColor: themeStyles.primaryColor,
            '--hover-color': isWeddingTheme ? '#D6453D' : '#333333'
          }"
          @click="handleCreateNew"
          :disabled="isAnimating"
        >
          <span class="btn-icon">📖</span>
          <span class="btn-text">新建礼金簿</span>
        </button>

        <button
          class="action-btn import-btn"
          :style="{ 
            borderColor: themeStyles.primaryColor,
            color: themeStyles.primaryColor,
            '--hover-bg': isWeddingTheme ? '#FFF5F5' : '#F0F0F0'
          }"
          @click="handleImport"
          :disabled="isAnimating || isImporting"
        >
          <span class="btn-icon">📥</span>
          <span class="btn-text">{{ isImporting ? '导入中...' : '导入数据' }}</span>
        </button>
      </div>

      <!-- 历史礼金簿 -->
      <div class="recent-files-section">
        <label class="input-label">历史礼金簿</label>
        <div class="recent-files-list">
          <div v-if="recentFiles.length === 0" class="empty-files">
            暂无历史礼金簿
          </div>
          <div
            v-for="file in recentFiles"
            :key="file.path"
            class="recent-file-item"
            @click="handleOpenRecentFile(file)"
            @contextmenu.prevent="handleContextMenu(file, $event)"
          >
            <span class="file-icon">📁</span>
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-date">{{ formatDate(file.lastOpened) }}</span>
            </div>
            <span class="file-arrow">›</span>
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
        <span class="menu-icon">🗑️</span>
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
/* ==================== 整体布局 ==================== */
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
}

.splash-content {
  width: 100%;
  max-width: 480px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-content.show {
  opacity: 1;
  transform: translateY(0);
}

.splash-content.hide {
  opacity: 0;
  transform: scale(0.95);
}

/* ==================== 头部区域 ==================== */
.header-section {
  text-align: center;
  margin-bottom: 24px;
}

.logo-container {
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
}

.app-title {
  font-size: 26px;
  font-weight: bold;
  color: #333333;
  margin: 0 0 6px 0;
  font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
}

.app-subtitle {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

/* ==================== 输入区域 ==================== */
.input-section {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333333;
  margin-bottom: 6px;
}

.event-name-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  color: #333333;
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
}

.event-name-input:focus {
  border-color: var(--focus-color);
  box-shadow: 0 0 0 3px rgba(235, 86, 74, 0.1);
}

.event-name-input::placeholder {
  color: #999999;
}

/* ==================== 主题选择区域 ==================== */
.theme-section {
  margin-bottom: 16px;
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.theme-card {
  position: relative;
  padding: 16px 12px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.theme-card.selected {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.theme-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.wedding-icon {
  filter: drop-shadow(0 2px 4px rgba(235, 86, 74, 0.3));
}

.funeral-icon {
  filter: drop-shadow(0 2px 4px rgba(74, 74, 74, 0.3));
}

.theme-name {
  font-size: 15px;
  font-weight: bold;
  color: #333333;
  margin-bottom: 2px;
}

.theme-desc {
  font-size: 11px;
  color: #666666;
}

.selected-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s ease;
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

/* ==================== 最近文件列表区域 ==================== */
.recent-files-section {
  margin-bottom: 20px;
}

.recent-files-list {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.empty-files {
  padding: 20px;
  text-align: center;
  color: #999999;
  font-size: 13px;
}

.recent-file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.recent-file-item:last-child {
  border-bottom: none;
}

.recent-file-item:hover {
  background: rgba(235, 86, 74, 0.05);
}

.file-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-date {
  font-size: 11px;
  color: #999999;
}

.file-arrow {
  font-size: 18px;
  color: #cccccc;
  flex-shrink: 0;
}

.recent-file-item:hover .file-arrow {
  color: #EB564A;
}

/* ==================== 操作按钮区域 ==================== */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-family: inherit;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--hover-color) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.import-btn {
  background: transparent;
  border: 2px solid;
}

.import-btn:hover:not(:disabled) {
  background-color: var(--hover-bg);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 18px;
}

.btn-text {
  font-size: 15px;
}

/* ==================== 底部区域 ==================== */
.footer-section {
  text-align: center;
}

.footer-text {
  font-size: 11px;
  color: #999999;
  margin: 0;
}

/* ==================== 滚动条样式 ==================== */
.recent-files-list::-webkit-scrollbar {
  width: 4px;
}

.recent-files-list::-webkit-scrollbar-track {
  background: transparent;
}

.recent-files-list::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 2px;
}

.recent-files-list::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 520px) {
  .splash-content {
    padding: 28px 20px;
  }

  .theme-options {
    grid-template-columns: 1fr;
  }

  .app-title {
    font-size: 22px;
  }

  .recent-files-list {
    max-height: 120px;
  }
}

/* ==================== 右键菜单样式 ==================== */
.context-menu {
  position: fixed;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 6px 0;
  z-index: 3000;
  min-width: 120px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.context-menu-item:hover {
  background: #f5f5f5;
}

.context-menu-item.delete-item {
  color: #ef4444;
}

.context-menu-item.delete-item:hover {
  background: #fef2f2;
}

.menu-icon {
  font-size: 16px;
}

.menu-text {
  font-size: 14px;
}

/* ==================== 删除确认弹窗样式 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  min-width: 320px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #333333;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999999;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333333;
}

.modal-body {
  padding: 20px;
}

.delete-message {
  text-align: center;
  color: #333333;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.delete-warning {
  color: #ef4444;
  font-weight: bold;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-family: inherit;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.confirm-btn {
  background: #ef4444;
  color: #ffffff;
}

.confirm-btn:hover {
  background: #dc2626;
}
</style>
