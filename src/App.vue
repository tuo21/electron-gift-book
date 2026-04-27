﻿﻿﻿<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import RecordForm from './components/RecordForm.vue';
import RecordList from './components/RecordList.vue';
import HomeView from './components/home/HomeView.vue';
import SyncQRDialog from './components/SyncQRDialog.vue';
import ActivateModal from './components/home/ActivateModal.vue';
import type { Record, RecordHistory } from './types/database';
import { getLunarDisplay } from './utils/lunarCalendar';
import { useTheme } from './composables/useTheme';
import { useAppConfig } from './composables/useAppConfig';
import { useFullscreenScale } from './composables/useFullscreenScale';
import { useActivation } from './composables/useActivation';
import Toast from './components/Toast.vue';
import EditHistoryModal from './components/business/EditHistoryModal.vue';
import StatisticsModal from './components/business/StatisticsModal.vue';
import SearchModal from './components/business/SearchModal.vue';
import ExportModal from './components/business/ExportModal.vue';
import StyleCustomizeDialog from './components/StyleCustomizeDialog.vue';
import IconSvg from './components/IconSvg.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import VoiceSettingsDialog from './components/VoiceSettingsDialog.vue';
import { useVoice } from './composables/useVoice';
import { useStyleCustomization } from './composables/useStyleCustomization';
import { useSearch } from './composables/useSearch';
import { useEditHistory } from './composables/useEditHistory';
import { useExport } from './composables/useExport';
import { useRecordOperations } from './composables/useRecordOperations';
import { useBookManagement } from './composables/useBookManagement';
import { useAppState } from './composables/useAppState';

// ==================== 激活相关 ====================
const { checkActivation } = useActivation();
const showActivateModal = ref(false);

// 激活状态改变时重新检查
const handleActivationChanged = async () => {
  await checkActivation();
};

// ==================== 启动页和配置 ====================
const { setTheme, currentTheme } = useTheme();
const { config, setEventName, setCurrentDbPath, generateFileName, addToRecentBooks, removeFromRecentBooks, initConfig, setDisplayStyle, setCustomFont, setEventDate } = useAppConfig();
const { initFullscreenScale, destroyFullscreenScale } = useFullscreenScale();

// Toast 组件引用
const toastRef = ref<InstanceType<typeof Toast> | null>(null);

// ==================== 语音设置相关 ====================
const voice = useVoice()

// ConfirmDialog 组件引用
const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);

// 全局确认函数
const confirmDialog = (message: string, options?: { title?: string, confirmText?: string, cancelText?: string, confirmType?: 'danger' | 'warning' | 'primary' }) => {
  if (confirmDialogRef.value) {
    return confirmDialogRef.value.open({
      message,
      title: options?.title,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      confirmType: options?.confirmType
    });
  }
  return Promise.resolve(false);
};

// 暴露到全局
(window as any).confirmDialog = confirmDialog;

const state = useAppState()
const {
  showSplashScreen, isAppReady, recordsStore,
  records, statistics, bookName, lunarDate, intervalId,
  showStatisticsModal, showEditHistoryModal, editHistoryList,
  currentPreview, previewText, currentPage,
  showSearchModal, searchKeyword, searchResults, isSearching,
  showExportModal, isExporting,
  showStyleDialog, syncDialogVisible,
} = state

const recordListRef = shallowRef<InstanceType<typeof RecordList>>()
const recordFormRef = shallowRef<InstanceType<typeof RecordForm>>()

// ==================== 搜索相关 ====================
const search = useSearch(
  showSearchModal, searchKeyword, searchResults, isSearching,
  showActivateModal, checkActivation, recordListRef
)
const { handleSearch, closeSearchModal, performSearch, handleSearchResultClick } = search

// ==================== 记录操作相关 ====================
const recordsOps = useRecordOperations(
  records, recordsStore, currentPage, statistics, currentPreview,
  showStatisticsModal, showActivateModal,
  recordListRef, recordFormRef, checkActivation,
)
const { loadRecords, loadStatistics, handleSubmit, handleEdit, handleUpdate, handleDelete, handleInputPreview, clearPreview, currentPageAmount, openStatisticsModal, closeStatisticsModal } = recordsOps

// ==================== 样式自定义相关 ====================
const style = useStyleCustomization(setDisplayStyle, setCustomFont, toastRef)
const { applyCustomFont, handleStyleConfirm, handleSelectFont, handleResetFont } = style

