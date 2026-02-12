<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue';
import RecordForm from './components/RecordForm.vue';
import RecordList from './components/RecordList.vue';
import SplashScreen from './components/SplashScreen.vue';
import type { Record, Statistics, RecordHistory } from './types/database';
import type { ThemeType } from './composables/useTheme';
import { getLunarDisplay } from './utils/lunarCalendar';
import { exportToExcel, exportToPDF } from './utils/export';
import { useTheme } from './composables/useTheme';
import { useAppConfig } from './composables/useAppConfig';

// ==================== 启动页和配置 ====================
const { setTheme, applyThemeToDocument } = useTheme();
const { config, setEventName, setCurrentDbPath, generateFileName, addToRecentBooks, removeFromRecentBooks, initConfig } = useAppConfig();

// 启动页状态
const showSplashScreen = ref(true);
const isAppReady = ref(false);

// ==================== 数据状态 ====================
const records = ref<Record[]>([]);
const statistics = ref<Statistics>({
  totalCount: 0,
  totalAmount: 0,
  cashAmount: 0,
  wechatAmount: 0,
  internalAmount: 0,
});
const recordListRef = shallowRef<InstanceType<typeof RecordList>>();
const recordFormRef = shallowRef<InstanceType<typeof RecordForm>>();
const appName = ref('电子礼金簿');
const isEditingName = ref(false);
const lunarDate = ref(getLunarDisplay());
const hideAmount = ref(true);
const intervalId = ref<number | null>(null);
const showStatisticsModal = ref(false);
const showEditHistoryModal = ref(false);
const editHistoryList = ref<RecordHistory[]>([]);

// 搜索弹窗状态
const showSearchModal = ref(false);
const searchKeyword = ref('');
const searchResults = ref<Record[]>([]);
const isSearching = ref(false);

// 导出弹窗状态
const showExportModal = ref(false);
const isExporting = ref(false);

