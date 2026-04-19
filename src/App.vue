<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef, nextTick, watch } from 'vue';
import RecordForm from './components/RecordForm.vue';
import RecordList from './components/RecordList.vue';
import HomeView from './components/home/HomeView.vue';
import SyncQRDialog from './components/SyncQRDialog.vue';
import type { Record, Statistics, RecordHistory } from './types/database';
import type { ThemeType } from './types/theme';
import { getLunarDisplay } from './utils/lunarCalendar';
import { exportToExcel, exportToPDF } from './utils/export';
import { useTheme } from './composables/useTheme';
import { useAppConfig } from './composables/useAppConfig';
import { useFullscreenScale } from './composables/useFullscreenScale';
import Toast from './components/Toast.vue';
import EditHistoryModal from './components/business/EditHistoryModal.vue';
import StatisticsModal from './components/business/StatisticsModal.vue';
import SearchModal from './components/business/SearchModal.vue';
import ExportModal from './components/business/ExportModal.vue';
import AboutDialog from './components/AboutDialog.vue';
import StyleCustomizeDialog from './components/StyleCustomizeDialog.vue';
import IconSvg from './components/IconSvg.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

// ==================== 启动页和配置 ====================
const { setTheme, applyThemeToDocument, currentTheme } = useTheme();
const { config, setEventName, setCurrentDbPath, generateFileName, addToRecentBooks, removeFromRecentBooks, initConfig, setDisplayStyle, setCustomFont, setEventDate } = useAppConfig();

// 重命名数据库后更新最近列表
const renameRecentBook = (oldPath: string, newName: string, newPath: string) => {
  // 先移除旧路径
  removeFromRecentBooks(oldPath);
  // 添加新路径
  addToRecentBooks(newName, newPath);
};
const { initFullscreenScale, destroyFullscreenScale } = useFullscreenScale();

// Toast 组件引用
const toastRef = ref<InstanceType<typeof Toast> | null>(null);

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

// 启动页状态
const showSplashScreen = ref(true);
const isAppReady = ref(false);

// ==================== 数据状态 ====================
// 使用 shallowRef 优化性能，避免深层响应式导致的过度渲染
const records = shallowRef<Record[]>([]);
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
const intervalId = ref<number | null>(null);
const showStatisticsModal = ref(false);
const showEditHistoryModal = ref(false);
const editHistoryList = ref<RecordHistory[]>([]);

// 当前预览状态（单字段模式）
const currentPreview = ref({
  field: '',  // 当前字段名
  value: ''   // 当前值
});

// 计算预览显示文本
const previewText = computed(() => {
  return currentPreview.value.value || '\u00A0';
});

// 分页状态
const currentPage = ref(1);

// 搜索弹窗状态
const showSearchModal = ref(false);
const searchKeyword = ref('');
const searchResults = ref<Record[]>([]);
const isSearching = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// 导出弹窗状态
const showExportModal = ref(false);
const isExporting = ref(false);

// 关于弹窗状态
const showAboutDialog = ref(false);

// 样式自定义弹窗状态
const showStyleDialog = ref(false);

// 同步到小程序弹窗状态
const syncDialogVisible = ref(false);

// 搜索关键词自动搜索（防抖）
watch(searchKeyword, (newKeyword) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    if (newKeyword.trim()) {
      performSearch();
    } else {
      searchResults.value = [];
    }
  }, 300);
});