// ==================== 修改历史相关 ====================
const editHistory = useEditHistory(
  editHistoryList, showEditHistoryModal, currentPage,
  recordListRef, toastRef,
  loadRecords, loadStatistics,
)
const { openEditHistoryModal, closeEditHistoryModal, handleLocateRecord, handleRevertRecord, handleRestoreDeletedRecord } = editHistory

// ==================== 导出相关 ====================
const exportModule = useExport(
  records, bookName, showExportModal, isExporting,
  showActivateModal, config, currentTheme, checkActivation, toastRef,
)
const { handleSave, handleExport, closeExportModal, handleExportFormat } = exportModule

const handleEditClick = async () => {
  const isActivated = await checkActivation();
  if (!isActivated) {
    showActivateModal.value = true;
    return;
  }
  openEditHistoryModal();
};

// ==================== 礼薄管理相关 ====================
const bookMgmt = useBookManagement(
  setTheme, config, showSplashScreen, isAppReady, syncDialogVisible,
  bookName, records, statistics,
  setEventName, setEventDate, setCurrentDbPath,
  generateFileName, addToRecentBooks, removeFromRecentBooks,
  loadRecords, loadStatistics,
)
const { handleSyncToMiniApp, handleCreateBookFromHome, handleOpenBookFromHome, handleEditBookFromHome, handleImportFromHome, handleOpenFileFromHome, handleMinimizeWindow, handleCloseWindow, handleBackToSplash, scanDataDirectory } = bookMgmt

onMounted(async () => {
  // 初始化配置
  initConfig();

  // 初始化全屏缩放
  initFullscreenScale();

  // 同步 useTheme 的 currentTheme 与 appConfig 中的 theme
  if (config.value.theme) {
    setTheme(config.value.theme, true);
  }

  // 加载并应用保存的自定义字体
  if (config.value.customFontCssName) {
    applyCustomFont(config.value.customFontCssName);
  }

  // 扫描 data 目录获取文件列表
  await scanDataDirectory();

  // 默认显示启动页，让用户选择要打开的礼金簿
  showSplashScreen.value = true;
  isAppReady.value = false;

  intervalId.value = window.setInterval(() => {
    lunarDate.value = getLunarDisplay();
  }, 60000);
});

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
  }
  // 销毁全屏缩放功能
  destroyFullscreenScale();
});
</script>