// ==================== 方法函数 ====================
const loadRecords = async () => {
  try {
    const response = await window.db.getAllRecords();
    if (response.success && response.data) {
      // 将数据反转，使最新数据在前
      records.value = response.data.map((record: any) => ({
        id: record.Id,
        guestName: record.GuestName,
        amount: record.Amount,
        amountChinese: record.AmountChinese,
        itemDescription: record.ItemDescription,
        paymentType: record.PaymentType,
        remark: record.Remark,
        createTime: record.CreateTime,
        updateTime: record.UpdateTime,
        isDeleted: record.IsDeleted,
      })).reverse(); // 反转数组，最新数据在前
    } else if (!response.success) {
      alert('加载记录失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('加载记录失败:', error);
    alert('加载记录失败，请检查数据库连接');
  }
};

const loadStatistics = async () => {
  try {
    const response = await window.db.getStatistics();
    if (response.success && response.data) {
      statistics.value = response.data;
    } else if (!response.success) {
      console.error('加载统计失败:', response.error);
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

const handleSubmit = async (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) => {
  try {
    const dbRecord = {
      GuestName: record.guestName.trim(),
      Amount: record.amount,
      AmountChinese: record.amountChinese || null,
      ItemDescription: record.itemDescription?.trim() || null,
      PaymentType: record.paymentType,
      Remark: record.remark?.trim() || null,
      IsDeleted: 0,
    };
    const response = await window.db.insertRecord(dbRecord as any);
    if (response.success) {
      await loadRecords();
      await loadStatistics();
      setTimeout(() => {
        recordListRef.value?.goToLastPage();
      }, 100);
    } else {
      alert('保存失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('保存记录失败:', error);
    alert('保存失败，请重试');
  }
};

// 编辑记录 - 将数据填充到录入表单
const handleEdit = (record: Record) => {
  // 调用 RecordForm 的 enterEditMode 方法
  recordFormRef.value?.enterEditMode(record);
};

// 更新记录
const handleUpdate = async (record: Record) => {
  try {
    const dbRecord = {
      Id: record.id,
      GuestName: record.guestName.trim(),
      Amount: record.amount,
      AmountChinese: record.amountChinese || null,
      ItemDescription: record.itemDescription?.trim() || null,
      PaymentType: record.paymentType,
      Remark: record.remark?.trim() || null,
      IsDeleted: record.isDeleted,
    };

    const response = await window.db.updateRecord(dbRecord as any);
    if (response.success) {
      await loadRecords();
      await loadStatistics();
    } else {
      alert('更新失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('更新记录失败:', error);
    alert('更新失败，请重试');
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这条记录吗？')) return;
  try {
    const response = await window.db.softDeleteRecord(id);
    if (response.success) {
      await loadRecords();
      await loadStatistics();
    } else {
      alert('删除失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除记录失败:', error);
    alert('删除失败，请重试');
  }
};

const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const displayAmount = computed(() => {
  if (hideAmount.value) {
    return '****';
  }
  return formatMoney(statistics.value.totalAmount);
});

const toggleAmountDisplay = () => {
  hideAmount.value = !hideAmount.value;
};

const openStatisticsModal = () => {
  showStatisticsModal.value = true;
};

const closeStatisticsModal = () => {
  showStatisticsModal.value = false;
};

const openEditHistoryModal = async () => {
  try {
    const response = await window.db.getAllRecordHistory();
    if (response.success && response.data) {
      editHistoryList.value = response.data;
      showEditHistoryModal.value = true;
    } else {
      alert('加载修改记录失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('加载修改记录失败:', error);
    alert('加载修改记录失败');
  }
};

const closeEditHistoryModal = () => {
  showEditHistoryModal.value = false;
};

// 功能处理函数
const handleSave = () => { alert('数据已自动保存'); };

// TODO: 导入导出功能待实现
// const handleImport = () => { alert('导入功能开发中...'); };

// 打开导出弹窗
const handleExport = () => {
  showExportModal.value = true;
};

// 关闭导出弹窗
const closeExportModal = () => {
  showExportModal.value = false;
};

// 导出为 Excel
const handleExportExcel = async () => {
  if (records.value.length === 0) {
    alert('没有可导出的记录');
    return;
  }

  isExporting.value = true;
  try {
    // 使用事务名称作为文件名
    exportToExcel(records.value, appName.value);
    closeExportModal();
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    alert('导出 Excel 失败，请重试');
  } finally {
    isExporting.value = false;
  }
};

// 导出为 PDF
const handleExportPDF = async () => {
  if (records.value.length === 0) {
    alert('没有可导出的记录');
    return;
  }

  isExporting.value = true;
  try {
    // 获取当前主题色（从 CSS 变量）
    const rootStyles = getComputedStyle(document.documentElement);
    const theme = {
      primary: rootStyles.getPropertyValue('--theme-primary').trim() || '#c44a3d',
      paper: rootStyles.getPropertyValue('--theme-paper').trim() || '#f5f0e8',
      textPrimary: rootStyles.getPropertyValue('--theme-text-primary').trim() || '#333333',
      accent: rootStyles.getPropertyValue('--theme-accent').trim() || '#eb564a',
    };
    
    // 使用事务名称作为文件名
    await exportToPDF(records.value, appName.value, theme);
    closeExportModal();
  } catch (error) {
    console.error('导出 PDF 失败:', error);
    alert('导出 PDF 失败，请重试');
  } finally {
    isExporting.value = false;
  }
};

const handleEditClick = () => { openEditHistoryModal(); };

// 打开搜索弹窗
const handleSearch = () => {
  showSearchModal.value = true;
  searchKeyword.value = '';
  searchResults.value = [];
};

// 关闭搜索弹窗
const closeSearchModal = () => {
  showSearchModal.value = false;
  searchKeyword.value = '';
  searchResults.value = [];
};

// 执行搜索
const performSearch = async () => {
  if (!searchKeyword.value.trim()) {
    alert('请输入搜索关键词');
    return;
  }

  isSearching.value = true;
  try {
    const response = await window.db.searchRecords(searchKeyword.value.trim());
    if (response.success && response.data) {
      searchResults.value = response.data.map((record: any) => ({
        id: record.Id,
        guestName: record.GuestName,
        amount: record.Amount,
        amountChinese: record.AmountChinese,
        itemDescription: record.ItemDescription,
        paymentType: record.PaymentType,
        remark: record.Remark,
        createTime: record.CreateTime,
        updateTime: record.UpdateTime,
        isDeleted: record.IsDeleted,
      }));
    } else {
      alert('搜索失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('搜索失败:', error);
    alert('搜索失败，请重试');
  } finally {
    isSearching.value = false;
  }
};

// 点击搜索结果跳转到对应记录
const handleSearchResultClick = (record: Record) => {
  closeSearchModal();
  // 使用 nextTick 确保弹窗关闭后再跳转
  setTimeout(() => {
    const success = recordListRef.value?.goToRecord(record.id || 0);
    if (!success) {
      alert('未找到该记录，可能已被删除');
    }
  }, 100);
};

// ==================== 启动页处理函数 ====================

// 处理启动页开始事件
const handleSplashStart = async (data: { eventName: string; theme: ThemeType; action: 'new' | 'open' | 'import'; filePath?: string }) => {
  // 设置主题
  setTheme(data.theme, true);
  
  // 设置事务名称
  appName.value = data.eventName;
  setEventName(data.eventName);
  
  if (data.action === 'new') {
    // 新建礼金簿
    await handleCreateNewBook(data.eventName);
  } else if (data.action === 'open' && data.filePath) {
    // 打开已有数据
    await handleOpenExistingBook(data.filePath, data.eventName);
  // 移除 import 分支，因为 handleSplashStart 函数不支持 import 动作

  }
  
  // 隐藏启动页，显示主应用
  showSplashScreen.value = false;
  isAppReady.value = true;
  
  // 加载数据
  await loadRecords();
  await loadStatistics();
};

// 新建礼金簿
const handleCreateNewBook = async (eventName: string) => {
  try {
    // 如果有当前数据，先保存
    if (records.value.length > 0 && config.value.currentDbPath) {
      const currentFileName = generateFileName(config.value.eventName);
      // 重命名当前数据库文件
      await window.electronAPI.saveCurrentDatabase(currentFileName);
      addToRecentBooks(config.value.eventName, config.value.currentDbPath);
    }
    
    // 生成新文件名
    const newFileName = generateFileName(eventName);
    
    // 创建新的数据库
    const response = await window.electronAPI.createNewDatabase(newFileName);
    if (response.success && response.data?.filePath) {
      setCurrentDbPath(response.data.filePath);
      addToRecentBooks(eventName, response.data.filePath);
      records.value = [];
      statistics.value = {
        totalCount: 0,
        totalAmount: 0,
        cashAmount: 0,
        wechatAmount: 0,
        internalAmount: 0,
      };
    } else {
      alert('创建新数据库失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('新建礼金簿失败:', error);
    alert('新建礼金簿失败，请重试');
  }
};

// 打开已有数据
const handleOpenExistingBook = async (filePath: string, eventName: string) => {
  try {
    // 先保存当前数据（如果有）
    if (records.value.length > 0 && config.value.currentDbPath) {
      const currentFileName = generateFileName(config.value.eventName);
      await window.electronAPI.saveCurrentDatabase(currentFileName);
    }
    
    // 切换到选中的数据库
    const response = await window.electronAPI.switchDatabase(filePath);
    if (response.success) {
      // 从文件名中提取事务名称
      const fileName = filePath.split(/[\\/]/).pop() || '';
      const extractedEventName = fileName.replace(/\.db$/i, '');
      
      // 使用提取的名称或传入的名称
      const finalEventName = eventName || extractedEventName || '电子礼金簿';
      appName.value = finalEventName;
      setEventName(finalEventName);
      setCurrentDbPath(filePath);
      addToRecentBooks(finalEventName, filePath);
    } else {
      alert('打开数据库失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('打开已有数据失败:', error);
    alert('打开已有数据失败，请重试');
  }
};

// 导入数据
const handleImportData = async (data: { eventName: string; records: any[] }) => {
  try {
    // 先保存当前数据（如果有）
    if (records.value.length > 0 && config.value.currentDbPath) {
      const currentFileName = generateFileName(config.value.eventName);
      await window.electronAPI.saveCurrentDatabase(currentFileName);
    }

    // 创建新的数据库用于导入
    const newFileName = generateFileName(data.eventName);
    const response = await window.electronAPI.createNewDatabase(newFileName);
    if (response.success && response.data?.filePath) {
      setCurrentDbPath(response.data.filePath);
      addToRecentBooks(data.eventName, response.data.filePath);

      // 转换记录格式并批量插入
      const dbRecords = data.records.map(record => ({
        GuestName: record.guestName,
        Amount: record.amount,
        AmountChinese: record.amountChinese || null,
        ItemDescription: record.itemDescription || null,
        PaymentType: record.paymentType,
        Remark: record.remark || null,
        CreateTime: record.createTime || new Date().toISOString(),
        IsDeleted: 0
      }));

      // 批量插入记录
      if (dbRecords.length > 0) {
        for (const record of dbRecords) {
          const insertResponse = await window.db.insertRecord(record as any);
          if (!insertResponse.success) {
            alert('导入记录失败: ' + (insertResponse.error || '未知错误'));
            return;
          }
        }
      }

      // 设置应用名称
      appName.value = data.eventName;
      setEventName(data.eventName);

      // 隐藏启动页，显示主应用
      showSplashScreen.value = false;
      isAppReady.value = true;

      // 加载数据
      await loadRecords();
      await loadStatistics();

      alert(`成功导入 ${data.records.length} 条记录`);
    } else {
      alert('创建新数据库失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('导入数据失败:', error);
    alert('导入数据失败，请重试');
  }
};

// 返回启动页
const handleBackToSplash = async () => {
  try {
    // 保存当前数据（如果有）
    if (records.value.length > 0 && config.value.currentDbPath) {
      const currentFileName = generateFileName(config.value.eventName);
      await window.electronAPI.saveCurrentDatabase(currentFileName);
    }
    
    // 重置状态
    isAppReady.value = false;
    showSplashScreen.value = true;
    records.value = [];
    statistics.value = {
      totalCount: 0,
      totalAmount: 0,
      cashAmount: 0,
      wechatAmount: 0,
      internalAmount: 0,
    };
  } catch (error) {
    console.error('返回启动页失败:', error);
    alert('返回启动页失败，请重试');
  }
};

// 删除文件处理
const handleDeleteFile = (filePath: string) => {
  // 从最近列表中移除
  removeFromRecentBooks(filePath);
};

// 扫描 data 目录获取文件列表
const scanDataDirectory = async () => {
  try {
    const response = await window.electronAPI.getRecentDatabases();
    if (response.success && response.data?.recentDatabases) {
      // 更新最近列表
      config.value.recentBooks = response.data.recentDatabases;
    }
  } catch (error) {
    console.error('扫描数据目录失败:', error);
  }
};

onMounted(async () => {
  // 初始化配置
  initConfig();
  
  // 应用保存的主题
  if (config.value.theme) {
    applyThemeToDocument(config.value.theme);
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
});
</script>

<template>
  <!-- 启动页 -->
  <SplashScreen
    v-if="showSplashScreen"
    :default-event-name="config.eventName"
    :default-theme="config.theme"
    :recent-files="config.recentBooks"
    @start="handleSplashStart"
    @delete-file="handleDeleteFile"
    @import="handleImportData"
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
        <img src="/images/logo.png" alt="Logo" class="app-logo" />
        <div class="app-name-wrapper">
          <input v-if="isEditingName" v-model="appName" @blur="isEditingName = false" 
                 @keyup.enter="isEditingName = false" class="app-name-input" type="text" />
          <h1 v-else class="app-name" @click="isEditingName = true" title="点击修改">
            {{ appName }}
          </h1>
        </div>
      </div>

      <!-- 中间：功能按钮 -->
      <div class="header-center">
        <!-- TODO: 导入导出功能待实现，暂时隐藏
        <button class="func-btn" @click="handleImport">
          <span class="btn-icon">📥</span><span class="btn-text">导入</span>
        </button>
        -->
        <button class="func-btn" @click="handleSave">
          <span class="btn-icon">💾</span><span class="btn-text">保存</span>
        </button>
        <button class="func-btn" @click="handleExport">
          <span class="btn-icon">📤</span><span class="btn-text">导出</span>
        </button>
        <button class="func-btn" @click="handleEditClick">
          <span class="btn-icon">✏️</span><span class="btn-text">修改记录</span>
        </button>
        <button class="func-btn" @click="openStatisticsModal">
          <span class="btn-icon">📊</span><span class="btn-text">统计</span>
        </button>
        <button class="func-btn" @click="handleSearch">
          <span class="btn-icon">🔍</span><span class="btn-text">搜索</span>
        </button>
        <button class="func-btn" @click="handleBackToSplash">
          <span class="btn-icon">🏠</span><span class="btn-text">返回首页</span>
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
          <RecordForm ref="recordFormRef" @submit="handleSubmit" @update="handleUpdate" />
        </div>

        <!-- 统计面板 -->
        <div class="statistics-panel">
          <div class="stat-vertical">
            <div class="stat-row">
              <span class="stat-value">{{ statistics.totalCount }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-value amount-total" @click="toggleAmountDisplay" style="cursor: pointer;">
                {{ displayAmount }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 统计详情弹窗 -->
    <div v-if="showStatisticsModal" class="modal-overlay" @click="closeStatisticsModal">
      <div class="modal-content statistics-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">统计详情</h3>
          <button class="modal-close" @click="closeStatisticsModal">×</button>
        </div>
        <div class="modal-body">
          <div class="stat-detail-grid">
            <div class="stat-detail-item">
              <span class="stat-detail-label">人数</span>
              <span class="stat-detail-value">{{ statistics.totalCount }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">总金额</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.totalAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">现金</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.cashAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">微信</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.wechatAmount) }}</span>
            </div>
            <div class="stat-detail-item">
              <span class="stat-detail-label">内收</span>
              <span class="stat-detail-value">{{ formatMoney(statistics.internalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改记录弹窗 -->
    <div v-if="showEditHistoryModal" class="modal-overlay" @click="closeEditHistoryModal">
      <div class="modal-content edit-history-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">修改记录</h3>
          <button class="modal-close" @click="closeEditHistoryModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="editHistoryList.length === 0" class="empty-history">
            暂无修改记录
          </div>
          <div v-else class="history-list">
            <div v-for="(history, index) in editHistoryList" :key="index" class="history-item" :class="{ 'deleted-item': history.operationType === 'DELETE' }">
              <div class="history-header">
                <span class="history-name">{{ history.guestName }}</span>
                <span class="history-time">{{ history.updateTime }}</span>
                <span v-if="history.operationType === 'DELETE'" class="delete-badge">已删除</span>
              </div>
              <div class="history-changes">
                <!-- 删除记录显示删除前数据 -->
                <template v-if="history.operationType === 'DELETE'">
                  <div class="change-row">
                    <span class="change-label">删除前：</span>
                    <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}</span>
                  </div>
                </template>
                <!-- 修改记录显示前后对比 -->
                <template v-else>
                  <div class="change-row">
                    <span class="change-label">修改前：</span>
                    <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}</span>
                  </div>
                  <div class="change-row">
                    <span class="change-label">修改后：</span>
                    <span class="change-value new-value">{{ history.newGuestName }} - {{ formatMoney(history.newAmount || 0) }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索弹窗 -->
    <div v-if="showSearchModal" class="modal-overlay" @click="closeSearchModal">
      <div class="modal-content search-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">搜索记录</h3>
          <button class="modal-close" @click="closeSearchModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 搜索输入区 -->
          <div class="search-input-area">
            <input
              v-model="searchKeyword"
              type="text"
              class="search-input"
              placeholder="请输入姓名、备注或物品进行搜索..."
              @keyup.enter="performSearch"
            />
            <button class="search-btn" @click="performSearch" :disabled="isSearching">
              {{ isSearching ? '搜索中...' : '搜索' }}
            </button>
          </div>

          <!-- 搜索结果区 -->
          <div class="search-results">
            <div v-if="searchResults.length === 0 && searchKeyword && !isSearching" class="empty-results">
              未找到匹配的记录
            </div>
            <div v-else-if="searchResults.length > 0" class="results-list">
              <div
                v-for="record in searchResults"
                :key="record.id"
                class="result-item"
                @click="handleSearchResultClick(record)"
              >
                <div class="result-main">
                  <span class="result-name">{{ record.guestName }}</span>
                  <span class="result-amount">{{ formatMoney(record.amount) }}</span>
                </div>
                <div class="result-sub">
                  <span v-if="record.itemDescription" class="result-item-desc">物品：{{ record.itemDescription }}</span>
                  <span v-if="record.remark" class="result-remark">备注：{{ record.remark }}</span>
                </div>
              </div>
            </div>
            <div v-else class="search-hint">
              输入关键词后点击搜索，支持模糊匹配姓名、备注和物品
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出弹窗 -->
    <div v-if="showExportModal" class="modal-overlay" @click="closeExportModal">
      <div class="modal-content export-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">导出数据</h3>
          <button class="modal-close" @click="closeExportModal">×</button>
        </div>
        <div class="modal-body">
          <p class="export-description">
            选择导出格式，共 {{ records.length }} 条记录
          </p>
          <div class="export-options">
            <button
              class="export-option-btn"
              @click="handleExportExcel"
              :disabled="isExporting || records.length === 0"
            >
              <span class="export-icon">📊</span>
              <span class="export-label">导出为 Excel</span>
              <span class="export-desc">表格格式，适合数据分析</span>
            </button>
            <button
              class="export-option-btn"
              @click="handleExportPDF"
              :disabled="isExporting || records.length === 0"
            >
              <span class="export-icon">📄</span>
              <span class="export-label">导出为 PDF</span>
              <span class="export-desc">礼金簿样式，适合打印存档</span>
            </button>
          </div>
          <div v-if="isExporting" class="export-loading">
            <span class="loading-text">正在导出，请稍候...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 导入主题样式变量 */
@import './styles/theme.css';

/* ==================== 全局重置 ==================== */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: var(--theme-font-family);
  background: var(--theme-primary);
  overflow: hidden;
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
:global(.pdf-export-container) {
  font-family: 'Noto Serif SC', 'SimSun', 'STSong', serif;
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
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

:global(.pdf-date) {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
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
}

:global(.pdf-name-cell) {
  flex: 0 0 auto;
  height: 130px;
  min-height: 120px;
  justify-content: center;
}

:global(.pdf-name) {
  font-weight: bold;
  color: #333;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 3px;
  font-size: 28px;
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
  font-weight: bold;
  color: #333;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 2px;
  line-height: 1.5;
  font-size: 22px;
}

:global(.pdf-item-desc) {
  font-size: 10px;
  color: #666;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 1px;
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
}

:global(.pdf-amount-number) {
  font-size: 10px;
  color: #666;
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
  最外层容器
  ========================================
  - height: 100vh 占满整个视口高度
  - display: flex + flex-direction: column 垂直排列
  - background: 使用主题主色
*/
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--theme-primary);
  overflow: hidden;
}

/* 
  ========================================
  【顶部导航栏】
  ========================================
  布局属性：
  - display: flex 弹性布局
  - justify-content: space-between 左右分散对齐
  - align-items: center 垂直居中
  - padding: 上下间距 左右间距
  - box-shadow: 阴影效果
  
  调整建议：
  - 修改高度：调整 padding 值（如 16px 32px）
  - 修改背景：调整 background
  - 修改阴影：调整 box-shadow
*/
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-xl);  /* 上下 16px, 左右 32px */
  background: var(--theme-paper);
  box-shadow: var(--theme-shadow);
  z-index: 100;
}

/* 【导航栏左侧】Logo和名称 */
.header-left {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-md);  /* 元素间距 16px */
}

.app-logo {
  width: 40px;    /* Logo宽度 */
  height: 40px;   /* Logo高度 */
  object-fit: contain;
}

.app-name {
  color: var(--theme-text-primary);
  font-size: var(--theme-font-size-xxl);  /* 28px */
  font-weight: bold;
  font-family: var(--theme-font-family);
  cursor: pointer;
}

.app-name-input {
  font-size: var(--theme-font-size-xxl);
  padding: var(--theme-spacing-xs) var(--theme-spacing-sm);
  border: 1px solid var(--theme-accent);
  border-radius: var(--theme-border-radius);
  background: var(--theme-text-primary);
  color: var(--theme-text-primary);
  width: 200px;   /* 输入框宽度 */
}

/* 【导航栏中间】功能按钮组 */
.header-center {
  display: flex;
  gap: var(--theme-spacing-sm);  /* 按钮间距 8px */
}

.func-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--theme-spacing-sm) var(--theme-spacing-md);  /* 按钮内边距 */
  border: none;
  border-radius: var(--theme-border-radius);
  background: transparent;
  color: var(--theme-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.func-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);  /* 悬停上浮效果 */
}

.btn-icon { font-size: 20px; }
.btn-text { font-size: var(--theme-font-size-xs); }  /* 12px */

/* 【导航栏右侧】农历日期 */
.header-right { text-align: right; }

.lunar-date {
  color: var(--theme-text-primary);
  font-family: var(--theme-font-family);
}

.lunar-primary {
  font-size: var(--theme-font-size-lg);  /* 20px */
  font-weight: bold;
}

.lunar-secondary {
  font-size: var(--theme-font-size-xs);  /* 12px */
  opacity: 0.8;
  margin-top: 2px;
}

/* 
  ========================================
  【主内容区】
  ========================================
  布局属性：
  - flex: 1 占据剩余所有空间
  - display: flex 左右两栏布局
  - gap: 左右栏间距 24px
  - padding: 内边距 24px
  
  调整建议：
  - 修改左右栏间距：调整 gap
  - 修改内边距：调整 padding
*/
.main-content {
  flex: 1;        /* 占据剩余空间 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: flex-start; /* 垂直顶部对齐 */
  gap: var(--theme-spacing-lg);          /* 24px */
  padding: var(--theme-spacing-lg);      /* 24px */
  overflow: hidden;
}

/* 【左侧】礼金簿展示区 */
.giftbook-section {
  flex: 1;        /* 自适应宽度 */
  min-width: 0;   /* 防止内容撑开 */
  max-width: 1163px; /* 最大宽度限制 */
  overflow: hidden;
}

/* 【右侧】边栏 */
.sidebar-section {
  width: 208px;   /* 固定宽度，可调整 */
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-lg);          /* 面板间距 24px */
  overflow-y: auto;
}

/*
  ========================================
  【统计面板】
  ========================================
  - background: 背景色（使用主题纸张色）
  - border-radius: 圆角
  - padding: 内边距
  - box-shadow: 阴影
*/
.statistics-panel {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);   /* 8px */
  padding: 11px;            /* 11px */
  box-shadow: var(--theme-shadow);
}

/* 统计垂直布局：上下排列 */
.stat-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--theme-spacing-xs);    /* 4px */
  margin-bottom: var(--theme-spacing-md);
}

.stat-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-xs);
   /*background: rgba(235, 86, 74, 0.1);  淡红色背景 */
  border-radius: var(--theme-border-radius);
  width: 100%;
}

.stat-value {
  font-size: var(--theme-font-size-md);   /* 16px */
  font-weight: bold;
  color: var(--theme-text-primary);
}

.amount-total {
  font-size: var(--theme-font-size-md);   /* 16px */
  color: var(--theme-primary);
}

.toggle-btn {
  width: 100%;
  padding: var(--theme-spacing-sm);
  border: 1px solid var(--theme-primary);
  border-radius: var(--theme-border-radius);
  background: var(--theme-primary);
  color: var(--theme-text-light);
  font-family: var(--theme-font-family);
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn:hover { background: var(--theme-primary-dark); }

/* 【录入表单面板】 */
.form-panel {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-lg);
  box-shadow: var(--theme-shadow);
  flex: 1;        /* 占据剩余空间 */
}

/*
  ========================================
  【统计详情弹窗】
  ========================================
*/
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
  z-index: 1000;
}

.modal-content {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  min-width: 400px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);
  border-bottom: 1px solid var(--theme-border);
}

.modal-title {
  font-size: var(--theme-font-size-lg);
  color: var(--theme-text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--theme-border-radius);
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--theme-text-primary);
}

.modal-body {
  padding: var(--theme-spacing-lg);
}

.stat-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--theme-spacing-md);
}

.stat-detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--theme-spacing-md);
  background: rgba(235, 86, 74, 0.1);
  border-radius: var(--theme-border-radius);
  gap: 8px;
}

.stat-detail-item:first-child,
.stat-detail-item:nth-child(2) {
  grid-column: span 2;
}

.stat-detail-label {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

.stat-detail-value {
  font-size: var(--theme-font-size-lg);
  font-weight: bold;
  color: var(--theme-text-primary);
}

/*
  ========================================
  【修改记录弹窗】
  ========================================
*/
.edit-history-modal {
  min-width: 500px;
  max-width: 90vw;
  max-height: 80vh;
}

.edit-history-modal .modal-body {
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.empty-history {
  text-align: center;
  padding: var(--theme-spacing-xl);
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-md);
}

.history-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-md);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--theme-spacing-sm);
  padding-bottom: var(--theme-spacing-sm);
  border-bottom: 1px solid rgba(235, 86, 74, 0.1);
}

.history-name {
  font-weight: bold;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.history-time {
  font-size: var(--theme-font-size-xs);
  color: var(--theme-text-secondary);
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-xs);
}

.change-row {
  display: flex;
  gap: var(--theme-spacing-sm);
  font-size: var(--theme-font-size-sm);
}

.change-label {
  color: var(--theme-text-secondary);
  flex-shrink: 0;
}

.change-value {
  color: var(--theme-text-primary);
  word-break: break-all;
}

.change-value.new-value {
  color: var(--theme-primary);
  font-weight: bold;
}

/* 删除记录样式 */
.deleted-item {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.3);
}

.deleted-item .history-header {
  border-bottom-color: rgba(239, 68, 68, 0.2);
}

.delete-badge {
  background: #ef4444;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
}

/*
  ========================================
  【搜索弹窗】
  ========================================
*/
.search-modal {
  min-width: 500px;
  max-width: 90vw;
  max-height: 80vh;
}

.search-modal .modal-body {
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.search-input-area {
  display: flex;
  gap: var(--theme-spacing-sm);
  margin-bottom: var(--theme-spacing-lg);
}

.search-input {
  flex: 1;
  padding: var(--theme-spacing-sm) var(--theme-spacing-md);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  font-size: var(--theme-font-size-md);
  font-family: var(--theme-font-family);
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.search-btn {
  padding: var(--theme-spacing-sm) var(--theme-spacing-lg);
  border: none;
  border-radius: var(--theme-border-radius);
  background: var(--theme-primary);
  color: var(--theme-text-light);
  font-size: var(--theme-font-size-md);
  font-family: var(--theme-font-family);
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  background: var(--theme-primary-dark);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-results {
  min-height: 200px;
}

.empty-results,
.search-hint {
  text-align: center;
  padding: var(--theme-spacing-xl);
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-sm);
}

.result-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-md);
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: rgba(235, 86, 74, 0.1);
  border-color: var(--theme-accent);
  transform: translateX(4px);
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--theme-spacing-xs);
}

.result-name {
  font-weight: bold;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.result-amount {
  font-size: var(--theme-font-size-md);
  color: var(--theme-primary);
  font-weight: bold;
}

.result-sub {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item-desc,
.result-remark {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

/*
  ========================================
  【导出弹窗】
  ========================================
*/
.export-modal {
  min-width: 400px;
  max-width: 90vw;
}

.export-description {
  text-align: center;
  color: var(--theme-text-secondary);
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
  padding: var(--theme-spacing-lg);
  border: 2px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  background: var(--theme-paper);
  cursor: pointer;
  transition: all 0.3s;
}

.export-option-btn:hover:not(:disabled) {
  border-color: var(--theme-accent);
  background: rgba(235, 86, 74, 0.05);
  transform: translateY(-2px);
}

.export-option-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-icon {
  font-size: 32px;
}

.export-label {
  font-size: var(--theme-font-size-lg);
  font-weight: bold;
  color: var(--theme-text-primary);
}

.export-desc {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
}

.export-loading {
  text-align: center;
  padding: var(--theme-spacing-md);
  margin-top: var(--theme-spacing-md);
}

.loading-text {
  color: var(--theme-primary);
  font-size: var(--theme-font-size-md);
}

/* ==================== 滚动条样式 ==================== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: var(--theme-accent); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--theme-accent-dark); }
</style>
