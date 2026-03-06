<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, shallowRef, nextTick } from 'vue';
import RecordForm from './components/RecordForm.vue';
import RecordList from './components/RecordList.vue';
import SplashScreen from './components/SplashScreen.vue';
import type { Record, Statistics, RecordHistory } from './types/database';
import type { ThemeType } from './composables/useTheme';
import { getLunarDisplay } from './utils/lunarCalendar';
import { exportToExcel, exportToPDF } from './utils/export';
import { useTheme } from './composables/useTheme';
import { useAppConfig } from './composables/useAppConfig';
import { useFullscreenScale } from './composables/useFullscreenScale';
import Toast from './components/Toast.vue';
import EditHistoryModal from './components/business/EditHistoryModal.vue';
import AboutDialog from './components/AboutDialog.vue';
import IconSvg from './components/IconSvg.vue';

// ==================== 启动页和配置 ====================
const { setTheme, applyThemeToDocument, currentTheme } = useTheme();
const { config, setEventName, setCurrentDbPath, generateFileName, addToRecentBooks, removeFromRecentBooks, initConfig } = useAppConfig();
const { initFullscreenScale, destroyFullscreenScale } = useFullscreenScale();

// Toast 组件引用
const toastRef = ref<InstanceType<typeof Toast> | null>(null);

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
const hideAmount = ref(true);
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

// 导出弹窗状态
const showExportModal = ref(false);
const isExporting = ref(false);

// 关于弹窗状态
const showAboutDialog = ref(false);

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
 * 只添加新记录到数组末尾，保持当前页码和显示位置
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
  console.log('[App] handleInputPreview:', field, value);
  currentPreview.value = { field, value };
};