<template>
  <!-- Toast 提示组件 -->
  <Toast ref="toastRef" />

  <!-- 首页 -->
  <HomeView
    v-if="showSplashScreen"
    :default-theme="config.theme"
    @create-book="handleCreateBookFromHome"
    @open-book="handleOpenBookFromHome"
    @edit-book="handleEditBookFromHome"
    @import-book="handleImportFromHome"
    @open-file="handleOpenFileFromHome"
    @minimize="handleMinimizeWindow"
    @close="handleCloseWindow"
    @show-activate="showActivateModal = true"
  />

  <!-- 
    ========================================
    整体布局结构说明
    ========================================
    1. app-container: 最外层容器，占满整个视口高度(100vh)
    2. app-header: 顶部导航栏（固定高度）
    3. main-content: 主内容区（自适应剩余高度）
  -->
  <div v-show="isAppReady" class="app-container" :class="{ 'fade-in': isAppReady }">
    
    <!-- 
      ========================================
      顶部导航栏 (app-header)
      ========================================
      布局：左中右三栏布局
      - header-left: Logo + 应用名称
      - header-center: 功能按钮组
      - header-right: 农历日期显示
      
      调整建议：
      - 修改高度：调整 padding 值
      - 修改背景色：修改 background
      - 修改按钮间距：调整 header-center 的 gap
    -->
    <header class="app-header">
      <!-- 左侧：Logo和名称 -->
      <div class="header-left">
        <img src="/images/logo.png" alt="Logo" class="app-logo" @click="handleBackToSplash" />
        <div class="app-name-wrapper">
          <h1 class="app-name">
            {{ bookName }}
          </h1>
        </div>
      </div>

      <!-- 中间：功能按钮 -->
      <div class="header-center">
        <button class="func-btn" @click="handleBackToSplash">
          <IconSvg name="home" :size="20" />
          <span class="btn-text">回到首页</span>
        </button>
        <button class="func-btn" @click="handleSave">
          <IconSvg name="save" :size="20" />
          <span class="btn-text">保存</span>
        </button>
        <button class="func-btn" @click="handleExport">
          <IconSvg name="export" :size="20" />
          <span class="btn-text">导出</span>
        </button>
        <button class="func-btn" @click="handleEditClick">
          <IconSvg name="edit" :size="20" />
          <span class="btn-text">修改记录</span>
        </button>
        <button class="func-btn" @click="openStatisticsModal">
          <IconSvg name="chart" :size="20" />
          <span class="btn-text">统计</span>
        </button>
        <button class="func-btn" @click="handleSearch">
          <IconSvg name="search" :size="20" />
          <span class="btn-text">搜索</span>
        </button>
        <button class="func-btn" @click="showStyleDialog = true">
          <IconSvg name="palette" :size="20" />
          <span class="btn-text">样式</span>
        </button>
        <button class="func-btn" @click="handleSyncToMiniApp" title="小程序">
          <IconSvg name="wechat" :size="20" />
          <span class="btn-text">微信小程序</span>
        </button>
        <button class="func-btn" @click="voice.handleShowVoiceSettings" title="语音设置">
          <IconSvg name="mic" :size="20" />
          <span class="btn-text">语音</span>
        </button>
      </div>

      <!-- 右侧：农历日期 -->
      <div class="header-right">
        <div class="lunar-date">
          <div class="lunar-primary">{{ lunarDate.primary }}</div>
          <div class="lunar-secondary">{{ lunarDate.secondary }}</div>
        </div>
      </div>
    </header>

    <!-- 
      ========================================
      实时预览区域 (name-preview-section)
      ========================================
      位置：工具栏下方，主内容区上方
      高度：80px
      显示：横排显示当前输入框的内容
    -->
    <div class="name-preview-section">
      <div class="preview-content">
        <span class="preview-name" :class="{ 'has-content': currentPreview.value }">{{ previewText }}</span>
      </div>
    </div>

    <!-- 
      ========================================
      主内容区 (main-content)
      ========================================
      布局：左右两栏
      - giftbook-section: 左侧礼金簿（自适应宽度）
      - sidebar-section: 右侧边栏（固定宽度320px）
      
      调整建议：
      - 修改左右间距：调整 gap
      - 修改内边距：调整 padding
      - 修改侧边栏宽度：调整 sidebar-section 的 width
    -->
    <main class="main-content">
      <!-- 左侧：礼金簿展示 -->
      <section class="giftbook-section">
        <RecordList ref="recordListRef" :records="records" :page-size="15"
                    :display-style="config.displayStyle"
                    v-model:current-page="currentPage"
                    @edit="handleEdit" @delete="handleDelete" />
      </section>

      <!-- 
        右侧：信息录入和统计
        包含两个面板：
        1. form-panel: 录入表单面板（上方）
        2. statistics-panel: 统计信息面板（下方）
      -->
      <aside class="sidebar-section">
        <!-- 录入表单面板 -->
        <div class="form-panel">
          <RecordForm ref="recordFormRef" @submit="handleSubmit" @update="handleUpdate" @input-preview="handleInputPreview" @clear-preview="clearPreview" />
        </div>

        <!-- 统计面板 - 本页小计 -->
        <div class="statistics-panel">
          <div class="stat-vertical">
            <div class="stat-row">
              <span class="stat-label">本页小计</span>
            </div>
            <div class="stat-row">
              <span class="stat-value amount-total">
                {{ currentPageAmount }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 统计详情弹窗 -->
    <StatisticsModal
      :visible="showStatisticsModal"
      :statistics="statistics"
      @close="closeStatisticsModal"
    />

    <!-- 修改记录弹窗 -->
    <EditHistoryModal
      v-if="showEditHistoryModal"
      :edit-history-list="editHistoryList"
      @close="closeEditHistoryModal"
      @locate="handleLocateRecord"
      @revert="handleRevertRecord"
      @restore-deleted="handleRestoreDeletedRecord"
    />

    <!-- 搜索弹窗 -->
    <SearchModal
      :visible="showSearchModal"
      :search-keyword="searchKeyword"
      :search-results="searchResults"
      :is-searching="isSearching"
      @close="closeSearchModal"
      @search="performSearch"
      @result-click="handleSearchResultClick"
    />

    <!-- 导出弹窗 -->
    <ExportModal
      :visible="showExportModal"
      :is-exporting="isExporting"
      @close="closeExportModal"
      @export="handleExportFormat"
    />

    <!-- 激活弹窗 -->
    <ActivateModal
      :show="showActivateModal"
      @update:show="showActivateModal = $event"
      @activation-changed="handleActivationChanged"
    />

    <!-- 语音设置弹窗 -->
    <VoiceSettingsDialog
      :visible="voice.showVoiceSettings"
      :voice-enabled="voice.voiceEnabled"
      :voice-rate="voice.voiceRate"
      :voice-volume="voice.voiceVolume"
      :voice-pitch="voice.voicePitch"
      :voice-voice="voice.voiceVoice"
      :available-voices="voice.availableVoices"
      @close="voice.handleCloseVoiceSettings"
      @update:voice-enabled="voice.handleVoiceEnabledChange"
      @update:voice-rate="voice.handleVoiceRateChange"
      @update:voice-volume="voice.handleVoiceVolumeChange"
      @update:voice-pitch="voice.handleVoicePitchChange"
      @update:voice-voice="voice.handleVoiceVoiceChange"
      @test-voice="voice.handleTestVoice"
    />

    <!-- 样式自定义弹窗 -->
    <StyleCustomizeDialog
      v-model:visible="showStyleDialog"
      :config="{
        displayStyle: config.displayStyle,
        customFontCssName: config.customFontCssName
      }"
      @confirm="handleStyleConfirm"
      @select-font="handleSelectFont"
      @reset-font="handleResetFont"
    />

    <!-- 同步到小程序弹窗 -->
    <SyncQRDialog
      :visible="syncDialogVisible"
      @close="syncDialogVisible = false"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog ref="confirmDialogRef" />
  </div>