// ==================== 方法函数 ====================
const loadRecords = async (keepCurrentPage: boolean = false, newRecordId?: number) => {
  try {
    const response = await window.db.getAllRecords();
    if (response.success && response.data) {
      const newRecords = response.data.map((record: any) => ({
        id: record.id,
        guestName: record.guestName,
        amount: record.amount,
        amountChinese: record.amountChinese,
        itemDescription: record.itemDescription,
        paymentType: record.paymentType,
        remark: record.remark,
        createTime: record.createTime,
        updateTime: record.updateTime,
        isDeleted: record.isDeleted,
      }));
      
      const currentRecords = records.value;
      
      // 如果是添加新记录后的加载，尝试增量更新
      if (newRecordId && currentRecords.length > 0) {
        const existingIds = new Set(currentRecords.map(r => r.id));
        const addedRecords = newRecords.filter((r: Record) => !existingIds.has(r.id));
        
        if (addedRecords.length > 0) {
          // 只添加新记录，保留现有记录引用
          records.value = [...currentRecords, ...addedRecords];
        } else if (newRecords.length !== currentRecords.length) {
          // 如果记录数量变化但没有找到新记录，可能是删除或批量操作
          records.value = newRecords;
        } else {
          // 记录数量相同，可能是更新操作，强制刷新
          records.value = newRecords;
        }
      } else {
        // 首次加载或强制刷新
        records.value = newRecords;
      }
      
      // 加载记录后，默认跳转到最后一页（显示最新的数据）
      // 如果 keepCurrentPage 为 true，则保持当前页码（用于添加记录后）
      if (!keepCurrentPage) {
        const totalPages = Math.max(1, Math.ceil(records.value.length / 15));
        currentPage.value = totalPages;
      } else {
        // 保持当前页码，但确保不超过总页数
        const totalPages = Math.max(1, Math.ceil(records.value.length / 15));
        if (currentPage.value > totalPages) {
          currentPage.value = totalPages;
        }
      }
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

// ==================== 增量更新函数 ====================

/**
 * 新增记录增量更新
 * 添加新记录到数组末尾，并跳转到新记录所在页面
 */
const addRecordIncrementally = async (newRecordId: number) => {
  try {
    const response = await window.db.getRecordById(newRecordId);
    if (response.success && response.data) {
      const dbRecord = response.data as any;
      const newRecord = {
        id: dbRecord.id,
        guestName: dbRecord.guestName,
        amount: dbRecord.amount,
        amountChinese: dbRecord.amountChinese,
        itemDescription: dbRecord.itemDescription,
        paymentType: dbRecord.paymentType,
        remark: dbRecord.remark,
        createTime: dbRecord.createTime,
        updateTime: dbRecord.updateTime,
        isDeleted: dbRecord.isDeleted,
      };
      
      records.value = [...records.value, newRecord];
      
      await loadStatistics();
      
      // 跳转到新记录所在的页面（新记录在数组末尾，即最后一页）
      const totalPages = Math.max(1, Math.ceil(records.value.length / 15));
      currentPage.value = totalPages;
      
      await nextTick();
      recordListRef.value?.markNewRecord(newRecordId);
    }
  } catch (error) {
    console.error('增量添加记录失败:', error);
    await loadRecords(true);
  }
};

/**
 * 修改记录增量更新
 * 只更新对应记录，保持当前页码和显示位置
 */
const updateRecordIncrementally = async (updatedRecordId: number) => {
  try {
    const response = await window.db.getRecordById(updatedRecordId);
    if (response.success && response.data) {
      const dbRecord = response.data as any;
      const updatedRecord = {
        id: dbRecord.id,
        guestName: dbRecord.guestName,
        amount: dbRecord.amount,
        amountChinese: dbRecord.amountChinese,
        itemDescription: dbRecord.itemDescription,
        paymentType: dbRecord.paymentType,
        remark: dbRecord.remark,
        createTime: dbRecord.createTime,
        updateTime: dbRecord.updateTime,
        isDeleted: dbRecord.isDeleted,
      };
      
      const index = records.value.findIndex(r => r.id === updatedRecordId);
      
      if (index !== -1) {
        const newRecords = [...records.value];
        newRecords[index] = updatedRecord;
        records.value = newRecords;
      } else {
        await loadRecords(true);
      }
      
      await loadStatistics();
    } else {
      await loadRecords(true);
    }
  } catch (error) {
    console.error('增量更新记录失败:', error);
    await loadRecords(true);
  }
};

/**
 * 删除记录增量更新
 * 从数组中移除已删除的记录，保持当前页码
 */
const deleteRecordIncrementally = async (deletedRecordId: number) => {
  try {
    const oldLength = records.value.length;
    records.value = records.value.filter(r => r.id !== deletedRecordId);
    
    if (records.value.length < oldLength) {
      const totalPages = Math.max(1, Math.ceil(records.value.length / 15));
      if (currentPage.value > totalPages) {
        currentPage.value = totalPages;
      }
    }
    
    await loadStatistics();
  } catch (error) {
    console.error('增量删除记录失败:', error);
    await loadRecords(true);
  }
};

// 处理输入预览
const handleInputPreview = (field: string, value: string) => {
  currentPreview.value = { field, value };
};

// 清空预览
const clearPreview = () => {
  currentPreview.value = { field: '', value: '' };
};

const handleSubmit = async (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) => {
  try {
    const dbRecord = {
      guestName: record.guestName.trim(),
      amount: record.amount,
      amountChinese: record.amountChinese || null,
      itemDescription: record.itemDescription?.trim() || null,
      paymentType: record.paymentType,
      remark: record.remark?.trim() || null,
      isDeleted: 0,
    };
    const response = await window.db.insertRecord(dbRecord as any);
    if (response.success && response.data) {
      const newRecordId = response.data.id;
      // 使用增量更新，只添加新记录，保持当前显示位置
      await addRecordIncrementally(newRecordId);
      // 提交后清空预览
      clearPreview();
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
      id: record.id,
      guestName: record.guestName.trim(),
      amount: record.amount,
      amountChinese: record.amountChinese || null,
      itemDescription: record.itemDescription?.trim() || null,
      paymentType: record.paymentType,
      remark: record.remark?.trim() || null,
      isDeleted: record.isDeleted,
    };

    const response = await window.db.updateRecord(dbRecord as any);
    if (response.success) {
      // 使用增量更新，只更新修改的记录，保持当前显示位置
      // record.id 可能为 0，需要使用 !== null 和 !== undefined 判断
      if (record.id !== null && record.id !== undefined) {
        await updateRecordIncrementally(record.id);
      } else {
        // 如果record.id不存在，回退到全量刷新
        await loadRecords(true);
      }
    } else {
      alert('更新失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('更新记录失败:', error);
    alert('更新失败，请重试');
  }
};

const handleDelete = async (id: number) => {
  try {
    const response = await window.db.softDeleteRecord(id);
    if (response.success) {
      await deleteRecordIncrementally(id);
    } else {
      alert('删除失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除记录失败:', error);
    alert('删除失败，请重试');
  }
};

const formatMoney = (amount: number | undefined) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 计算当前页面的金额小计
const currentPageAmount = computed(() => {
  const start = (currentPage.value - 1) * 15;
  const end = start + 15;
  const pageRecords = records.value.slice(start, end);
  const total = pageRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
  return formatMoney(total);
});

const openStatisticsModal = () => {
  showStatisticsModal.value = true;
};

const closeStatisticsModal = () => {
  showStatisticsModal.value = false;
};

// ==================== 样式自定义相关 ====================
/**
 * 处理样式设置确认
 */
const handleStyleConfirm = (style: 'full' | 'compact') => {
  setDisplayStyle(style);
};

/**
 * 处理选择字体（CSS 字体名称）
 */
const handleSelectFont = (fontCssName: string) => {
  setCustomFont(fontCssName);
  // 应用自定义字体
  applyCustomFont(fontCssName);
  toastRef.value?.success('字体已应用');
};

/**
 * 处理重置字体
 */
const handleResetFont = () => {
  setCustomFont(null);
  // 移除自定义字体
  removeCustomFont();
  toastRef.value?.success('已恢复默认字体');
};

/**
 * 应用自定义字体（设置 CSS 变量）
 */
const applyCustomFont = (fontCssName: string) => {
  // 更新 CSS 变量中的字体
  document.documentElement.style.setProperty('--font-name-amount', `'${fontCssName}', 'SimSun', 'KaiTi', serif`);
};

/**
 * 移除自定义字体
 */
const removeCustomFont = () => {
  // 恢复默认字体（演示春风楷）
  document.documentElement.style.setProperty('--font-name-amount', "'演示春风楷', 'KaiTi', 'SimSun', serif");
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

// 定位到指定记录
const handleLocateRecord = async (recordId: number) => {
  // 关闭修改记录弹窗
  closeEditHistoryModal();

  try {
    // 查找记录所在页码
    const response = await window.db.getRecordPage(recordId, 15);
    if (response.success && response.data) {
      // 设置当前页码
      currentPage.value = response.data;

      // 等待页面渲染完成后高亮记录
      setTimeout(() => {
        recordListRef.value?.highlightRecord(recordId);
      }, 300);
    } else {
      // 记录可能已被删除或不存在
      toastRef.value?.error('无法定位到该记录，可能已被删除');
    }
  } catch (error) {
    console.error('定位记录失败:', error);
    toastRef.value?.error('定位记录失败');
  }
};

// 还原修改
const handleRevertRecord = async (history: RecordHistory) => {
  // 关闭修改记录弹窗
  closeEditHistoryModal();

  try {
    // 先获取当前记录数据（包含已删除的）
    const currentRecordResponse = await window.db.getRecordById(history.recordId);
    if (!currentRecordResponse.success) {
      throw new Error('无法获取当前记录');
    }

    // 构建还原后的记录数据
    const revertedRecord = {
      id: history.recordId,
      guestName: history.guestName || '',
      amount: history.amount || 0,
      amountChinese: currentRecordResponse.data?.amountChinese || null,
      itemDescription: history.itemDescription || null,
      paymentType: history.paymentType || 1,
      remark: history.remark || null,
      isDeleted: 0, // 还原时恢复为未删除状态
    };

    // 更新记录
    const response = await window.db.updateRecord(revertedRecord as any);
    if (response.success) {
      // 重新加载记录
      await loadRecords();
      await loadStatistics();

      // 显示成功提示
      toastRef.value?.success('还原成功！', 3000);

      // 查找记录所在页码并跳转
      const pageResponse = await window.db.getRecordPage(history.recordId, 15);
      if (pageResponse.success && pageResponse.data) {
        currentPage.value = pageResponse.data;

        // 等待页面渲染完成后高亮记录
        setTimeout(() => {
          recordListRef.value?.highlightRecord(history.recordId);
        }, 300);
      }
    } else {
      throw new Error(response.error || '还原失败');
    }
  } catch (error) {
    console.error('还原修改失败:', error);
    toastRef.value?.error('还原修改失败，请重试');
  }
};

// 还原已删除的记录（创建新记录）
const handleRestoreDeletedRecord = async (history: RecordHistory) => {
  // 关闭修改记录弹窗
  closeEditHistoryModal();

  try {
    // 调用 API 创建新记录
    const response = await window.db.restoreDeletedRecord(history);

    if (response.success && response.data) {
      const newRecordId = response.data.id;

      // 重新加载记录
      await loadRecords();
      await loadStatistics();

      // 显示成功提示
      toastRef.value?.success('数据还原成功！', 3000);

      // 跳转到最后一页（新记录在最后）
      const pageResponse = await window.db.getRecordPage(newRecordId, 15);
      
      if (pageResponse.success && pageResponse.data) {
        currentPage.value = pageResponse.data;

        // 等待页面渲染完成后高亮记录
        setTimeout(() => {
          recordListRef.value?.highlightRecord(newRecordId);
        }, 300);
      }
    } else {
      throw new Error(response.error || '还原失败');
    }
  } catch (error) {
    console.error('还原数据失败:', error);
    toastRef.value?.error('还原数据失败，请重试');
  }
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

// 处理导出格式选择
const handleExportFormat = async (format: 'excel' | 'pdf') => {
  if (format === 'excel') {
    await handleExportExcel();
  } else {
    await handleExportPDF();
  }
};

// 导出为 Excel
const handleExportExcel = async () => {
  if (records.value.length === 0) {
    alert('没有可导出的记录');
    return;
  }

  isExporting.value = true;
  try {
    // 使用事务名称和日期作为文件名
    const eventDate = config.value.eventDate || undefined;
    await exportToExcel(records.value, appName.value, eventDate);
    closeExportModal();
    toastRef.value?.success('Excel 导出成功！', 3000);
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    if ((error as Error).message !== '用户取消保存') {
      toastRef.value?.error('导出 Excel 失败，请重试');
    }
  } finally {
    isExporting.value = false;
  }
};

// 导出进度
const exportProgress = ref(0);

// 导出为 PDF（使用 iframe 打印方案，与 Electron 版本一致）
const handleExportPDF = async () => {
  if (records.value.length === 0) {
    alert('没有可导出的记录');
    return;
  }

  isExporting.value = true;
  exportProgress.value = 0;

  try {
    // 模拟进度：准备阶段 0% -> 30%
    exportProgress.value = 10;
    await new Promise(resolve => setTimeout(resolve, 100));

    // 获取当前主题类型（red/gray/golden）
    const themeType = currentTheme.value === 'gray' ? 'gray' : currentTheme.value === 'golden' ? 'red' : 'red';
    exportProgress.value = 30;

    // 获取事务日期
    const eventDate = config.value.eventDate || undefined;

    // 使用 iframe 打印方案导出 PDF
    await exportToPDF(records.value, appName.value, themeType, eventDate);
    exportProgress.value = 100;

    closeExportModal();
    toastRef.value?.success('PDF 导出成功！请使用浏览器打印功能保存为 PDF。', 5000);
  } catch (error) {
    console.error('导出 PDF 失败:', error);
    if ((error as Error).message !== '用户取消保存') {
      toastRef.value?.error('导出 PDF 失败，请重试');
    }
  } finally {
    isExporting.value = false;
    setTimeout(() => { exportProgress.value = 0; }, 500);
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
const performSearch = async (keyword?: string) => {
  const searchTerm = keyword || searchKeyword.value;
  if (!searchTerm.trim()) {
    alert('请输入搜索关键词');
    return;
  }

  isSearching.value = true;
  try {
    const response = await window.db.searchRecords(searchTerm.trim());
    if (response.success && response.data) {
      searchResults.value = response.data.map((record: any) => ({
        id: record.id,
        guestName: record.guestName,
        amount: record.amount,
        amountChinese: record.amountChinese,
        itemDescription: record.itemDescription,
        paymentType: record.paymentType,
        remark: record.remark,
        createTime: record.createTime,
        updateTime: record.updateTime,
        isDeleted: record.isDeleted,
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

// ==================== 同步到小程序功能 ====================

// 处理同步到小程序
const handleSyncToMiniApp = () => {
  syncDialogVisible.value = true;
};

// ==================== 首页处理函数 ====================

// 处理首页创建礼薄
const handleCreateBookFromHome = async (data: { eventName: string; eventDate: string; theme: ThemeType }) => {
  try {
    // 设置主题
    setTheme(data.theme, true);
    // 同步更新 appConfig 中的 theme
    config.value.theme = data.theme;

    // 设置事务名称
    appName.value = data.eventName;
    setEventName(data.eventName);

    // 设置事务日期
    setEventDate(data.eventDate);

    // 新建礼金簿
    await handleCreateNewBook(data.eventName, data.theme, data.eventDate);

    // 隐藏首页，显示主应用
    showSplashScreen.value = false;
    isAppReady.value = true;

    // 加载数据
    await loadRecords();
    await loadStatistics();
  } catch (error) {
    console.error('创建礼薄失败:', error);
    alert('创建礼薄失败，请重试');
  }
};

// 处理首页打开礼薄
const handleOpenBookFromHome = async (path: string) => {
  try {
    console.log('[Theme Debug] 开始打开礼薄:', path);
    
    // 读取礼簿的主题色
    let themeToApply: ThemeType | undefined;
    console.log('[Theme Debug] 调用 getDatabaseTheme...');
    const themeResponse = await window.electronAPI.getDatabaseTheme(path);
    console.log('[Theme Debug] getDatabaseTheme 响应:', themeResponse);
    
    if (themeResponse.success && themeResponse.data) {
      themeToApply = themeResponse.data as ThemeType;
      console.log('[Theme Debug] 读取到主题:', themeToApply);
    } else {
      console.log('[Theme Debug] 未读取到主题或读取失败');
    }

    console.log('[Theme Debug] 调用 handleOpenExistingBook, theme:', themeToApply);
    await handleOpenExistingBook(path, '', themeToApply);
    
    console.log('[Theme Debug] handleOpenExistingBook 完成');

    // 隐藏首页，显示主应用
    showSplashScreen.value = false;
    isAppReady.value = true;

    // 加载数据
    await loadRecords();
    await loadStatistics();
  } catch (error) {
    console.error('打开礼薄失败:', error);
    alert('打开礼薄失败，请重试');
  }
};

// 处理首页编辑礼薄
const handleEditBookFromHome = async (data: { path: string; name: string; eventDate: string; theme: ThemeType }) => {
  try {
    // 更新主题
    await window.electronAPI.updateDatabaseTheme(data.path, data.theme);
    
    // 同步应用主题
    setTheme(data.theme, true);
    config.value.theme = data.theme;
    
    // 更新事件日期
    await window.electronAPI.updateDatabaseEventDate(data.path, data.eventDate);
    
    // 如果名称有变化，重命名数据库文件
    if (data.name) {
      const newFileName = generateFileName(data.name);
      const response = await window.electronAPI.renameDatabase(data.path, newFileName);
      if (response.success && response.data?.newPath) {
        // 更新最近打开列表
        removeFromRecentBooks(data.path);
        addToRecentBooks(data.name, response.data.newPath);
      }
    }
    
    // 重新加载礼薄列表
    await scanDataDirectory();
    
    alert('编辑成功！');
  } catch (error) {
    console.error('编辑礼薄失败:', error);
    alert('编辑礼薄失败，请重试');
  }
};

// 处理首页导入
const handleImportFromHome = () => {
  // TODO: 实现导入功能
  alert('导入功能开发中！');
};

// 处理首页打开文件
const handleOpenFileFromHome = () => {
  // TODO: 实现打开文件功能
  alert('打开文件功能开发中！');
};

// 处理窗口最小化
const handleMinimizeWindow = () => {
  // TODO: 调用 Tauri API 最小化窗口
  console.log('最小化窗口');
};

// 处理窗口关闭
const handleCloseWindow = () => {
  // TODO: 调用 Tauri API 关闭窗口
  console.log('关闭窗口');
};

// ==================== 启动页处理函数（保留用于兼容） ====================



// 新建礼金簿
const handleCreateNewBook = async (eventName: string, theme?: ThemeType, eventDate?: string) => {
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
    const response = await window.electronAPI.createNewDatabase(newFileName, theme, eventName, eventDate);
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
      const errorMsg = '创建新数据库失败: ' + (response.error || '未知错误');
      alert(errorMsg);
      throw new Error(errorMsg); // 抛出错误，让上级处理
    }
  } catch (error) {
    console.error('新建礼金簿失败:', error);
    const errorMsg = '新建礼金簿失败，请重试';
    alert(errorMsg);
    throw new Error(errorMsg); // 抛出错误，让上级处理
  }
};

// 打开已有数据
const handleOpenExistingBook = async (filePath: string, eventName: string, theme?: ThemeType) => {
  try {
    console.log('[Theme Debug] handleOpenExistingBook 被调用, theme:', theme);
    
    // 先保存当前数据（如果有）
    if (records.value.length > 0 && config.value.currentDbPath) {
      const currentFileName = generateFileName(config.value.eventName);
      await window.electronAPI.saveCurrentDatabase(currentFileName);
    }
    
    // 切换到选中的数据库
    const response = await window.electronAPI.switchDatabase(filePath);
    console.log('[Theme Debug] switchDatabase 响应:', response.success);
    
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
      
      // 应用主题（如果有传入的主题参数）
      if (theme) {
        console.log('[Theme Debug] 开始应用主题:', theme);
        setTheme(theme, true);
        // 同步更新 appConfig 中的 theme
        config.value.theme = theme;
        console.log('[Theme Debug] setTheme 调用完成');
      } else {
        console.log('[Theme Debug] 没有传入主题参数，跳过应用');
      }
    } else {
      const errorMsg = '打开数据库失败：' + (response.error || '未知错误');
      alert(errorMsg);
      throw new Error(errorMsg); // 抛出错误，让上级处理
    }
  } catch (error) {
    console.error('打开已有数据失败:', error);
    const errorMsg = '打开已有数据失败，请重试';
    alert(errorMsg);
    throw new Error(errorMsg); // 抛出错误，让上级处理
  }
};



// 处理名称编辑完成
const handleNameEditComplete = async () => {
  isEditingName.value = false;

  const newName = appName.value.trim();
  const oldName = config.value.eventName;

  // 如果名称为空或没有变化，不处理
  if (!newName || newName === oldName) {
    if (!newName) {
      appName.value = oldName || '电子礼金簿';
    }
    return;
  }

  try {
    // 保存到配置
    setEventName(newName);

    // 如果有当前数据库，重命名数据库文件
    if (config.value.currentDbPath) {
      const newFileName = generateFileName(newName);
      const response = await window.electronAPI.renameDatabase(config.value.currentDbPath, newFileName);

      if (response.success && response.data?.newPath) {
        // 获取旧路径
        const oldPath = config.value.currentDbPath;
        // 更新当前数据库路径
        setCurrentDbPath(response.data.newPath);
        // 更新最近打开列表（先移除旧路径，再添加新路径）
        if (oldPath) {
          renameRecentBook(oldPath, newName, response.data.newPath);
        } else {
          addToRecentBooks(newName, response.data.newPath);
        }
      } else {
        console.error('重命名数据库失败:', response.error);
      }
    }
  } catch (error) {
    console.error('修改名称失败:', error);
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

  // 初始化全屏缩放功能
  initFullscreenScale();
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
          <input v-if="isEditingName" v-model="appName" 
                 @blur="handleNameEditComplete" 
                 @keyup.enter="handleNameEditComplete" 
                 class="app-name-input" type="text" />
          <h1 v-else class="app-name" @click="isEditingName = true" title="点击修改">
            {{ appName }}
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
        <button class="func-btn about-btn" @click="showAboutDialog = true">
          <IconSvg name="info" :size="20" />
          <span class="btn-text">关于</span>
        </button>
        <button class="func-btn" @click="handleSyncToMiniApp" title="小程序">
          <IconSvg name="wechat" :size="20" />
          <span class="btn-text">微信小程序</span>
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

    <!-- 关于弹窗 -->
    <AboutDialog v-model="showAboutDialog" />

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
  background: var(--theme-paper);
  overflow: hidden;
  transform: scale(var(--fullscreen-scale));
  transform-origin: top left;
  width: calc(100vw / var(--fullscreen-scale));
  height: calc(100vh / var(--fullscreen-scale));
  min-width: calc(1522px * 0.7);
  min-height: calc(930px * 0.7);
  position: relative;
}

/* 背景纹理层 */
.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(var(--theme-primary-rgb), 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(var(--theme-primary-rgb), 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ==================== 顶部导航栏 ==================== */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--theme-border);
  z-index: 100;
  position: relative;
  overflow: hidden;
}

/* 祥云底纹背景 */
.app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Cg fill='none' stroke='%23C75B39' stroke-width='1'%3E%3Cpath d='M20 40c0-8 6-14 14-14s14 6 14 14c0 6-4 11-10 13v11h-8V53c-6-2-10-7-10-13z'/%3E%3Cpath d='M60 35c0-10 8-18 18-18s18 8 18 18c0 8-5 14-12 17v14h-10V52c-7-3-12-9-12-17z'/%3E%3Cpath d='M120 40c0-8 6-14 14-14s14 6 14 14c0 6-4 11-10 13v11h-8V53c-6-2-10-7-10-13z'/%3E%3Cpath d='M160 38c0-9 7-16 16-16s16 7 16 16c0 7-4 12-10 14v12h-10V52c-6-2-10-7-10-14z'/%3E%3Cpath d='M40 55c0-6 5-11 11-11s11 5 11 11c0 5-3 9-8 10v9h-6v-9c-5-1-8-5-8-10z'/%3E%3Cpath d='M100 58c0-5 4-9 9-9s9 4 9 9c0 4-2 7-6 8v8h-5v-8c-4-1-6-4-6-8z'/%3E%3Cpath d='M180 55c0-6 5-11 11-11s11 5 11 11c0 5-3 9-8 10v9h-6v-9c-5-1-8-5-8-10z'/%3E%3C/g%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-position: center;
  background-size: 300px 60px;
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}

/* 导航栏底部装饰线 */
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--theme-accent), transparent);
  opacity: 0.3;
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
}

.app-logo:hover {
  transform: scale(1.05);
  box-shadow: var(--theme-shadow);
}

.app-name {
  color: var(--theme-text-primary);
  font-size: var(--theme-font-size-xl);
  font-weight: 600;
  font-family: var(--font-name-amount);
  cursor: pointer;
  letter-spacing: 3px;
  transition: color 0.3s ease;
  position: relative;
  padding-left: 16px;
}

.app-name::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: linear-gradient(180deg, var(--theme-accent) 0%, var(--theme-primary) 100%);
  border-radius: 2px;
}

.app-name:hover {
  color: var(--theme-accent);
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
  color: var(--theme-text-secondary);
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
  background: var(--theme-accent);
  border-radius: 0 0 2px 2px;
  transition: width 0.25s ease;
}

.func-btn:hover {
  color: var(--theme-text-primary);
  background: rgba(var(--theme-primary-rgb), 0.04);
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
  background: rgba(107, 93, 77, 0.06);
}

/* 导航栏右侧 - 农历日期 */
.header-right {
  text-align: right;
  position: relative;
  z-index: 1;
}

.lunar-date {
  padding: 8px 16px;
  background: rgba(var(--theme-primary-rgb), 0.04);
  border-radius: var(--theme-border-radius-sm);
  border: 1px solid var(--theme-border);
}

.lunar-primary {
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  color: var(--theme-text-primary);
  font-family: var(--font-name-amount);
  letter-spacing: 1px;
}

.lunar-secondary {
  font-size: 11px;
  color: var(--theme-text-muted);
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
  color: var(--theme-text-primary);
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
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  box-shadow: var(--theme-shadow);
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--theme-border);
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
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  padding: 20px;
  box-shadow: var(--theme-shadow);
  flex: 1;
  border: 1px solid var(--theme-border);
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