// 清空预览
const clearPreview = () => {
  console.log('[App] clearPreview');
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
  console.log('App.vue handleDelete 被调用, id:', id);
  try {
    console.log('开始执行 softDeleteRecord');
    const response = await window.db.softDeleteRecord(id);
    console.log('softDeleteRecord 返回:', response);
    if (response.success) {
      console.log('softDeleteRecord 成功，开始 deleteRecordIncrementally');
      await deleteRecordIncrementally(id);
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
  console.log('[App.vue] handleRestoreDeletedRecord 被调用，接收到的历史记录:', history);
  
  // 关闭修改记录弹窗
  console.log('[App.vue] 关闭修改记录弹窗');
  closeEditHistoryModal();

  try {
    console.log('[App.vue] 开始调用 restoreDeletedRecord API');
    // 调用 API 创建新记录
    const response = await window.db.restoreDeletedRecord(history);
    console.log('[App.vue] API 返回结果:', response);
    
    if (response.success && response.data) {
      const newRecordId = response.data.id;
      console.log('[App.vue] 新记录 ID:', newRecordId);

      // 重新加载记录
      console.log('[App.vue] 重新加载记录和统计数据');
      await loadRecords();
      await loadStatistics();

      // 显示成功提示
      console.log('[App.vue] 显示成功提示');
      toastRef.value?.success('数据还原成功！', 3000);

      // 跳转到最后一页（新记录在最后）
      console.log('[App.vue] 获取新记录所在页码');
      const pageResponse = await window.db.getRecordPage(newRecordId, 15);
      console.log('[App.vue] 页码查询结果:', pageResponse);
      
      if (pageResponse.success && pageResponse.data) {
        currentPage.value = pageResponse.data;
        console.log('[App.vue] 跳转到页码:', pageResponse.data);

        // 等待页面渲染完成后高亮记录
        setTimeout(() => {
          console.log('[App.vue] 高亮新记录:', newRecordId);
          recordListRef.value?.highlightRecord(newRecordId);
        }, 300);
      }
    } else {
      throw new Error(response.error || '还原失败');
    }
  } catch (error) {
    console.error('[App.vue] 还原数据失败:', error);
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

// 导出为 Excel
const handleExportExcel = async () => {
  if (records.value.length === 0) {
    alert('没有可导出的记录');
    return;
  }

  isExporting.value = true;
  try {
    // 使用事务名称作为文件名
    await exportToExcel(records.value, appName.value);
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
  
  try {
    // 获取当前主题类型（wedding/funeral）
    const themeType = currentTheme.value === 'funeral' ? 'gray' : 'red';
    
    // 使用 iframe 打印方案导出 PDF
    await exportToPDF(records.value, appName.value, themeType);
    
    closeExportModal();
    toastRef.value?.success('PDF 导出成功！请使用浏览器打印功能保存为 PDF。', 5000);
  } catch (error) {
    console.error('导出 PDF 失败:', error);
    if ((error as Error).message !== '用户取消保存') {
      toastRef.value?.error('导出 PDF 失败，请重试');
    }
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
  try {
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
    } else {
      // 不支持的操作
      console.error('不支持的操作:', data.action);
      alert('不支持的操作');
      return;
    }
    
    // 隐藏启动页，显示主应用
    showSplashScreen.value = false;
    isAppReady.value = true;
    
    // 加载数据
    await loadRecords();
    await loadStatistics();
  } catch (error) {
    console.error('启动失败:', error);
    alert('启动失败，请重试');
    // 即使出错也要隐藏启动页
    showSplashScreen.value = false;
    isAppReady.value = true;
  }
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
        guestName: record.guestName,
        amount: record.amount,
        amountChinese: record.amountChinese || null,
        itemDescription: record.itemDescription || null,
        paymentType: record.paymentType,
        remark: record.remark || null,
        createTime: record.createTime || new Date().toISOString(),
        isDeleted: 0
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
        <button class="func-btn" @click="handleBackToSplash">
          <IconSvg name="home" :size="20" />
          <span class="btn-text">返回首页</span>
        </button>
        <button class="func-btn about-btn" @click="showAboutDialog = true">
          <IconSvg name="info" :size="20" />
          <span class="btn-text">关于</span>
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
        <span class="preview-name">{{ previewText }}</span>
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
    <EditHistoryModal
      v-if="showEditHistoryModal"
      :edit-history-list="editHistoryList"
      @close="closeEditHistoryModal"
      @locate="handleLocateRecord"
      @revert="handleRevertRecord"
      @restore-deleted="handleRestoreDeletedRecord"
    />

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
              <IconSvg name="table" :size="32" />
              <span class="export-label">导出为 Excel</span>
              <span class="export-desc">表格格式，适合数据分析</span>
            </button>
            <button
              class="export-option-btn"
              @click="handleExportPDF"
              :disabled="isExporting || records.length === 0"
            >
              <IconSvg name="file-text" :size="32" />
              <span class="export-label">导出为 PDF</span>
              <span class="export-desc">礼金簿样式，适合打印存档</span>
            </button>
          </div>
          <div v-if="isExporting" class="export-loading">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: exportProgress + '%' }"></div>
            </div>
            <span class="loading-text">正在生成 PDF... {{ exportProgress }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 关于弹窗 -->
    <AboutDialog v-model="showAboutDialog" />
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
  最外层容器
  ========================================
  - height: 100vh 占满整个视口高度
  - display: flex + flex-direction: column 垂直排列
  - background: 使用主题主色
  - 缩放逻辑：以左上角为原点缩放，保持原始比例
  - 缩放后容器尺寸需要反向计算，确保内容完整显示
*/
.app-container {
  display: flex;
  flex-direction: column;
  background: var(--theme-primary);
  overflow: hidden;
  transform: scale(var(--fullscreen-scale));
  transform-origin: top left;
  width: calc(100vw / var(--fullscreen-scale));
  height: calc(100vh / var(--fullscreen-scale));
  min-width: calc(1522px * 0.7);
  min-height: calc(930px * 0.7);
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
  background: var(--theme-paper);
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
  姓名预览区域
  ========================================
  - 高度：80px
  - 背景：使用 SVG 背景图片
  - 宽度：600px
  - 文字：横排显示，大号字体
  - 位置：工具栏和主内容区之间，居中显示
  - 上下边距：16px
*/
.name-preview-section {
  height: 80px;
  width: 600px;
  margin: 16px auto -18px;
  background: url('/Name preview.svg') no-repeat center center;
  background-size: 100% 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  box-sizing: border-box;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  height: 100%;
}

.preview-name {
  font-size: 48px;
  color: #000;
  font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  display: flex;
  align-items: center;
  margin-top: -14px;
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
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--theme-spacing-lg);
  padding: var(--theme-spacing-lg);
  overflow: hidden;
  min-width: calc(1522px * 0.7);
}

/* 【左侧】礼金簿展示区 */
.giftbook-section {
  width: 1290px;
  flex-shrink: 0;
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
  flex: 1;                  /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
  justify-content: center;  /* 垂直居中 */
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
  padding: 40px;
  color: #666;
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(235, 86, 74, 0.1);
}

.history-name {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.history-time {
  font-size: 12px;
  color: #666;
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
  color: #666;
  flex-shrink: 0;
}

.change-value {
  color: #333;
  word-break: break-all;
}

.change-value.new-value {
  color: #EB564A;
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--theme-spacing-sm);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-accent));
  border-radius: 4px;
  transition: width 0.3s ease;
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