</template>

<style>
/* 导入主题样式变量 */
@import './styles/theme.css';

/* ==================== 全局重置 ==================== */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: var(--theme-font-family);
  background: var(--theme-bg-image) center center / cover no-repeat fixed;
  overflow: hidden;
  min-height: 100vh;
}

/* ==================== 启动页过渡动画 ==================== */
.app-container {
  opacity: 0;
  transition: opacity 0.5s ease;
}

.app-container.fade-in {
  opacity: 1;
}

/* ==================== PDF 导出样式 ==================== */
/* 这些样式用于 PDF 导出时的渲染，不在主界面显示 */
@font-face {
  font-family: '演示春风楷';
  src: url('/fonts/XuandongKaishu.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

:global(.pdf-export-container) {
  font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
}

:global(.pdf-giftbook) {
  background: #c44a3d;
  padding: 20px;
  min-height: 210mm;
}

:global(.pdf-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

:global(.pdf-title) {
  color: #fff;
  font-size: 28px;
  font-weight: bold;
  margin: 0;
  font-family: '演示春风楷', 'KaiTi', 'SimSun', serif;
}

:global(.pdf-date) {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-family: 'SimSun', 'STSong', serif;
}

:global(.pdf-content) {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
}

:global(.pdf-column) {
  width: 60px;
  height: 420px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #d4a574;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

:global(.pdf-empty-column) {
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.7);
}

:global(.pdf-cell) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px dashed rgba(196, 74, 61, 0.2);
}

:global(.pdf-cell:last-child) {
  border-bottom: none;
}

:global(.pdf-label-cell) {
  padding: 4px 0;
}

:global(.pdf-label) {
  font-size: 11px;
  color: #c44a3d;
  font-weight: bold;
  font-family: 'SimSun', 'STSong', serif;
}

:global(.pdf-name-cell) {
  flex: 0 0 auto;
  height: 130px;
  min-height: 120px;
  justify-content: center;
}

:global(.pdf-name) {
  color: #333;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 3px;
  font-size: 28px;
  font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
}

:global(.pdf-remark-cell) {
  flex: 0 0 auto;
  height: 18px;
  min-height: 18px;
  max-height: 18px;
  justify-content: center;
  overflow: hidden;
}

:global(.pdf-remark) {
  font-size: 10px;
  color: #666;
  font-family: 'KaiTi', 'STKaiti', serif;
}

:global(.pdf-amount-cell) {
  flex: 0 0 auto;
  height: 160px;
  min-height: 140px;
  justify-content: center;
}

:global(.pdf-amount-content) {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 2px;
  height: 100%;
}

:global(.pdf-amount-chinese) {
  color: #333;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 2px;
  line-height: 1.5;
  font-size: 22px;
  font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
}

:global(.pdf-item-desc) {
  font-size: 10px;
  color: #666;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 1px;
  font-family: 'KaiTi', 'STKaiti', serif;
}

:global(.pdf-payment-cell) {
  flex: 0 0 auto;
  gap: 4px;
  padding: 8px 0;
}

:global(.pdf-payment-type) {
  font-size: 10px;
  color: #c44a3d;
  font-weight: bold;
  font-family: 'SimSun', 'STSong', serif;
}

:global(.pdf-amount-number) {
  font-size: 10px;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
}

:global(.pdf-footer) {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}
</style>

<style scoped>
/*
  ========================================
  日式极简 · 温润木质主题
  ========================================
  设计理念：匠心雅韵 · 自然温润
  - 温暖的木质感配色
  - 极简的线条装饰
  - 柔和的阴影层次
  - 精致的细节处理
*/

/* ==================== 最外层容器 ==================== */
.app-container {
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
  transform: scale(var(--fullscreen-scale));
  transform-origin: top left;
  width: calc(100vw / var(--fullscreen-scale));
  height: calc(100vh / var(--fullscreen-scale));
  min-width: calc(1522px * 0.7);
  min-height: calc(930px * 0.7);
  position: relative;
}

/* 背景纹理层 - 使用主题变量 */
.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-bg-overlay);
  pointer-events: none;
  z-index: 0;
}

/* ==================== 顶部导航栏 - 使用主题变量 ==================== */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: var(--theme-header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--theme-header-border);
  z-index: 100;
  position: relative;
  overflow: hidden;
}

/* 导航栏纹理背景 - 使用主题变量 */
.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: var(--theme-header-pattern);
  background-repeat: var(--theme-header-pattern-repeat, repeat-x);
  background-position: var(--theme-header-pattern-position, center);
  background-size: var(--theme-header-pattern-size, 300px 60px);
  opacity: var(--theme-header-pattern-opacity);
  pointer-events: none;
  z-index: 0;
}

/* 导航栏底部金色装饰线 */
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--theme-gold), transparent);
  opacity: 0.6;
}

/* 导航栏左侧 */
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.app-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: var(--theme-shadow-sm);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.app-logo:hover {
  transform: scale(1.08);
  box-shadow: var(--theme-shadow);
}

.app-name {
  color: var(--theme-text-light);
  font-size: var(--theme-font-size-xl);
  font-weight: 600;
  font-family: var(--font-name-amount);
  cursor: pointer;
  letter-spacing: 3px;
  transition: color 0.3s ease;
  position: relative;
  padding-left: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.app-name::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: linear-gradient(180deg, var(--theme-gold) 0%, var(--theme-gold-dark) 100%);
  border-radius: 2px;
}

.app-name:hover {
  color: var(--theme-gold-light);
}

.app-name-input {
  font-size: var(--theme-font-size-xl);
  padding: 8px 12px;
  border: 2px solid var(--theme-accent);
  border-radius: var(--theme-border-radius-sm);
  background: var(--theme-paper);
  color: var(--theme-text-primary);
  width: 200px;
  font-family: var(--font-name-amount);
  outline: none;
  letter-spacing: 3px;
}

/* 导航栏中间 - 功能按钮组 */
.header-center {
  display: flex;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.func-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 14px;
  border: none;
  border-radius: var(--theme-border-radius-sm);
  background: transparent;
  color: var(--theme-header-text);
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.func-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--theme-header-text);
  border-radius: 0 0 2px 2px;
  transition: width 0.25s ease;
}

.func-btn:hover {
  color: var(--theme-header-text-hover);
  background: rgba(249, 212, 187, 0.15);
}

.func-btn:hover::before {
  width: 60%;
}

.func-btn:active {
  transform: scale(0.98);
}

.btn-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.about-btn:hover {
  background: rgba(249, 212, 187, 0.1);
}

/* 导航栏右侧 - 农历日期 */
.header-right {
  text-align: right;
  position: relative;
  z-index: 1;
}

.lunar-date {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--theme-border-radius-sm);
  border: 1px solid var(--theme-header-border);
}

.lunar-primary {
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  color: var(--theme-gold-light);
  font-family: var(--font-name-amount);
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.lunar-secondary {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
  letter-spacing: 0.5px;
}

/* ==================== 姓名预览区域 ==================== */
.name-preview-section {
  height: 80px;
  width: 600px;
  margin: 16px auto -16px;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 装饰外框 - 左右延伸线 */
.name-preview-section::before,
.name-preview-section::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--theme-accent), transparent);
  opacity: 0.4;
}

.name-preview-section::before {
  right: calc(100% + 20px);
}

.name-preview-section::after {
  left: calc(100% + 20px);
}

.preview-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  height: 100%;
}

/* 预览文字容器 - 带伪元素下划线 */
.preview-name {
  font-size: 80px;
  color: var(--theme-preview-name-color, var(--theme-text-primary));
  font-family: var(--font-name-amount);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  display: flex;
  align-items: center;
  letter-spacing: 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  padding-bottom: 12px;
}

/* 渐变下划线 - 使用伪元素 */
.preview-name::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    var(--theme-accent) 20%, 
    var(--theme-primary) 50%, 
    var(--theme-accent) 80%, 
    transparent 100%
  );
  border-radius: 2px;
  opacity: 0;
  filter: blur(0px);
  transition: width 0.5s ease, opacity 0.3s ease, filter 0.3s ease;
}

/* 有内容时显示下划线 */
.preview-name.has-content::after {
  width: 80%;
  opacity: 0.7;
  filter: blur(6px);
}

/* ==================== 主内容区 ==================== */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
  padding: 24px 40px;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* 左侧礼金簿展示区 - 固定宽度（15 列） */
.giftbook-section {
  width: 1290px;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

/* 右侧边栏 */
.sidebar-section {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

/* ==================== 统计面板 ==================== */
.statistics-panel {
  background: var(--theme-container-bg);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  box-shadow: var(--theme-shadow);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--theme-container-border);
  position: relative;
  overflow: hidden;
}



.stat-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
}

.stat-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: var(--theme-border-radius-sm);
  width: 100%;
}

.stat-value {
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  color: var(--theme-text-primary);
}

.stat-label {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-muted);
  font-weight: 500;
  letter-spacing: 1px;
}

.amount-total {
  font-size: 26px;
  color: var(--theme-accent);
  font-weight: 700;
  font-family: var(--font-name-amount);
  letter-spacing: 2px;
}

.toggle-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: var(--theme-border-radius-sm);
  background: var(--theme-accent);
  color: var(--theme-text-light);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(var(--theme-primary-rgb), 0.2);
}

.toggle-btn:hover {
  background: var(--theme-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--theme-primary-rgb), 0.3);
}

/* ==================== 录入表单面板 ==================== */
.form-panel {
  background: var(--theme-container-bg);
  border-radius: var(--theme-border-radius);
  padding: 20px;
  box-shadow: var(--theme-shadow);
  flex: 1;
  border: 1px solid var(--theme-container-border);
  position: relative;
  overflow: hidden;
}



/* ==================== 弹窗样式 ==================== */
.modal-content {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  box-shadow: var(--theme-shadow-lg);
  min-width: 400px;
  max-width: 90vw;
  border: 1px solid var(--theme-border);
  overflow: hidden;
  position: relative;
}

.modal-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--theme-accent), var(--theme-primary));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--theme-border);
}

.modal-title {
  font-size: var(--theme-font-size-lg);
  color: var(--theme-text-primary);
  margin: 0;
  font-weight: 600;
  font-family: var(--font-name-amount);
  letter-spacing: 2px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--theme-text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--theme-border-radius-sm);
  transition: all 0.25s ease;
}

.modal-close:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

.modal-body {
  padding: 24px;
}

/* 统计详情网格 */
.stat-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(var(--theme-primary-rgb), 0.03);
  border-radius: var(--theme-border-radius);
  gap: 8px;
  border: 1px solid var(--theme-border);
  transition: all 0.25s ease;
}

.stat-detail-item:hover {
  background: rgba(var(--theme-primary-rgb), 0.05);
  transform: translateY(-2px);
  box-shadow: var(--theme-shadow-sm);
}

.stat-detail-item:first-child,
.stat-detail-item:nth-child(2) {
  grid-column: span 2;
}

.stat-detail-label {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-muted);
  font-weight: 500;
}

.stat-detail-value {
  font-size: var(--theme-font-size-lg);
  font-weight: 700;
  color: var(--theme-accent);
  font-family: var(--font-name-amount);
}

/* ==================== 修改记录弹窗 ==================== */
.edit-history-modal {
  min-width: 520px;
  max-width: 90vw;
  max-height: 80vh;
}

.edit-history-modal .modal-body {
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: var(--theme-text-muted);
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: rgba(var(--theme-primary-rgb), 0.02);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  transition: all 0.25s ease;
}

.history-item:hover {
  border-color: var(--theme-accent);
  box-shadow: var(--theme-shadow-sm);
  transform: translateX(4px);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--theme-border);
}

.history-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--theme-text-primary);
  font-family: var(--font-name-amount);
  letter-spacing: 1px;
}

.history-time {
  font-size: 12px;
  color: var(--theme-text-muted);
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.change-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.change-label {
  color: var(--theme-text-muted);
  flex-shrink: 0;
}

.change-value {
  color: var(--theme-text-primary);
  word-break: break-all;
}

.change-value.new-value {
  color: var(--theme-accent);
  font-weight: 600;
}

/* 已删除记录样式 */
.deleted-item {
  background: rgba(239, 68, 68, 0.02);
  border-color: rgba(239, 68, 68, 0.1);
  opacity: 0.8;
}

.deleted-item .history-header {
  border-bottom-color: rgba(239, 68, 68, 0.08);
}

.delete-badge {
  background: var(--theme-accent);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 500;
}

/* ==================== 搜索弹窗 ==================== */
.search-modal {
  min-width: 500px;
  max-width: 90vw;
  width: 500px;
  height: 450px;
}

.search-modal .modal-body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px);
  overflow: hidden;
}

.search-input-area {
  display: flex;
  gap: var(--theme-spacing-sm);
  margin-bottom: var(--theme-spacing-lg);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  font-size: var(--theme-font-size-md);
  font-family: inherit;
  background: var(--theme-paper);
  transition: all 0.25s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px rgba(var(--theme-primary-rgb), 0.08);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.empty-results,
.search-hint,
.searching-hint {
  text-align: center;
  padding: var(--theme-spacing-xl);
  color: var(--theme-text-muted);
  font-size: var(--theme-font-size-md);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-sm);
}

.result-item {
  background: rgba(var(--theme-primary-rgb), 0.02);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-item:hover {
  background: rgba(var(--theme-primary-rgb), 0.05);
  border-color: var(--theme-accent);
  transform: translateX(4px);
  box-shadow: var(--theme-shadow-sm);
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-name {
  font-weight: 600;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
  font-family: var(--font-name-amount);
}

.result-amount {
  font-size: var(--theme-font-size-md);
  color: var(--theme-accent);
  font-weight: 600;
  font-family: var(--font-name-amount);
}

.result-sub {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item-desc,
.result-remark {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-muted);
}

/* ==================== 导出弹窗 ==================== */
.export-modal {
  min-width: 400px;
  max-width: 90vw;
}

.export-description {
  text-align: center;
  color: var(--theme-text-muted);
  font-size: var(--theme-font-size-md);
  margin-bottom: var(--theme-spacing-lg);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-md);
}

.export-option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-xs);
  padding: 20px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  background: rgba(var(--theme-primary-rgb), 0.02);
  cursor: pointer;
  transition: all 0.25s ease;
}

.export-option-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  background: rgba(var(--theme-primary-rgb), 0.05);
  transform: translateY(-2px);
  box-shadow: var(--theme-shadow);
}

.export-option-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-label {
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  color: var(--theme-text-primary);
}

.export-desc {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-muted);
}

.export-loading {
  text-align: center;
  padding: var(--theme-spacing-md);
  margin-top: var(--theme-spacing-md);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(var(--theme-primary-rgb), 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--theme-spacing-sm);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-accent), var(--theme-primary-light));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.loading-text {
  color: var(--theme-accent);
  font-size: var(--theme-font-size-md);
}

/* ==================== 滚动条样式 ==================== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(var(--theme-primary-rgb), 0.04);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--theme-accent);
  border-radius: 3px;
  opacity: 0.6;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--theme-accent-dark);
  opacity: 1;
}
</style>
